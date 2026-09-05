import { describe, expect, it } from 'vitest';
import { createReservation } from '../../src/application/reservationFactory';
import { generateOperationalTasks, tasksReadyForNotification } from '../../src/application/tasks';
import { DEFAULT_SETTINGS } from '../../src/domain/settings';
import { createInitialState, ensureServiceDay } from '../../src/domain/state';
import { buildTableOptions } from '../../src/domain/tableCatalog';
import { MINUTE_MS, serviceDateTime } from '../../src/domain/time';
import { BASE_DATE, BASE_NOW, draft } from '../helpers';

function assignedReservation() {
  const reservation = createReservation(draft({ name: 'Bauer' }), DEFAULT_SETTINGS, 'r1', BASE_NOW);
  const option = buildTableOptions(false).find((candidate) => candidate.id === 'table:1')!;
  reservation.assignment = { optionId: option.id, tableIds: option.tableIds, region: option.region, capacity: option.capacity, mode: 'exclusive', source: 'auto', locked: false, assignedAt: BASE_NOW };
  reservation.status = 'assigned';
  return reservation;
}

describe('operational tasks and notifications', () => {
  it('shows upcoming arrival inside the configured lead window', () => {
    const state = createInitialState(BASE_NOW);
    ensureServiceDay(state, BASE_DATE);
    state.reservations = [assignedReservation()];
    const now = serviceDateTime(BASE_DATE, '17:35');
    const tasks = generateOperationalTasks(state, BASE_DATE, now);
    expect(tasks.some((task) => task.kind === 'arrival')).toBe(true);
  });

  it('replaces arrival guidance with a critical late check', () => {
    const state = createInitialState(BASE_NOW);
    ensureServiceDay(state, BASE_DATE);
    state.reservations = [assignedReservation()];
    const tasks = generateOperationalTasks(state, BASE_DATE, serviceDateTime(BASE_DATE, '18:16'));
    expect(tasks.some((task) => task.kind === 'late-check' && task.priority === 'critical')).toBe(true);
  });

  it('creates preparation, cleaning, split, rain, and reconciliation tasks', () => {
    const state = createInitialState(BASE_NOW);
    ensureServiceDay(state, BASE_DATE);
    const reservation = assignedReservation();
    const joined = buildTableOptions(false).find((candidate) => candidate.id === 'join:14+13')!;
    reservation.assignment = { ...reservation.assignment!, optionId: joined.id, tableIds: joined.tableIds, capacity: joined.capacity };
    state.reservations = [reservation];
    const preparationVisibleAt = serviceDateTime(BASE_DATE, '18:00')
      - (joined.connectionCount * state.settings.joinMinutesPerConnection
        + state.settings.preparationNotificationLeadMinutes) * MINUTE_MS;
    expect(generateOperationalTasks(state, BASE_DATE, preparationVisibleAt - MINUTE_MS).some((task) => task.kind === 'prepare-join')).toBe(false);
    expect(generateOperationalTasks(state, BASE_DATE, preparationVisibleAt).some((task) => task.kind === 'prepare-join')).toBe(true);

    reservation.status = 'cleaning';
    reservation.leftAt = serviceDateTime(BASE_DATE, '19:00');
    expect(generateOperationalTasks(state, BASE_DATE, reservation.leftAt).some((task) => task.kind === 'cleaning')).toBe(true);
    reservation.cleaningCompletedAt = serviceDateTime(BASE_DATE, '19:10');
    expect(generateOperationalTasks(state, BASE_DATE, reservation.cleaningCompletedAt).some((task) => task.kind === 'prepare-split')).toBe(true);

    reservation.status = 'assigned';
    reservation.assignment.region = 'outside';
    reservation.assignment.tableIds = ['301'];
    reservation.assignment.optionId = 'table:301';
    state.serviceDays[BASE_DATE].weather = 'rain';
    state.serviceDays[BASE_DATE].outsideOpen = false;
    expect(generateOperationalTasks(state, BASE_DATE, serviceDateTime(BASE_DATE, '13:59')).some((task) => task.kind === 'rain-conflict')).toBe(false);
    expect(generateOperationalTasks(state, BASE_DATE, serviceDateTime(BASE_DATE, '14:00')).some((task) => task.kind === 'rain-conflict')).toBe(true);

    state.serviceDays[BASE_DATE].rush.status = 'reconciliation-needed';
    expect(generateOperationalTasks(state, BASE_DATE, BASE_NOW).some((task) => task.kind === 'reconciliation')).toBe(true);
  });

  it('suppresses native notifications during Rush mode', () => {
    const state = createInitialState(BASE_NOW);
    ensureServiceDay(state, BASE_DATE);
    state.settings.nativeNotificationsEnabled = true;
    state.ui.selectedServiceDate = BASE_DATE;
    state.reservations = [assignedReservation()];
    const now = serviceDateTime(BASE_DATE, '17:45');
    const tasks = generateOperationalTasks(state, BASE_DATE, now);
    expect(tasksReadyForNotification(state, tasks, now).length).toBeGreaterThan(0);
    state.serviceDays[BASE_DATE].rush.status = 'active';
    expect(tasksReadyForNotification(state, tasks, now)).toEqual([]);
  });
});
