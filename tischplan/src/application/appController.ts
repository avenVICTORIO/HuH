import { writable, type Readable } from 'svelte/store';
import type {
  AppSettings,
  AppState,
  AssignmentMode,
  AssignmentSource,
  OperationalTask,
  PlacementChoice,
  PlanResult,
  Region,
  Reservation,
  ReservationDraft,
  ReservationStatus,
  SeatingPreference,
  WeatherLocation,
  WeatherKind,
} from '../domain/model';
import { parseBackup, serializeBackup } from '../domain/backup';
import {
  cloneSettings,
  durationForPartySize,
  isWithinOpeningHours,
  openingHoursValidationError,
  sanitizeSettings,
} from '../domain/settings';
import { parseWixExport } from './wixImport';
import {
  placementAvailabilityReason,
  placementChoicesForTable,
  reservationIsFixedForPlanning,
  sameTableIds,
  solveAssignments,
  validatePlan,
  walkInGapDurationMinutes,
} from '../domain/solver';
import { cloneState, createInitialState, ensureServiceDay } from '../domain/state';
import { buildTableOptions, formatTableList } from '../domain/tableCatalog';
import { dateToServiceDate, reservationStart } from '../domain/time';
import { assertValidAppState } from '../domain/validation';
import type { Clock } from '../infrastructure/clock';
import type { NotificationGateway } from '../infrastructure/notifications';
import type { StateRepository } from '../infrastructure/localStorageRepository';
import { createReservation } from './reservationFactory';
import { generateOperationalTasks, tasksReadyForNotification } from './tasks';
import { buildDemoMonth } from './demoMonth';

export interface ReservationUpdate {
  serviceDate?: string;
  startTime?: string;
  durationMinutes?: number;
  partySize?: number;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  preference?: SeatingPreference;
  allowTableSharing?: boolean;
}

export interface ManualAssignmentOptions {
  mode: AssignmentMode;
  source?: AssignmentSource;
  lock?: boolean;
  overrideReason?: string;
  shortenedDurationMinutes?: number;
}

export class AppController {
  private value: AppState;
  private readonly stateWritable;
  private readonly nowWritable;
  private idCounter = 1;
  readonly state: Readable<AppState>;
  readonly now: Readable<number>;
  readonly startupError?: string;

  constructor(
    private readonly repository: StateRepository,
    private readonly clock: Clock,
    private readonly notificationGateway: NotificationGateway,
  ) {
    let initial: AppState;
    let startupError: string | undefined;
    try {
      initial = repository.load() ?? createInitialState(clock.now());
    } catch (error) {
      startupError = `Gespeicherte Daten konnten nicht geladen werden: ${String(error)}`;
      initial = createInitialState(clock.now());
    }
    ensureServiceDay(initial, initial.ui.selectedServiceDate);
    assertValidAppState(initial);
    this.value = initial;
    this.idCounter = Math.max(1, initial.revision + initial.reservations.length + 1);
    this.stateWritable = writable<AppState>(cloneState(initial));
    this.nowWritable = writable<number>(clock.now());
    this.state = { subscribe: this.stateWritable.subscribe };
    this.now = { subscribe: this.nowWritable.subscribe };
    this.startupError = startupError;
  }

  snapshot(): AppState {
    return cloneState(this.value);
  }

  currentTime(): number {
    return this.clock.now();
  }

  private makeId(prefix: string): string {
    const nowPart = this.clock.now().toString(36);
    const counterPart = (this.idCounter++).toString(36);
    return `${prefix}-${nowPart}-${counterPart}`;
  }

  private commit(
    action: string,
    message: string,
    mutate: (state: AppState) => void,
    entityId?: string,
    recordAudit = true,
  ): void {
    const next = cloneState(this.value);
    mutate(next);
    next.revision += 1;
    next.lastSavedAt = this.clock.now();
    if (recordAudit) {
      next.auditLog.unshift({
        id: this.makeId('audit'),
        timestamp: this.clock.now(),
        action,
        entityId,
        message,
      });
      next.auditLog = next.auditLog.slice(0, 2_000);
    }
    assertValidAppState(next);
    this.repository.save(next);
    this.value = next;
    this.stateWritable.set(cloneState(next));
  }

  tick(): void {
    this.nowWritable.set(this.clock.now());
    this.processNotifications();
  }

  selectServiceDate(serviceDate: string): void {
    this.commit('ui.date', 'Servicetag gewechselt.', (state) => {
      state.ui.selectedServiceDate = serviceDate;
      ensureServiceDay(state, serviceDate);
    }, undefined, false);
  }

  selectRegion(region: Region): void {
    this.commit('ui.region', 'Bereich gewechselt.', (state) => {
      state.ui.selectedRegion = region;
    }, undefined, false);
  }

  setReservationFilter(filter: AppState['ui']['reservationFilter']): void {
    this.commit('ui.filter', 'Reservierungsfilter geändert.', (state) => {
      state.ui.reservationFilter = filter;
    }, undefined, false);
  }

  createReservation(draft: ReservationDraft): string {
    const id = this.makeId('reservation');
    const reservation = createReservation(draft, this.value.settings, id, this.clock.now());
    this.commit('reservation.create', `${reservation.name} angelegt.`, (state) => {
      ensureServiceDay(state, reservation.serviceDate);
      state.reservations.push(reservation);
    }, id);
    return id;
  }

  createReservationAtTable(draft: ReservationDraft, tableId: string): string {
    if (!isWithinOpeningHours(draft.serviceDate, draft.startTime, this.value.settings)) {
      throw new Error('Die gewählte Uhrzeit liegt außerhalb der hinterlegten Öffnungszeiten.');
    }
    const id = this.makeId('reservation');
    const reservation = createReservation(draft, this.value.settings, id, this.clock.now());
    const tableOption = buildTableOptions(this.value.settings.useBarSeatsForSingles)
      .find((candidate) => candidate.id === `table:${tableId}`);
    if (!tableOption) {
      throw new Error('Dieser Tisch ist für direkte Reservierungen nicht verfügbar.');
    }
    const planningState = cloneState(this.value);
    ensureServiceDay(planningState, reservation.serviceDate);
    const reason = placementAvailabilityReason(
      planningState,
      reservation,
      tableOption,
      'exclusive',
      this.clock.now(),
    );
    if (reason) {
      throw new Error(`Die Reservierung kann nicht an diesem Tisch angelegt werden: ${reason}`);
    }
    reservation.status = 'assigned';
    reservation.assignment = {
      optionId: tableOption.id,
      tableIds: [...tableOption.tableIds],
      region: tableOption.region,
      capacity: tableOption.capacity,
      mode: 'exclusive',
      source: 'manual',
      locked: true,
      assignedAt: this.clock.now(),
    };
    this.commit('reservation.create-at-table', `${reservation.name} direkt an ${formatTableList(tableOption.tableIds)} angelegt.`, (state) => {
      ensureServiceDay(state, reservation.serviceDate);
      state.reservations.push(reservation);
    }, id);
    return id;
  }

  createWalkIn(
    partySize: number,
    preference: SeatingPreference = 'none',
    serviceDate = this.value.ui.selectedServiceDate,
    startTime?: string,
  ): string {
    const now = new Date(this.clock.now());
    const effectiveTime = startTime
      ?? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return this.createReservation({
      serviceDate,
      startTime: effectiveTime,
      partySize,
      name: 'Walk-in',
      source: 'walk-in',
      preference,
      allowTableSharing: true,
    });
  }

  updateReservation(id: string, update: ReservationUpdate): void {
    const current = this.findReservation(id);
    if (current.status === 'seated' || current.status === 'cleaning') {
      const changesOperationalTiming = update.serviceDate !== undefined
        || update.startTime !== undefined
        || update.partySize !== undefined
        || update.durationMinutes !== undefined
        || update.preference !== undefined;
      if (changesOperationalTiming) {
        throw new Error('Bei bereits anwesenden Gästen können Zeit, Größe und Bereich nicht mehr geändert werden.');
      }
    }

    this.commit('reservation.update', `${current.name} bearbeitet.`, (state) => {
      const reservation = state.reservations.find((candidate) => candidate.id === id)!;
      const assignmentSensitiveChange = (
        (update.serviceDate !== undefined && update.serviceDate !== reservation.serviceDate)
        || (update.startTime !== undefined && update.startTime !== reservation.startTime)
        || (update.durationMinutes !== undefined && update.durationMinutes !== reservation.durationMinutes)
        || (update.partySize !== undefined && update.partySize !== reservation.partySize)
        || (update.preference !== undefined && update.preference !== reservation.preference)
      );

      Object.assign(reservation, update);
      reservation.name = reservation.name.trim();
      reservation.phone = reservation.phone.trim();
      reservation.email = reservation.email.trim();
      reservation.notes = reservation.notes.trim();
      reservation.updatedAt = this.clock.now();
      if (!reservation.name) {
        throw new Error('Ein Name ist erforderlich.');
      }
      if (assignmentSensitiveChange && reservation.status !== 'seated' && reservation.status !== 'cleaning') {
        reservation.assignment = undefined;
        reservation.status = 'unassigned';
      }
      ensureServiceDay(state, reservation.serviceDate);
    }, id);
  }

  cancelReservation(id: string): void {
    const reservation = this.findReservation(id);
    this.commit('reservation.cancel', `${reservation.name} storniert.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.status = 'cancelled';
      target.updatedAt = this.clock.now();
    }, id);
  }

  markNoShow(id: string): void {
    const reservation = this.findReservation(id);
    this.commit('reservation.no-show', `${reservation.name} als No-Show markiert.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.status = 'no-show';
      target.updatedAt = this.clock.now();
    }, id);
  }

  delayReservation(id: string, minutes: number): void {
    const reservation = this.findReservation(id);
    this.commit('reservation.delay', `${reservation.name} um ${minutes} Minuten verspätet.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.delayMinutes = Math.max(0, target.delayMinutes + minutes);
      target.updatedAt = this.clock.now();
    }, id);
  }

  markArrived(id: string): void {
    const reservation = this.findReservation(id);
    if (reservation.status === 'seated') {
      return;
    }
    if (!reservation.assignment) {
      throw new Error('Die Reservierung muss zuerst an einem Tisch platziert werden.');
    }
    // Kapazitätsschutz: nicht zwei Parteien gleichzeitig an denselben Tisch
    // setzen, wenn dadurch die Sitzplätze überschritten würden.
    const myTables = reservation.assignment.tableIds;
    const seatedOnSameTable = this.value.reservations.filter((other) => (
      other.id !== id
      && other.serviceDate === reservation.serviceDate
      && other.status === 'seated'
      && other.assignment
      && other.assignment.tableIds.some((tableId) => myTables.includes(tableId))
    ));
    if (seatedOnSameTable.length > 0) {
      const meExclusive = reservation.assignment.mode !== 'shared';
      if (meExclusive) {
        const names = seatedOnSameTable.map((other) => other.name).join(', ');
        throw new Error(`Tisch ist schon durch ${names} belegt. Erst „Gäste sind gegangen", dann die nächste Ankunft bestätigen.`);
      }
      // Geteilte Belegung wurde beim Platzieren bereits physisch geprüft –
      // hier nur noch sicherstellen, dass die Platz-Summe nie überschritten wird.
      const seatedGuests = seatedOnSameTable.reduce((sum, other) => sum + other.partySize, 0);
      if (seatedGuests + reservation.partySize > reservation.assignment.capacity) {
        throw new Error(`Zu viele Gäste für den Tisch (${reservation.assignment.capacity} Plätze): ${seatedGuests} sitzen bereits, mit +${reservation.partySize} wäre er überbelegt.`);
      }
    }
    this.commit('reservation.arrive', `${reservation.name} ist angekommen.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.status = 'seated';
      target.arrivedAt = this.clock.now();
      target.assignment!.locked = true;
      if (target.assignment!.tableIds.length > 1) {
        target.assignment!.preparedAt ??= this.clock.now();
      }
      target.updatedAt = this.clock.now();
    }, id);
  }

  markLeft(id: string): void {
    const reservation = this.findReservation(id);
    if (reservation.status !== 'seated') {
      throw new Error('Nur anwesende Gäste können als gegangen markiert werden.');
    }
    this.commit('reservation.left', `${reservation.name} ist gegangen; Reinigung offen.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.status = 'cleaning';
      target.leftAt = this.clock.now();
      target.updatedAt = this.clock.now();
    }, id);
  }

  private nextReservationUsingTables(state: AppState, reservation: Reservation): Reservation | undefined {
    const tableIds = reservation.assignment?.tableIds ?? [];
    return state.reservations
      .filter((candidate) => (
        candidate.id !== reservation.id
        && candidate.serviceDate === reservation.serviceDate
        && candidate.assignment
        && !['done', 'no-show', 'cancelled'].includes(candidate.status)
        && reservationStart(candidate) >= reservationStart(reservation)
        && candidate.assignment.tableIds.some((tableId) => tableIds.includes(tableId))
      ))
      .sort((left, right) => reservationStart(left) - reservationStart(right))[0];
  }

  completeCleaning(id: string): void {
    const reservation = this.findReservation(id);
    if (reservation.status !== 'cleaning') {
      throw new Error('Für diese Reservierung ist keine Reinigung offen.');
    }
    this.commit('reservation.cleaning-complete', `Reinigung nach ${reservation.name} abgeschlossen.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.cleaningCompletedAt = this.clock.now();
      const isJoined = (target.assignment?.tableIds.length ?? 0) > 1;
      if (!isJoined) {
        target.status = 'done';
      } else {
        const next = this.nextReservationUsingTables(state, target);
        const sameConfigurationContinues = Boolean(
          next?.assignment
          && target.assignment
          && sameTableIds(next.assignment.tableIds, target.assignment.tableIds),
        );
        if (sameConfigurationContinues) {
          target.resetCompletedAt = this.clock.now();
          target.status = 'done';
          next!.assignment!.preparedAt ??= this.clock.now();
        }
      }
      target.updatedAt = this.clock.now();
    }, id);
  }

  completeReset(id: string): void {
    const reservation = this.findReservation(id);
    if (reservation.status !== 'cleaning' || reservation.cleaningCompletedAt === undefined) {
      throw new Error('Zuerst muss die Reinigung abgeschlossen werden.');
    }
    this.commit('reservation.reset-complete', `Tischaufbau nach ${reservation.name} zurückgesetzt.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.resetCompletedAt = this.clock.now();
      target.status = 'done';
      target.updatedAt = this.clock.now();
    }, id);
  }

  completeCleaningAndReset(id: string): void {
    const reservation = this.findReservation(id);
    this.commit('reservation.clean-reset-complete', `Reinigung und Rückbau nach ${reservation.name} abgeschlossen.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.cleaningCompletedAt = this.clock.now();
      target.resetCompletedAt = this.clock.now();
      target.status = 'done';
      target.updatedAt = this.clock.now();
    }, id);
  }

  unassignReservation(id: string): void {
    const reservation = this.findReservation(id);
    if (reservation.status === 'seated' || reservation.status === 'cleaning') {
      throw new Error('Anwesende Gäste müssen über den Raumabgleich umgesetzt werden.');
    }
    this.commit('reservation.unassign', `${reservation.name} zurück in die Liste gelegt.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.assignment = undefined;
      target.status = 'unassigned';
      target.updatedAt = this.clock.now();
    }, id);
  }

  unassignAllAssigned(serviceDate = this.value.ui.selectedServiceDate): number {
    const affected = this.value.reservations.filter((reservation) => (
      reservation.serviceDate === serviceDate && reservation.status === 'assigned'
    ));
    if (affected.length === 0) {
      return 0;
    }
    this.commit('reservation.unassign-all', `${affected.length} Reservierungen zurück in die Liste gelegt.`, (state) => {
      for (const reservation of state.reservations) {
        if (reservation.serviceDate === serviceDate && reservation.status === 'assigned') {
          reservation.assignment = undefined;
          reservation.status = 'unassigned';
          reservation.updatedAt = this.clock.now();
        }
      }
    });
    return affected.length;
  }

  previewPlan(serviceDate = this.value.ui.selectedServiceDate): PlanResult {
    return solveAssignments(this.value, serviceDate, this.clock.now());
  }

  applyPlan(plan: PlanResult, serviceDate = this.value.ui.selectedServiceDate): void {
    const issues = validatePlan(this.value, serviceDate, plan)
      .filter((issue) => issue.code !== 'preference');
    if (issues.length > 0) {
      throw new Error(`Plan ist nicht anwendbar: ${issues[0].message}`);
    }

    this.commit('plan.apply', `Auto-Plan angewendet: ${plan.assignedCount} platziert, ${plan.unassignedCount} offen.`, (state) => {
      for (const planned of plan.assignments) {
        const reservation = state.reservations.find((candidate) => candidate.id === planned.reservationId);
        if (!reservation || reservation.status === 'seated' || reservation.status === 'cleaning') {
          continue;
        }
        if (!planned.option) {
          reservation.assignment = undefined;
          reservation.status = 'unassigned';
          reservation.updatedAt = this.clock.now();
          continue;
        }
        const previousPreparedAt = reservation.assignment
          && sameTableIds(reservation.assignment.tableIds, planned.option.tableIds)
          ? reservation.assignment.preparedAt
          : undefined;
        reservation.assignment = {
          optionId: planned.option.id,
          tableIds: [...planned.option.tableIds],
          region: planned.option.region,
          capacity: planned.option.capacity,
          mode: planned.mode,
          source: 'auto',
          locked: false,
          assignedAt: this.clock.now(),
          preparedAt: previousPreparedAt,
        };
        reservation.status = 'assigned';
        this.seatWalkInImmediately(reservation);
        reservation.updatedAt = this.clock.now();
      }
    });
  }

  autoAssignReservation(id: string): boolean {
    const reservation = this.findReservation(id);
    const planningState = cloneState(this.value);
    for (const candidate of planningState.reservations) {
      if (candidate.id === id) {
        if (candidate.assignment) {
          candidate.assignment.locked = false;
        }
      } else if (candidate.assignment && candidate.serviceDate === reservation.serviceDate) {
        candidate.assignment.locked = true;
      }
    }
    const plan = solveAssignments(planningState, reservation.serviceDate, this.clock.now());
    const assignment = plan.assignments.find((candidate) => candidate.reservationId === id);
    if (!assignment?.option) {
      return false;
    }
    this.commit('plan.auto-single', `${reservation.name} automatisch an ${formatTableList(assignment.option.tableIds)} platziert.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.assignment = {
        optionId: assignment.option!.id,
        tableIds: [...assignment.option!.tableIds],
        region: assignment.option!.region,
        capacity: assignment.option!.capacity,
        mode: assignment.mode,
        source: 'auto',
        locked: false,
        assignedAt: this.clock.now(),
      };
      target.status = 'assigned';
      this.seatWalkInImmediately(target);
      target.updatedAt = this.clock.now();
    }, id);
    return true;
  }

  placementChoices(reservationId: string, tableId: string): PlacementChoice[] {
    return placementChoicesForTable(this.value, this.findReservation(reservationId), tableId, this.clock.now());
  }

  // Vorschau: welchen Tisch würde die automatische Platzierung wählen (ohne zu buchen)?
  previewAutoPlacement(id: string): string | null {
    const reservation = this.findReservation(id);
    const planningState = cloneState(this.value);
    for (const candidate of planningState.reservations) {
      if (candidate.id === id) {
        if (candidate.assignment) {
          candidate.assignment.locked = false;
        }
      } else if (candidate.assignment && candidate.serviceDate === reservation.serviceDate) {
        candidate.assignment.locked = true;
      }
    }
    const plan = solveAssignments(planningState, reservation.serviceDate, this.clock.now());
    const assignment = plan.assignments.find((candidate) => candidate.reservationId === id);
    if (!assignment?.option) {
      return null;
    }
    return formatTableList(assignment.option.tableIds);
  }

  hasPlannableReservations(serviceDate = this.value.ui.selectedServiceDate): boolean {
    return this.value.reservations.some((reservation) => (
      reservation.serviceDate === serviceDate
      && (reservation.status === 'unassigned' || reservation.status === 'assigned')
      && !reservationIsFixedForPlanning(reservation, this.value, this.clock.now())
    ));
  }

  placeableUnassignedReservationsAtTable(
    tableId: string,
    serviceDate = this.value.ui.selectedServiceDate,
  ): Reservation[] {
    return this.value.reservations.filter((reservation) => (
      reservation.serviceDate === serviceDate
      && reservation.status === 'unassigned'
      && placementChoicesForTable(this.value, reservation, tableId, this.clock.now())
        .some((choice) => choice.available)
    ));
  }

  manualAssign(
    reservationId: string,
    optionId: string,
    options: ManualAssignmentOptions,
  ): void {
    const reservation = this.findReservation(reservationId);
    const tableOption = buildTableOptions(this.value.settings.useBarSeatsForSingles)
      .find((candidate) => candidate.id === optionId);
    if (!tableOption) {
      throw new Error('Unbekannte Tischkombination.');
    }
    const overrideReason = options.overrideReason?.trim() ?? '';
    const preferenceMismatch = reservation.preference !== 'none'
      && reservation.preference !== tableOption.region;
    const sharingOverride = options.mode === 'shared'
      && reservation.source !== 'walk-in'
      && !reservation.allowTableSharing;

    let effectiveReservation = reservation;
    const shortened = options.shortenedDurationMinutes;
    if (shortened !== undefined) {
      const allowed = walkInGapDurationMinutes(this.value, reservation, tableOption, this.clock.now());
      if (reservation.source !== 'walk-in' || allowed === null || shortened > allowed) {
        throw new Error('Eine verkürzte Platzierung ist an diesem Tisch nicht mehr möglich.');
      }
      effectiveReservation = { ...reservation, durationMinutes: shortened };
    }

    const seatedSharingOverride = options.mode === 'shared'
      && reservation.source === 'walk-in'
      && placementAvailabilityReason(
        this.value,
        effectiveReservation,
        tableOption,
        options.mode,
        this.clock.now(),
        { allowPreferenceOverride: true, allowSharingOverride: true },
      ) !== null;
    if ((preferenceMismatch || sharingOverride || seatedSharingOverride || shortened !== undefined) && !overrideReason) {
      throw new Error('Für diese Abweichung ist ein kurzer Grund erforderlich.');
    }

    const physicalReason = placementAvailabilityReason(
      this.value,
      effectiveReservation,
      tableOption,
      options.mode,
      this.clock.now(),
      {
        allowPreferenceOverride: true,
        allowSharingOverride: true,
        allowSeatedSharingOverride: reservation.source === 'walk-in',
      },
    );
    if (physicalReason) {
      throw new Error(physicalReason);
    }

    const source = options.source ?? 'manual';
    this.commit('reservation.assign-manual', `${reservation.name} manuell an ${formatTableList(tableOption.tableIds)} platziert.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === reservationId)!;
      const sameConfiguration = target.assignment
        && sameTableIds(target.assignment.tableIds, tableOption.tableIds);
      target.assignment = {
        optionId: tableOption.id,
        tableIds: [...tableOption.tableIds],
        region: tableOption.region,
        capacity: tableOption.capacity,
        mode: options.mode,
        source,
        locked: options.lock ?? true,
        assignedAt: this.clock.now(),
        preparedAt: source === 'recovery' && tableOption.connectionCount > 0
          ? this.clock.now()
          : (sameConfiguration ? target.assignment?.preparedAt : undefined),
        overrideReason: overrideReason || undefined,
      };
      if (sharingOverride) {
        target.allowTableSharing = true;
      }
      if (shortened !== undefined) {
        target.durationMinutes = shortened;
      }
      if (target.status !== 'seated' && target.status !== 'cleaning') {
        target.status = 'assigned';
      }
      this.seatWalkInImmediately(target);
      target.updatedAt = this.clock.now();
    }, reservationId);
  }

  /**
   * Walk-in guests are present by definition, so a placed walk-in is seated
   * right away — no separate arrival confirmation. Deliberately does not
   * default preparedAt so a pending join task stays open while guests wait.
   */
  private seatWalkInImmediately(target: Reservation): void {
    if (target.source !== 'walk-in' || target.status === 'seated' || target.status === 'cleaning') {
      return;
    }
    target.status = 'seated';
    target.arrivedAt = this.clock.now();
    if (target.assignment) {
      target.assignment.locked = true;
    }
  }

  unlockAssignment(id: string): void {
    const reservation = this.findReservation(id);
    if (!reservation.assignment) {
      return;
    }
    this.commit('reservation.unlock', `${reservation.name} für Auto-Plan freigegeben.`, (state) => {
      state.reservations.find((candidate) => candidate.id === id)!.assignment!.locked = false;
    }, id);
  }

  markPrepared(id: string): void {
    const reservation = this.findReservation(id);
    if (!reservation.assignment || reservation.assignment.tableIds.length < 2) {
      throw new Error('Diese Reservierung benötigt keinen Tischaufbau.');
    }
    this.commit('reservation.prepared', `Tische für ${reservation.name} vorbereitet.`, (state) => {
      state.reservations.find((candidate) => candidate.id === id)!.assignment!.preparedAt = this.clock.now();
    }, id);
  }

  setWeather(serviceDate: string, weather: WeatherKind): void {
    this.commit('service.weather', weather === 'rain' ? 'Regen aktiviert; Außenbereich geschlossen.' : 'Trockenes Wetter eingestellt.', (state) => {
      const day = ensureServiceDay(state, serviceDate);
      day.weather = weather;
      if (weather === 'rain') {
        day.outsideOpen = false;
      }
    }, serviceDate);
  }

  setOutsideOpen(serviceDate: string, open: boolean): void {
    const day = this.value.serviceDays[serviceDate];
    if (open && day?.weather === 'rain') {
      throw new Error('Bei Regen kann der Außenbereich nicht geöffnet werden.');
    }
    this.commit('service.outside', open ? 'Außenbereich geöffnet.' : 'Außenbereich geschlossen.', (state) => {
      ensureServiceDay(state, serviceDate).outsideOpen = open;
    }, serviceDate);
  }

  updateServiceNotes(serviceDate: string, notes: string): void {
    this.commit('service.notes', 'Betriebsnotiz aktualisiert.', (state) => {
      ensureServiceDay(state, serviceDate).notes = notes;
    }, serviceDate);
  }

  startRush(serviceDate = this.value.ui.selectedServiceDate): void {
    this.commit('rush.start', 'Stoßbetrieb gestartet; native Hinweise pausiert.', (state) => {
      const rush = ensureServiceDay(state, serviceDate).rush;
      rush.status = 'active';
      rush.startedAt = this.clock.now();
      rush.endedAt = undefined;
      rush.reconciliationStartedAt = undefined;
      rush.reconciliationCompletedAt = undefined;
      rush.reconciledReservationIds = [];
    }, serviceDate);
  }

  endRush(serviceDate = this.value.ui.selectedServiceDate): void {
    this.commit('rush.end', 'Stoßbetrieb beendet; Raumabgleich erforderlich.', (state) => {
      const rush = ensureServiceDay(state, serviceDate).rush;
      rush.status = 'reconciliation-needed';
      rush.endedAt = this.clock.now();
    }, serviceDate);
  }

  beginReconciliation(serviceDate = this.value.ui.selectedServiceDate): void {
    this.commit('rush.reconcile-start', 'Raumabgleich begonnen.', (state) => {
      const rush = ensureServiceDay(state, serviceDate).rush;
      rush.status = 'reconciling';
      rush.reconciliationStartedAt = this.clock.now();
    }, serviceDate);
  }

  reconciliationPending(serviceDate = this.value.ui.selectedServiceDate): Reservation[] {
    const reconciled = new Set(this.value.serviceDays[serviceDate]?.rush.reconciledReservationIds ?? []);
    return this.value.reservations.filter((reservation) => (
      reservation.serviceDate === serviceDate
      && !['done', 'no-show', 'cancelled'].includes(reservation.status)
      && (reservationStart(reservation) <= this.clock.now() || ['seated', 'cleaning'].includes(reservation.status))
      && !reconciled.has(reservation.id)
    ));
  }

  markReconciled(id: string): void {
    const reservation = this.findReservation(id);
    this.commit('rush.reconciled', `${reservation.name} im Raumabgleich bestätigt.`, (state) => {
      const rush = ensureServiceDay(state, reservation.serviceDate).rush;
      if (!rush.reconciledReservationIds.includes(id)) {
        rush.reconciledReservationIds.push(id);
      }
    }, id);
  }

  reconcileAtPlannedTable(id: string): void {
    const reservation = this.findReservation(id);
    if (!reservation.assignment) {
      throw new Error('Keine geplante Platzierung vorhanden.');
    }
    this.commit('rush.confirm-seat', `${reservation.name} sitzt wie geplant.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.status = 'seated';
      target.arrivedAt ??= this.clock.now();
      target.assignment!.locked = true;
      target.assignment!.source = 'recovery';
      const rush = ensureServiceDay(state, target.serviceDate).rush;
      if (!rush.reconciledReservationIds.includes(id)) {
        rush.reconciledReservationIds.push(id);
      }
    }, id);
  }

  reconcileNoShow(id: string): void {
    this.markNoShow(id);
    this.markReconciled(id);
  }

  reconcileLeftAndClean(id: string): void {
    const reservation = this.findReservation(id);
    this.commit('rush.left-clean', `${reservation.name} gegangen; Tisch bereits sauber.`, (state) => {
      const target = state.reservations.find((candidate) => candidate.id === id)!;
      target.leftAt ??= this.clock.now();
      target.cleaningCompletedAt = this.clock.now();
      target.resetCompletedAt = this.clock.now();
      target.status = 'done';
      const rush = ensureServiceDay(state, target.serviceDate).rush;
      if (!rush.reconciledReservationIds.includes(id)) {
        rush.reconciledReservationIds.push(id);
      }
    }, id);
  }

  finishReconciliation(serviceDate = this.value.ui.selectedServiceDate, force = false): void {
    const pending = this.reconciliationPending(serviceDate);
    if (pending.length > 0 && !force) {
      throw new Error(`Noch ${pending.length} Vorgänge müssen abgeglichen werden.`);
    }
    this.commit('rush.reconcile-complete', 'Raumabgleich abgeschlossen; geordneter Betrieb wieder aktiv.', (state) => {
      const rush = ensureServiceDay(state, serviceDate).rush;
      rush.status = 'off';
      rush.reconciliationCompletedAt = this.clock.now();
    }, serviceDate);
  }

  getTasks(serviceDate = this.value.ui.selectedServiceDate): OperationalTask[] {
    return generateOperationalTasks(this.value, serviceDate, this.clock.now());
  }

  acknowledgeTask(taskId: string): void {
    this.commit('task.complete', 'Aufgabe erledigt.', (state) => {
      state.taskAcknowledgements[taskId] = {
        taskId,
        completedAt: this.clock.now(),
      };
    }, taskId, false);
  }

  snoozeTask(taskId: string, minutes = 10): void {
    this.commit('task.snooze', `Aufgabe um ${minutes} Minuten verschoben.`, (state) => {
      state.taskAcknowledgements[taskId] = {
        taskId,
        snoozedUntil: this.clock.now() + minutes * 60_000,
      };
    }, taskId, false);
  }

  processNotifications(): void {
    const tasks = this.getTasks();
    const ready = tasksReadyForNotification(this.value, tasks, this.clock.now());
    if (ready.length === 0 || this.notificationGateway.permission() !== 'granted') {
      return;
    }
    for (const task of ready) {
      this.notificationGateway.send({
        title: task.title,
        body: task.detail,
        tag: task.id,
      });
    }
    this.commit('notification.sent', `${ready.length} Benachrichtigung(en) gesendet.`, (state) => {
      for (const task of ready) {
        state.notificationReceipts[task.id] = {
          taskId: task.id,
          sentAt: this.clock.now(),
        };
      }
    }, undefined, false);
  }

  async enableNativeNotifications(): Promise<'granted' | 'denied' | 'unsupported'> {
    const permission = await this.notificationGateway.requestPermission();
    const enabled = permission === 'granted';
    this.commit('settings.notifications', enabled ? 'Native Hinweise aktiviert.' : 'Native Hinweise nicht aktiviert.', (state) => {
      state.settings.nativeNotificationsEnabled = enabled;
    });
    return permission === 'default' ? 'denied' : permission;
  }

  notificationPermission(): NotificationPermission | 'unsupported' {
    return this.notificationGateway.permission();
  }

  updateSettings(settings: AppSettings): void {
    const openingHoursError = openingHoursValidationError(settings);
    if (openingHoursError) {
      throw new Error(openingHoursError);
    }
    const sanitized = sanitizeSettings(settings);
    this.commit('settings.update', 'Öffnungszeiten und Planungsparameter gespeichert.', (state) => {
      state.settings = sanitized;
    });
  }

  updateWeatherLocation(location: WeatherLocation | null): void {
    const next = cloneSettings(this.value.settings);
    next.weatherLocation = location ? { ...location } : null;
    this.updateSettings(next);
  }

  exportBackup(): string {
    return serializeBackup(this.value, this.clock.now());
  }

  importBackup(source: string): void {
    const imported = parseBackup(source);
    ensureServiceDay(imported, imported.ui.selectedServiceDate);
    imported.lastSavedAt = this.clock.now();
    imported.revision += 1;
    imported.auditLog.unshift({
      id: this.makeId('audit'),
      timestamp: this.clock.now(),
      action: 'backup.import',
      message: 'Backup vollständig importiert.',
    });
    assertValidAppState(imported);
    this.repository.save(imported);
    this.value = cloneState(imported);
    this.stateWritable.set(cloneState(imported));
  }

  resetAll(): void {
    const fresh = createInitialState(this.clock.now());
    this.repository.save(fresh);
    this.value = fresh;
    this.stateWritable.set(cloneState(fresh));
    this.nowWritable.set(this.clock.now());
  }

  // Wix-CSV-Export einlesen: künftige Reservierungen mit Status „Reserviert"
  // als offene Reservierungen übernehmen; Duplikate werden übersprungen.
  importWixReservations(csvText: string): {
    imported: number; duplicates: number; skippedPast: number; skippedStatus: number; skippedInvalid: number;
  } {
    const today = dateToServiceDate(new Date(this.clock.now()));
    const parsed = parseWixExport(csvText, today, (partySize) => durationForPartySize(partySize, this.value.settings));
    const existingKeys = new Set(this.value.reservations
      .filter((reservation) => !['cancelled', 'no-show'].includes(reservation.status))
      .map((reservation) => `${reservation.serviceDate}|${reservation.startTime}|${reservation.name.trim().toLowerCase()}|${reservation.partySize}`));
    const fresh = parsed.drafts.filter((draft) => {
      const key = `${draft.serviceDate}|${draft.startTime}|${draft.name.trim().toLowerCase()}|${draft.partySize}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    if (fresh.length > 0) {
      this.commit('reservation.import-wix', `${fresh.length} Wix-Reservierungen importiert.`, (state) => {
        for (const draft of fresh) {
          const reservation = createReservation(draft, state.settings, this.makeId('wix-reservation'), this.clock.now());
          ensureServiceDay(state, reservation.serviceDate);
          state.reservations.push(reservation);
        }
      });
    }
    return {
      imported: fresh.length,
      duplicates: parsed.drafts.length - fresh.length,
      skippedPast: parsed.skippedPast,
      skippedStatus: parsed.skippedStatus,
      skippedInvalid: parsed.skippedInvalid,
    };
  }

  generateDemoMonth(startDate = this.value.ui.selectedServiceDate, taper = false): {
    reservations: number;
    joinedReservations: number;
    startDate: string;
    endDate: string;
  } {
    const demo = buildDemoMonth(
      this.value.settings,
      startDate,
      this.clock.now(),
      () => this.makeId('demo-reservation'),
      taper,
    );
    this.commit('demo.generate-month', `Demo-Auslastung mit ${demo.reservations.length} Reservierungen erzeugt.`, (state) => {
      state.reservations = demo.reservations;
      state.serviceDays = demo.serviceDays;
      state.taskAcknowledgements = {};
      state.notificationReceipts = {};
      state.auditLog = [];
      state.ui.selectedServiceDate = startDate;
      ensureServiceDay(state, startDate);
    });
    return {
      reservations: demo.reservations.length,
      joinedReservations: demo.reservations.filter((reservation) => (
        (reservation.assignment?.tableIds.length ?? 0) > 1
      )).length,
      startDate: demo.startDate,
      endDate: demo.endDate,
    };
  }

  reservationsForDate(serviceDate = this.value.ui.selectedServiceDate): Reservation[] {
    return this.value.reservations
      .filter((reservation) => reservation.serviceDate === serviceDate)
      .sort((left, right) => reservationStart(left) - reservationStart(right));
  }

  reservationsForTable(tableId: string, serviceDate = this.value.ui.selectedServiceDate): Reservation[] {
    return this.reservationsForDate(serviceDate)
      .filter((reservation) => reservation.assignment?.tableIds.includes(tableId));
  }

  findReservation(id: string): Reservation {
    const reservation = this.value.reservations.find((candidate) => candidate.id === id);
    if (!reservation) {
      throw new Error(`Reservierung ${id} wurde nicht gefunden.`);
    }
    return reservation;
  }

  statusLabel(status: ReservationStatus): string {
    return {
      unassigned: 'Offen',
      assigned: 'Platziert',
      seated: 'Am Tisch',
      cleaning: 'Reinigung',
      done: 'Beendet',
      'no-show': 'No-Show',
      cancelled: 'Storniert',
    }[status];
  }

  replaceStateForTests(state: AppState): void {
    assertValidAppState(state);
    this.repository.save(state);
    this.value = cloneState(state);
    this.stateWritable.set(cloneState(state));
  }

  setNowForTests(epochMs: number): void {
    const mutable = this.clock as Clock & { set?: (value: number) => void };
    if (!mutable.set) {
      throw new Error('The active clock is not mutable.');
    }
    mutable.set(epochMs);
    const selectedDate = dateToServiceDate(new Date(epochMs));
    this.nowWritable.set(epochMs);
    if (!this.value.serviceDays[selectedDate]) {
      this.commit('test.clock', 'Testzeit gesetzt.', (state) => {
        ensureServiceDay(state, selectedDate);
      }, undefined, false);
    }
    this.processNotifications();
  }
}
