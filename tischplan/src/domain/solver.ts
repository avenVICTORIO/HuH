import type {
  AppState,
  AssignmentMode,
  PlacementChoice,
  PlanAssignment,
  PlanResult,
  Reservation,
  TableOption,
  ValidationIssue,
} from './model';
import { buildTableOptions } from './tableCatalog';
import {
  MINUTE_MS,
  reservationCleaningEnd,
  reservationResetEnd,
  reservationStart,
} from './time';

interface Placement {
  reservation: Reservation;
  option: TableOption;
  mode: AssignmentMode;
}

interface Candidate {
  option: TableOption | null;
  mode: AssignmentMode;
  cost: number;
}

export function sameTableIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((tableId, index) => tableId === sortedRight[index]);
}

function intersects(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((tableId) => rightSet.has(tableId));
}

export function optionForReservation(
  reservation: Reservation,
  options: TableOption[],
): TableOption | null {
  const assignment = reservation.assignment;
  if (!assignment) {
    return null;
  }
  return options.find((option) => option.id === assignment.optionId)
    ?? options.find((option) => sameTableIds(option.tableIds, assignment.tableIds))
    ?? null;
}

function currentAssignmentMatches(
  reservation: Reservation,
  option: TableOption,
  mode: AssignmentMode,
): boolean {
  const assignment = reservation.assignment;
  return Boolean(
    assignment
    && sameTableIds(assignment.tableIds, option.tableIds)
    && assignment.mode === mode,
  );
}

export function serviceDayAllowsOption(
  state: AppState,
  serviceDate: string,
  option: TableOption,
): boolean {
  if (option.region === 'inside') {
    return true;
  }
  const serviceDay = state.serviceDays[serviceDate];
  return Boolean(serviceDay && serviceDay.weather === 'dry' && serviceDay.outsideOpen);
}

export function reservationAllowsOption(
  reservation: Reservation,
  option: TableOption,
): boolean {
  return reservation.preference === 'none' || reservation.preference === option.region;
}

function reservationCanShare(reservation: Reservation, state: AppState): boolean {
  if (reservation.source === 'walk-in') {
    return state.settings.autoShareWalkIns || reservation.allowTableSharing;
  }
  return reservation.allowTableSharing;
}

function isSharedSamePhysicalTable(left: Placement, right: Placement): boolean {
  return left.mode === 'shared'
    && right.mode === 'shared'
    && left.option.kind === 'single'
    && right.option.kind === 'single'
    && left.option.tableIds[0] === right.option.tableIds[0];
}

export function pairIsCompatible(left: Placement, right: Placement, state: AppState): boolean {
  if (!intersects(left.option.tableIds, right.option.tableIds)) {
    return true;
  }

  if (isSharedSamePhysicalTable(left, right)) {
    return true;
  }

  const leftStart = reservationStart(left.reservation);
  const rightStart = reservationStart(right.reservation);
  const [previous, next] = leftStart <= rightStart ? [left, right] : [right, left];

  if (sameTableIds(previous.option.tableIds, next.option.tableIds)) {
    return reservationCleaningEnd(previous.reservation, state.settings)
      <= reservationStart(next.reservation);
  }

  const previousResetEnd = reservationResetEnd(
    previous.reservation,
    previous.option.connectionCount,
    state.settings,
  );
  const nextJoinDuration = next.option.connectionCount
    * state.settings.joinMinutesPerConnection
    * MINUTE_MS;

  return previousResetEnd + nextJoinDuration <= reservationStart(next.reservation);
}

interface CapacityEvent {
  at: number;
  delta: number;
}

function sharedCapacityIsValid(placements: Placement[], state: AppState): boolean {
  const sharedSingles = placements.filter((placement) => (
    placement.mode === 'shared' && placement.option.kind === 'single'
  ));
  const tableIds = new Set(sharedSingles.map((placement) => placement.option.tableIds[0]));

  for (const tableId of tableIds) {
    const relevant = sharedSingles.filter((placement) => placement.option.tableIds[0] === tableId);
    const capacity = relevant[0]?.option.capacity ?? 0;
    const events: CapacityEvent[] = [];

    for (const placement of relevant) {
      events.push({ at: reservationStart(placement.reservation), delta: placement.reservation.partySize });
      events.push({
        at: reservationCleaningEnd(placement.reservation, state.settings),
        delta: -placement.reservation.partySize,
      });
    }

    // Releases are processed before arrivals at the same timestamp.
    events.sort((left, right) => left.at - right.at || left.delta - right.delta);
    let used = 0;
    for (const event of events) {
      used += event.delta;
      if (used > capacity) {
        return false;
      }
    }
  }

  return true;
}

function sharedSeventeensAreValid(placements: Placement[], state: AppState): boolean {
  const relevant = placements.filter((placement) => (
    placement.option.kind === 'single'
    && (placement.option.tableIds[0] === '17' || placement.option.tableIds[0] === '17A')
  ));
  const events: { at: number; tableId: '17' | '17A'; delta: number }[] = [];

  for (const placement of relevant) {
    const tableId = placement.option.tableIds[0] as '17' | '17A';
    events.push({ at: reservationStart(placement.reservation), tableId, delta: placement.reservation.partySize });
    events.push({
      at: reservationCleaningEnd(placement.reservation, state.settings),
      tableId,
      delta: -placement.reservation.partySize,
    });
  }

  events.sort((left, right) => left.at - right.at || left.delta - right.delta);
  const used: Record<'17' | '17A', number> = { '17': 0, '17A': 0 };
  for (const event of events) {
    used[event.tableId] += event.delta;
    const sharedSeatDemand = Math.max(0, used['17'] - 3) + Math.max(0, used['17A'] - 3);
    if (sharedSeatDemand > 1) {
      return false;
    }
  }
  return true;
}

function placementsAreCompatible(candidate: Placement, existing: Placement[], state: AppState): boolean {
  for (const placed of existing) {
    if (!pairIsCompatible(candidate, placed, state)) {
      return false;
    }
  }
  const combined = [...existing, candidate];
  return sharedCapacityIsValid(combined, state) && sharedSeventeensAreValid(combined, state);
}

export function reservationIsFixedForPlanning(reservation: Reservation, state: AppState, now: number): boolean {
  if (!reservation.assignment) {
    return false;
  }
  if (reservation.status === 'seated' || reservation.status === 'cleaning') {
    return true;
  }
  if (reservation.assignment.locked) {
    return true;
  }
  const minutesUntilArrival = (reservationStart(reservation) - now) / MINUTE_MS;
  return minutesUntilArrival >= 0 && minutesUntilArrival <= state.settings.freezeWindowMinutes;
}

function candidateCost(
  reservation: Reservation,
  option: TableOption,
  mode: AssignmentMode,
  optionIndex: number,
): number {
  const wastedSeats = option.capacity - reservation.partySize;
  const seatWasteCost = mode === 'shared' ? 0 : wastedSeats * 12;
  const mergeCost = option.connectionCount * 180;
  const sharedCost = mode === 'shared'
    ? (reservation.source === 'walk-in' ? 0 : 250)
    : 0;
  const changeCost = reservation.assignment
    && !currentAssignmentMatches(reservation, option, mode)
    ? 3_000
    : 0;
  const preserveBonus = currentAssignmentMatches(reservation, option, mode) ? -400 : 0;

  return seatWasteCost
    + mergeCost
    + sharedCost
    + changeCost
    + preserveBonus
    + optionIndex / 10_000;
}

function joinedOptionCanBeReady(
  reservation: Reservation,
  option: TableOption,
  state: AppState,
  now: number,
): boolean {
  if (option.kind === 'single') {
    return true;
  }
  const currentlyPrepared = Boolean(
    reservation.assignment?.preparedAt !== undefined
    && sameTableIds(reservation.assignment.tableIds, option.tableIds),
  );
  if (currentlyPrepared) {
    return true;
  }
  // Walk-in guests are physically present and willing to wait while the tables
  // are joined, so the setup needs no lead time before their (immediate) start.
  // Physical occupancy, cleaning, and rebuild conflicts stay checked elsewhere.
  if (reservation.source === 'walk-in') {
    return true;
  }
  const setupDuration = option.connectionCount * state.settings.joinMinutesPerConnection * MINUTE_MS;
  return now + setupDuration <= reservationStart(reservation);
}

function buildCandidates(
  reservation: Reservation,
  options: TableOption[],
  state: AppState,
  now: number,
): Candidate[] {
  const canShare = reservationCanShare(reservation, state);
  const candidates: Candidate[] = [];

  options.forEach((option, index) => {
    if (option.capacity < reservation.partySize) {
      return;
    }
    if (!reservationAllowsOption(reservation, option)) {
      return;
    }
    if (!serviceDayAllowsOption(state, reservation.serviceDate, option)) {
      return;
    }
    if (!joinedOptionCanBeReady(reservation, option, state, now)) {
      return;
    }

    if (option.kind === 'single' && canShare) {
      candidates.push({
        option,
        mode: 'shared',
        cost: candidateCost(reservation, option, 'shared', index),
      });
    }

    candidates.push({
      option,
      mode: 'exclusive',
      cost: candidateCost(reservation, option, 'exclusive', index) + (canShare ? 35 : 0),
    });
  });

  candidates.sort((left, right) => left.cost - right.cost);
  const existingCandidate = candidates.find((candidate) => (
    candidate.option && currentAssignmentMatches(reservation, candidate.option, candidate.mode)
  ));
  const limited = candidates.slice(0, 20);
  if (existingCandidate && !limited.includes(existingCandidate)) {
    limited.push(existingCandidate);
  }
  limited.push({
    option: null,
    mode: 'exclusive',
    cost: 1_000_000 + reservation.partySize * 10_000,
  });
  return limited;
}


function sharedTableOpeningCost(
  candidate: Candidate,
  existing: Placement[],
): number {
  if (!candidate.option || candidate.mode !== 'shared' || candidate.option.kind !== 'single') {
    return 0;
  }

  const tableId = candidate.option.tableIds[0];
  const tableAlreadyUsedForSharing = existing.some((placement) => (
    placement.mode === 'shared'
    && placement.option.kind === 'single'
    && placement.option.tableIds[0] === tableId
  ));

  if (tableAlreadyUsedForSharing) {
    return 0;
  }

  // Charge seat footprint once per shared physical table, not once per party.
  // This packs consenting walk-ins onto one fitting table before opening another.
  return 120 + candidate.option.capacity * 12;
}

function activePlacements(
  state: AppState,
  serviceDate: string,
  options: TableOption[],
  excludedReservationId?: string,
): Placement[] {
  const result: Placement[] = [];
  for (const reservation of state.reservations) {
    if (
      reservation.id === excludedReservationId
      || reservation.serviceDate !== serviceDate
      || ['done', 'no-show', 'cancelled'].includes(reservation.status)
      || !reservation.assignment
    ) {
      continue;
    }
    const option = optionForReservation(reservation, options);
    if (option) {
      result.push({ reservation, option, mode: reservation.assignment.mode });
    }
  }
  return result;
}

export interface PlacementCheckOptions {
  allowPreferenceOverride?: boolean;
  allowSharingOverride?: boolean;
  /** Walk-in only: join a single table that a party currently occupies exclusively (staff asks the seated guests first). */
  allowSeatedSharingOverride?: boolean;
}

export const MINIMUM_WALK_IN_GAP_MINUTES = 45;

/**
 * Walk-ins leave when they leave: if a single table is free now but has a later
 * reservation, a shortened stay that still fits (incl. cleaning and any join
 * lead of the following booking) is a legitimate manual option. Returns the
 * largest 5-minute-rounded duration that fits, or null when no shortened stay
 * of at least MINIMUM_WALK_IN_GAP_MINUTES is possible or shortening is unnecessary.
 */
export function walkInGapDurationMinutes(
  state: AppState,
  reservation: Reservation,
  option: TableOption,
  now = Date.now(),
): number | null {
  if (reservation.source !== 'walk-in' || option.kind !== 'single') {
    return null;
  }
  const existing = activePlacements(state, reservation.serviceDate, buildTableOptions(true), reservation.id);
  const start = reservationStart(reservation);
  const cleaningDuration = state.settings.cleaningMinutes * MINUTE_MS;
  let latestOccupancyEnd = Infinity;
  for (const placed of existing) {
    if (!intersects(option.tableIds, placed.option.tableIds)) {
      continue;
    }
    const placedStart = reservationStart(placed.reservation);
    if (placedStart <= start) {
      return null;
    }
    const joinLead = sameTableIds(option.tableIds, placed.option.tableIds)
      ? 0
      : placed.option.connectionCount * state.settings.joinMinutesPerConnection * MINUTE_MS;
    latestOccupancyEnd = Math.min(latestOccupancyEnd, placedStart - joinLead - cleaningDuration);
  }
  if (!Number.isFinite(latestOccupancyEnd)) {
    return null;
  }
  const minutes = Math.floor((latestOccupancyEnd - start) / MINUTE_MS / 5) * 5;
  if (minutes < MINIMUM_WALK_IN_GAP_MINUTES || minutes >= reservation.durationMinutes) {
    return null;
  }
  const probe: Reservation = { ...reservation, durationMinutes: minutes };
  const remaining = placementAvailabilityReason(state, probe, option, 'exclusive', now, {
    allowPreferenceOverride: true,
    allowSharingOverride: true,
  });
  return remaining === null ? minutes : null;
}

export function placementAvailabilityReason(
  state: AppState,
  reservation: Reservation,
  option: TableOption,
  mode: AssignmentMode,
  now = Date.now(),
  overrides: PlacementCheckOptions = {},
): string | null {
  if (option.capacity < reservation.partySize) {
    return `Nur ${option.capacity} Plätze verfügbar.`;
  }
  if (!serviceDayAllowsOption(state, reservation.serviceDate, option)) {
    return 'Der Außenbereich ist wegen Wetter oder Betriebslage geschlossen.';
  }
  if (!reservationAllowsOption(reservation, option) && !overrides.allowPreferenceOverride) {
    return 'Widerspricht dem Sitzbereich-Wunsch.';
  }
  if (mode === 'shared' && option.kind !== 'single') {
    return 'Geteilte Belegung ist nur an einem einzelnen physischen Tisch möglich.';
  }
  if (mode === 'shared' && !reservationCanShare(reservation, state) && !overrides.allowSharingOverride) {
    return 'Der Gast hat einer Tischteilung nicht zugestimmt.';
  }
  if (!joinedOptionCanBeReady(reservation, option, state, now)) {
    return 'Die Tische können vor Ankunft nicht mehr rechtzeitig zusammengestellt werden.';
  }

  const existing = activePlacements(state, reservation.serviceDate, buildTableOptions(true), reservation.id);
  // With the seated-sharing override a walk-in may join a single table that a
  // party occupies exclusively: for the check that occupant counts as sharing,
  // so head count vs. capacity decides instead of the whole-table exclusivity.
  const existingForCheck = overrides.allowSeatedSharingOverride
    && mode === 'shared'
    && option.kind === 'single'
    && reservation.source === 'walk-in'
    ? existing.map((placed) => (
      placed.mode === 'exclusive'
      && placed.option.kind === 'single'
      && sameTableIds(placed.option.tableIds, option.tableIds)
        ? { ...placed, mode: 'shared' as AssignmentMode }
        : placed
    ))
    : existing;
  const candidate: Placement = { reservation, option, mode };
  if (!placementsAreCompatible(candidate, existingForCheck, state)) {
    return mode === 'shared'
      ? 'Nicht genügend freie Plätze inklusive Reinigungszeit.'
      : 'Zeitliche Belegung, Reinigung oder Tischumbau kollidiert.';
  }
  return null;
}

export function placementChoicesForTable(
  state: AppState,
  reservation: Reservation,
  tableId: string,
  now = Date.now(),
): PlacementChoice[] {
  const options = buildTableOptions(state.settings.useBarSeatsForSingles)
    .filter((option) => option.tableIds.includes(tableId))
    .sort((left, right) => left.capacity - right.capacity || left.connectionCount - right.connectionCount);
  const choices: PlacementChoice[] = [];

  for (const option of options) {
    const modes: AssignmentMode[] = option.kind === 'single' ? ['exclusive', 'shared'] : ['exclusive'];
    for (const mode of modes) {
      const preferenceOverrideRequired = !reservationAllowsOption(reservation, option);
      const sharingOverrideRequired = mode === 'shared' && !reservationCanShare(reservation, state);
      const reason = placementAvailabilityReason(state, reservation, option, mode, now);
      const overrideReason = placementAvailabilityReason(state, reservation, option, mode, now, {
        allowPreferenceOverride: true,
        allowSharingOverride: true,
      });
      const seatedSharingOverrideRequired = overrideReason !== null
        && mode === 'shared'
        && reservation.source === 'walk-in'
        && placementAvailabilityReason(state, reservation, option, mode, now, {
          allowPreferenceOverride: true,
          allowSharingOverride: true,
          allowSeatedSharingOverride: true,
        }) === null;
      const shortenedDurationMinutes = overrideReason !== null && mode === 'exclusive'
        ? walkInGapDurationMinutes(state, reservation, option, now) ?? undefined
        : undefined;
      const available = reason === null
        || overrideReason === null
        || seatedSharingOverrideRequired
        || shortenedDurationMinutes !== undefined;
      choices.push({
        option,
        mode,
        available,
        reason: available ? undefined : reason ?? undefined,
        preferenceOverrideRequired,
        sharingOverrideRequired,
        seatedSharingOverrideRequired,
        shortenedDurationMinutes,
      });
    }
  }
  return choices;
}

export function solveAssignments(
  state: AppState,
  serviceDate: string,
  now = Date.now(),
): PlanResult {
  const options = buildTableOptions(state.settings.useBarSeatsForSingles);
  const active = state.reservations.filter((reservation) => (
    reservation.serviceDate === serviceDate
    && !['done', 'no-show', 'cancelled'].includes(reservation.status)
  ));
  const fixedPlacements: Placement[] = [];
  const fixedReservationIds: string[] = [];
  const variable: Reservation[] = [];
  const warnings: string[] = [];

  for (const reservation of active) {
    if (reservationIsFixedForPlanning(reservation, state, now)) {
      const option = optionForReservation(reservation, options);
      if (!option || !reservation.assignment) {
        warnings.push(`${reservation.name} ist fixiert, hat aber keine gültige Tischoption.`);
        continue;
      }
      fixedPlacements.push({ reservation, option, mode: reservation.assignment.mode });
      fixedReservationIds.push(reservation.id);
    } else if (reservation.status === 'unassigned' || reservation.status === 'assigned') {
      variable.push(reservation);
    }
  }

  for (let left = 0; left < fixedPlacements.length; left += 1) {
    for (let right = left + 1; right < fixedPlacements.length; right += 1) {
      if (!pairIsCompatible(fixedPlacements[left], fixedPlacements[right], state)) {
        warnings.push(
          `Fixierte Platzierungen von ${fixedPlacements[left].reservation.name} und ${fixedPlacements[right].reservation.name} kollidieren.`,
        );
      }
    }
  }
  if (!sharedCapacityIsValid(fixedPlacements, state) || !sharedSeventeensAreValid(fixedPlacements, state)) {
    warnings.push('Fixierte geteilte Tischbelegungen überschreiten die physische Kapazität.');
  }

  const choices = new Map<string, Candidate[]>();
  for (const reservation of variable) {
    choices.set(reservation.id, buildCandidates(reservation, options, state, now));
  }

  variable.sort((left, right) => {
    const leftCount = choices.get(left.id)?.length ?? 0;
    const rightCount = choices.get(right.id)?.length ?? 0;
    if (leftCount !== rightCount) {
      return leftCount - rightCount;
    }
    if (left.partySize !== right.partySize) {
      return right.partySize - left.partySize;
    }
    return reservationStart(left) - reservationStart(right);
  });

  const greedyPlacements = [...fixedPlacements];
  const greedyAssignments = new Map<string, Candidate>();
  let greedyCost = 0;
  for (const reservation of variable) {
    const reservationChoices = choices.get(reservation.id) ?? [];
    const selected = reservationChoices.find((candidate) => (
      !candidate.option
      || placementsAreCompatible(
        { reservation, option: candidate.option, mode: candidate.mode },
        greedyPlacements,
        state,
      )
    )) ?? reservationChoices[reservationChoices.length - 1];
    greedyAssignments.set(reservation.id, selected);
    greedyCost += selected.cost + sharedTableOpeningCost(selected, greedyPlacements);
    if (selected.option) {
      greedyPlacements.push({ reservation, option: selected.option, mode: selected.mode });
    }
  }

  let bestCost = greedyCost;
  let bestAssignments = new Map(greedyAssignments);
  let timedOut = false;
  const startedAt = performance.now();
  const currentPlacements = [...fixedPlacements];
  const currentAssignments = new Map<string, Candidate>();
  const minimumRemaining = new Array(variable.length + 1).fill(0);

  for (let index = variable.length - 1; index >= 0; index -= 1) {
    const reservationChoices = choices.get(variable[index].id) ?? [];
    minimumRemaining[index] = minimumRemaining[index + 1]
      + Math.min(...reservationChoices.map((candidate) => candidate.cost));
  }

  function search(index: number, cost: number): void {
    if (performance.now() - startedAt >= state.settings.solverRuntimeMilliseconds) {
      timedOut = true;
      return;
    }
    if (cost + minimumRemaining[index] >= bestCost) {
      return;
    }
    if (index >= variable.length) {
      bestCost = cost;
      bestAssignments = new Map(currentAssignments);
      return;
    }

    const reservation = variable[index];
    for (const candidate of choices.get(reservation.id) ?? []) {
      const openingCost = sharedTableOpeningCost(candidate, currentPlacements);
      if (candidate.option) {
        const placement: Placement = { reservation, option: candidate.option, mode: candidate.mode };
        if (!placementsAreCompatible(placement, currentPlacements, state)) {
          continue;
        }
        currentPlacements.push(placement);
      }

      const incrementalCost = candidate.cost + openingCost;
      currentAssignments.set(reservation.id, candidate);
      search(index + 1, cost + incrementalCost);
      currentAssignments.delete(reservation.id);
      if (candidate.option) {
        currentPlacements.pop();
      }
      if (timedOut && performance.now() - startedAt >= state.settings.solverRuntimeMilliseconds) {
        return;
      }
    }
  }

  search(0, 0);

  const assignments: PlanAssignment[] = variable.map((reservation) => {
    const candidate = bestAssignments.get(reservation.id) ?? {
      option: null,
      mode: 'exclusive' as const,
      cost: 1_000_000,
    };
    return {
      reservationId: reservation.id,
      option: candidate.option,
      mode: candidate.mode,
      cost: candidate.cost,
    };
  });

  const assignedCount = assignments.filter((assignment) => assignment.option).length;
  const unassignedCount = assignments.length - assignedCount;
  const changedCount = assignments.filter((assignment) => {
    const reservation = variable.find((candidate) => candidate.id === assignment.reservationId)!;
    if (!assignment.option) {
      return Boolean(reservation.assignment);
    }
    return !currentAssignmentMatches(reservation, assignment.option, assignment.mode);
  }).length;

  return {
    assignments,
    fixedReservationIds,
    score: bestCost,
    assignedCount,
    unassignedCount,
    changedCount,
    timedOut,
    warnings,
  };
}

export function validatePlan(
  state: AppState,
  serviceDate: string,
  plan?: PlanResult,
): ValidationIssue[] {
  const options = buildTableOptions(state.settings.useBarSeatsForSingles);
  const placements: Placement[] = [];
  const issues: ValidationIssue[] = [];
  const planMap = new Map(plan?.assignments.map((assignment) => [assignment.reservationId, assignment]));

  for (const reservation of state.reservations) {
    if (reservation.serviceDate !== serviceDate || ['done', 'no-show', 'cancelled'].includes(reservation.status)) {
      continue;
    }
    const planned = planMap.get(reservation.id);
    const option = planned?.option ?? optionForReservation(reservation, options);
    const mode = planned?.mode ?? reservation.assignment?.mode;
    if (!option || !mode) {
      continue;
    }

    if (option.capacity < reservation.partySize) {
      issues.push({
        code: 'capacity',
        message: `${reservation.name} überschreitet die Kapazität von ${option.id}.`,
        reservationIds: [reservation.id],
        tableIds: option.tableIds,
      });
    }
    if (!reservationAllowsOption(reservation, option) && !reservation.assignment?.overrideReason) {
      issues.push({
        code: 'preference',
        message: `${reservation.name} ist entgegen dem Sitzbereich-Wunsch platziert.`,
        reservationIds: [reservation.id],
        tableIds: option.tableIds,
      });
    }
    if (!serviceDayAllowsOption(state, serviceDate, option)) {
      issues.push({
        code: 'outside-closed',
        message: `${reservation.name} ist im geschlossenen Außenbereich platziert.`,
        reservationIds: [reservation.id],
        tableIds: option.tableIds,
      });
    }
    placements.push({ reservation, option, mode });
  }

  for (let left = 0; left < placements.length; left += 1) {
    for (let right = left + 1; right < placements.length; right += 1) {
      if (!pairIsCompatible(placements[left], placements[right], state)) {
        issues.push({
          code: 'transition',
          message: `${placements[left].reservation.name} kollidiert mit ${placements[right].reservation.name}.`,
          reservationIds: [placements[left].reservation.id, placements[right].reservation.id],
          tableIds: [...new Set([
            ...placements[left].option.tableIds,
            ...placements[right].option.tableIds,
          ])],
        });
      }
    }
  }

  if (!sharedCapacityIsValid(placements, state)) {
    issues.push({
      code: 'shared-capacity',
      message: 'Die Kapazität eines geteilten Tisches wird während Belegung oder Reinigung überschritten.',
      reservationIds: placements.map((placement) => placement.reservation.id),
      tableIds: [],
    });
  }
  if (!sharedSeventeensAreValid(placements, state)) {
    issues.push({
      code: 'shared-middle-seat',
      message: 'Tisch 17 und 17A benötigen gleichzeitig den gemeinsamen Zusatzplatz.',
      reservationIds: placements.map((placement) => placement.reservation.id),
      tableIds: ['17', '17A'],
    });
  }
  return issues;
}
