import { describe, expect, it } from 'vitest';
import { createReservation } from '../../src/application/reservationFactory';
import type { AppState, Reservation } from '../../src/domain/model';
import { DEFAULT_SETTINGS } from '../../src/domain/settings';
import {
  placementAvailabilityReason,
  solveAssignments,
  validatePlan,
  walkInGapDurationMinutes,
} from '../../src/domain/solver';
import { createInitialState, ensureServiceDay } from '../../src/domain/state';
import { buildTableOptions } from '../../src/domain/tableCatalog';
import { serviceDateTime } from '../../src/domain/time';
import { BASE_DATE, BASE_NOW, draft } from '../helpers';

function stateWithReservations(reservations: Reservation[]): AppState {
  const state = createInitialState(BASE_NOW);
  state.reservations = reservations;
  ensureServiceDay(state, BASE_DATE);
  return state;
}

function reservation(id: string, overrides = {}) {
  return createReservation(draft(overrides), DEFAULT_SETTINGS, id, BASE_NOW);
}

describe('assignment solver', () => {
  it('honors inside and outside preferences', () => {
    const inside = reservation('inside', { name: 'Innen', preference: 'inside' });
    const outside = reservation('outside', { name: 'Außen', preference: 'outside', startTime: '18:30' });
    const plan = solveAssignments(stateWithReservations([inside, outside]), BASE_DATE, BASE_NOW);
    expect(plan.assignments.find((item) => item.reservationId === 'inside')?.option?.region).toBe('inside');
    expect(plan.assignments.find((item) => item.reservationId === 'outside')?.option?.region).toBe('outside');
  });

  it('leaves outside-only guests unassigned when it rains', () => {
    const outside = reservation('outside', { preference: 'outside' });
    const state = stateWithReservations([outside]);
    state.serviceDays[BASE_DATE].weather = 'rain';
    state.serviceDays[BASE_DATE].outsideOpen = false;
    const plan = solveAssignments(state, BASE_DATE, BASE_NOW);
    expect(plan.assignments[0].option).toBeNull();
  });

  it('allows four independent solo walk-ins to share one four-top', () => {
    const walkIns = Array.from({ length: 4 }, (_, index) => reservation(`w${index}`, {
      name: 'Walk-in', source: 'walk-in', partySize: 1, allowTableSharing: true,
    }));
    const plan = solveAssignments(stateWithReservations(walkIns), BASE_DATE, BASE_NOW);
    const assigned = plan.assignments.filter((item) => item.option);
    expect(assigned).toHaveLength(4);
    expect(new Set(assigned.map((item) => item.option!.tableIds[0])).size).toBe(1);
    expect(assigned.every((item) => item.mode === 'shared')).toBe(true);
    expect(assigned.reduce((sum, item) => sum + walkIns.find((w) => w.id === item.reservationId)!.partySize, 0)).toBe(4);
  });

  it('does not apply an arbitrary shared-party count limit', () => {
    const walkIns = Array.from({ length: 6 }, (_, index) => reservation(`w${index}`, {
      name: 'Walk-in', source: 'walk-in', partySize: 1, allowTableSharing: true,
    }));
    const plan = solveAssignments(stateWithReservations(walkIns), BASE_DATE, BASE_NOW);
    expect(plan.assignedCount).toBe(6);
    expect(validatePlan(stateWithReservations(walkIns), BASE_DATE, plan)).toEqual([]);
  });

  it('never shares a normal reservation without consent', () => {
    const regulars = Array.from({ length: 3 }, (_, index) => reservation(`r${index}`, {
      name: `Regular ${index}`, partySize: 1, allowTableSharing: false,
    }));
    const plan = solveAssignments(stateWithReservations(regulars), BASE_DATE, BASE_NOW);
    expect(plan.assignments.every((item) => item.mode === 'exclusive')).toBe(true);
  });

  it('rejects a joined option when setup cannot finish before arrival', () => {
    const large = reservation('large', { partySize: 8, startTime: '15:05' });
    const plan = solveAssignments(stateWithReservations([large]), BASE_DATE, BASE_NOW);
    expect(plan.assignments[0].option).toBeNull();
  });

  it('allows a joined option when setup time is available', () => {
    const large = reservation('large', { partySize: 8, startTime: '16:00' });
    const plan = solveAssignments(stateWithReservations([large]), BASE_DATE, BASE_NOW);
    expect(plan.assignments[0].option?.kind).toBe('joined');
  });

  it('allows a walk-in on a joined option without setup lead time because present guests wait', () => {
    const walkIn = reservation('walkin-large', { partySize: 8, source: 'walk-in', startTime: '15:05', allowTableSharing: true });
    const plan = solveAssignments(stateWithReservations([walkIn]), BASE_DATE, BASE_NOW);
    expect(plan.assignments[0].option?.kind).toBe('joined');
  });

  it('offers a walk-in a shortened stay before the next reservation on the table', () => {
    const later = reservation('later', { startTime: '16:45', durationMinutes: 60 });
    later.assignment = {
      optionId: 'table:5',
      tableIds: ['5'],
      region: 'inside',
      capacity: 2,
      mode: 'exclusive',
      source: 'manual',
      locked: true,
      assignedAt: BASE_NOW,
    };
    later.status = 'assigned';
    const walkIn = reservation('walkin-gap', { source: 'walk-in', startTime: '15:00', partySize: 2, allowTableSharing: true });
    const state = stateWithReservations([later, walkIn]);
    const option = buildTableOptions(false).find((candidate) => candidate.id === 'table:5')!;
    // 15:00 → 16:45 leaves 105 minutes; minus 15 minutes cleaning = 90.
    expect(walkInGapDurationMinutes(state, walkIn, option, BASE_NOW)).toBe(90);
    const phone = reservation('phone-gap', { startTime: '15:00', partySize: 2 });
    expect(walkInGapDurationMinutes(stateWithReservations([later, phone]), phone, option, BASE_NOW)).toBeNull();
  });

  it('lets a walk-in join an exclusively occupied table only via the seated-sharing override', () => {
    const seatedParty = reservation('seated-party', { startTime: '15:00', partySize: 2 });
    seatedParty.assignment = {
      optionId: 'table:12',
      tableIds: ['12'],
      region: 'inside',
      capacity: 4,
      mode: 'exclusive',
      source: 'manual',
      locked: true,
      assignedAt: BASE_NOW,
    };
    seatedParty.status = 'seated';
    seatedParty.arrivedAt = BASE_NOW;
    const walkIn = reservation('walkin-join', { source: 'walk-in', startTime: '15:10', partySize: 1, allowTableSharing: true });
    const state = stateWithReservations([seatedParty, walkIn]);
    const option = buildTableOptions(false).find((candidate) => candidate.id === 'table:12')!;
    expect(placementAvailabilityReason(state, walkIn, option, 'shared', BASE_NOW)).not.toBeNull();
    expect(placementAvailabilityReason(state, walkIn, option, 'shared', BASE_NOW, { allowSeatedSharingOverride: true })).toBeNull();
  });

  it('enforces cleaning and split time before a different configuration', () => {
    const first = reservation('first', { partySize: 8, durationMinutes: 60 });
    const next = reservation('next', { partySize: 5, startTime: '19:19', durationMinutes: 60 });
    const state = stateWithReservations([first, next]);
    const options = buildTableOptions(false);
    const joined = options.find((option) => option.id === 'join:14+13')!;
    const single = options.find((option) => option.id === 'table:14')!;
    first.assignment = { optionId: joined.id, tableIds: joined.tableIds, region: joined.region, capacity: joined.capacity, mode: 'exclusive', source: 'manual', locked: true, assignedAt: BASE_NOW, preparedAt: BASE_NOW };
    first.status = 'assigned';
    const reason = placementAvailabilityReason(state, next, single, 'exclusive', BASE_NOW);
    expect(reason).toContain('kollidiert');
    next.startTime = '19:20';
    expect(placementAvailabilityReason(state, next, single, 'exclusive', BASE_NOW)).toBeNull();
  });

  it('keeps the same joined configuration without split and rejoin', () => {
    const first = reservation('first', { partySize: 8, durationMinutes: 60 });
    const next = reservation('next', { partySize: 8, startTime: '19:15', durationMinutes: 60 });
    const state = stateWithReservations([first, next]);
    const joined = buildTableOptions(false).find((option) => option.id === 'join:14+13')!;
    first.assignment = { optionId: joined.id, tableIds: joined.tableIds, region: joined.region, capacity: joined.capacity, mode: 'exclusive', source: 'manual', locked: true, assignedAt: BASE_NOW, preparedAt: BASE_NOW };
    first.status = 'assigned';
    expect(placementAvailabilityReason(state, next, joined, 'exclusive', BASE_NOW)).toBeNull();
  });

  it('protects the one shared middle seat between 17 and 17A', () => {
    const left = reservation('left', { partySize: 4 });
    const right = reservation('right', { partySize: 4 });
    const state = stateWithReservations([left, right]);
    const options = buildTableOptions(false);
    const t17 = options.find((option) => option.id === 'table:17')!;
    const t17a = options.find((option) => option.id === 'table:17A')!;
    left.assignment = { optionId: t17.id, tableIds: t17.tableIds, region: 'inside', capacity: 4, mode: 'exclusive', source: 'manual', locked: true, assignedAt: BASE_NOW };
    left.status = 'assigned';
    expect(placementAvailabilityReason(state, right, t17a, 'exclusive', BASE_NOW)).not.toBeNull();
  });

  it('uses an early completed reset as the real release time', () => {
    const first = reservation('first', { partySize: 8, durationMinutes: 60 });
    const next = reservation('next', { partySize: 5, startTime: '19:16' });
    const state = stateWithReservations([first, next]);
    const options = buildTableOptions(false);
    const joined = options.find((option) => option.id === 'join:14+13')!;
    const single = options.find((option) => option.id === 'table:14')!;
    first.assignment = { optionId: joined.id, tableIds: joined.tableIds, region: 'inside', capacity: joined.capacity, mode: 'exclusive', source: 'manual', locked: true, assignedAt: BASE_NOW, preparedAt: BASE_NOW };
    first.status = 'cleaning';
    first.leftAt = serviceDateTime(BASE_DATE, '19:00');
    first.cleaningCompletedAt = serviceDateTime(BASE_DATE, '19:10');
    first.resetCompletedAt = serviceDateTime(BASE_DATE, '19:12');
    expect(placementAvailabilityReason(state, next, single, 'exclusive', BASE_NOW)).toBeNull();
  });
});
