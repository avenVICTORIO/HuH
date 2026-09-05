import { describe, expect, it } from 'vitest';
import { AppController } from '../../src/application/appController';
import { serializeBackup } from '../../src/domain/backup';
import { buildTableOptions } from '../../src/domain/tableCatalog';
import { serviceDateTime } from '../../src/domain/time';
import { validateOperationalState } from '../../src/domain/validation';
import { BASE_DATE, createHarness, draft } from '../helpers';

describe('application controller', () => {
  it('persists every committed change and restores it from the repository', () => {
    const { controller, repository, clock, notifications } = createHarness();
    const id = controller.createReservation(draft({ name: 'Persistiert' }));
    const restored = new AppController(repository, clock, notifications);
    expect(restored.findReservation(id).name).toBe('Persistiert');
  });

  it('requires an explicit reason for a preference override', () => {
    const { controller } = createHarness();
    const id = controller.createReservation(draft({ name: 'Innenwunsch', preference: 'inside' }));
    expect(() => controller.manualAssign(id, 'table:301', { mode: 'exclusive' })).toThrow(/Grund/);
    controller.manualAssign(id, 'table:301', { mode: 'exclusive', overrideReason: 'Gast möchte wegen Sonne spontan nach draußen' });
    expect(controller.findReservation(id).assignment?.region).toBe('outside');
  });

  it('runs the complete seated, cleaning, and reset lifecycle', () => {
    const { controller, clock } = createHarness();
    const id = controller.createReservation(draft({ name: 'Große Runde', partySize: 8 }));
    const joined = buildTableOptions(false).find((option) => option.id === 'join:14+13')!;
    controller.manualAssign(id, joined.id, { mode: 'exclusive' });
    controller.markPrepared(id);
    clock.set(serviceDateTime(BASE_DATE, '18:00'));
    controller.markArrived(id);
    clock.set(serviceDateTime(BASE_DATE, '19:00'));
    controller.markLeft(id);
    controller.completeCleaning(id);
    expect(controller.findReservation(id).status).toBe('cleaning');
    controller.completeReset(id);
    expect(controller.findReservation(id).status).toBe('done');
  });

  it('keeps a joined setup when the next reservation uses the same configuration', () => {
    const { controller, clock } = createHarness();
    const first = controller.createReservation(draft({ name: 'Erste', partySize: 8, durationMinutes: 60 }));
    const second = controller.createReservation(draft({ name: 'Zweite', partySize: 8, startTime: '19:15' }));
    controller.manualAssign(first, 'join:14+13', { mode: 'exclusive' });
    controller.manualAssign(second, 'join:14+13', { mode: 'exclusive' });
    controller.markPrepared(first);
    clock.set(serviceDateTime(BASE_DATE, '18:00'));
    controller.markArrived(first);
    clock.set(serviceDateTime(BASE_DATE, '19:00'));
    controller.markLeft(first);
    controller.completeCleaning(first);
    expect(controller.findReservation(first).status).toBe('done');
    expect(controller.findReservation(second).assignment?.preparedAt).toBeDefined();
  });

  it('supports Rush mode and deterministic reconciliation', () => {
    const { controller } = createHarness();
    const id = controller.createReservation(draft({ name: 'Rush-Gast' }));
    controller.autoAssignReservation(id);
    controller.startRush();
    expect(controller.snapshot().serviceDays[BASE_DATE].rush.status).toBe('active');
    controller.endRush();
    controller.beginReconciliation();
    controller.reconcileAtPlannedTable(id);
    expect(controller.reconciliationPending()).toHaveLength(0);
    controller.finishReconciliation();
    expect(controller.snapshot().serviceDays[BASE_DATE].rush.status).toBe('off');
  });

  it('does not offer future arrivals as reconciliation actions before they are due', () => {
    const { controller, clock } = createHarness();
    const id = controller.createReservation(draft({ name: 'Spätere Runde', startTime: '18:00' }));
    controller.autoAssignReservation(id);
    controller.startRush();
    controller.endRush();
    controller.beginReconciliation();

    clock.set(serviceDateTime(BASE_DATE, '17:59'));
    expect(controller.reconciliationPending()).toHaveLength(0);
    clock.set(serviceDateTime(BASE_DATE, '18:00'));
    expect(controller.reconciliationPending().map((reservation) => reservation.id)).toEqual([id]);
  });

  it('offers Auto-Plan only while at least one reservation can still be planned', () => {
    const { controller } = createHarness();
    expect(controller.hasPlannableReservations()).toBe(false);
    const id = controller.createReservation(draft({ name: 'Planbar' }));
    expect(controller.hasPlannableReservations()).toBe(true);
    controller.manualAssign(id, 'table:1', { mode: 'exclusive' });
    expect(controller.hasPlannableReservations()).toBe(false);
  });

  it('lists only reservations with a valid choice for the selected table', () => {
    const { controller } = createHarness();
    const fittingId = controller.createReservation(draft({ name: 'Passend', partySize: 2 }));
    controller.createReservation(draft({ name: 'Zu groß', partySize: 50 }));
    expect(controller.placeableUnassignedReservationsAtTable('3').map((reservation) => reservation.id)).toEqual([fittingId]);
  });

  it('creates a directly assigned table reservation atomically and rejects a conflict', () => {
    const { controller } = createHarness();
    const firstId = controller.createReservationAtTable(draft({ name: 'Direkt', durationMinutes: 60 }), '3');
    const first = controller.findReservation(firstId);
    expect(first.status).toBe('assigned');
    expect(first.assignment?.optionId).toBe('table:3');
    expect(first.assignment?.locked).toBe(true);

    expect(() => controller.createReservationAtTable(draft({ name: 'Kollision', durationMinutes: 60 }), '3'))
      .toThrow(/kollidiert/);
    expect(controller.reservationsForDate()).toHaveLength(1);
  });

  it('stores a forecast location without changing operational weather decisions', () => {
    const { controller } = createHarness();
    controller.updateWeatherLocation({ label: 'Berlin', latitude: 52.52, longitude: 13.405 });
    expect(controller.snapshot().settings.weatherLocation?.label).toBe('Berlin');
    expect(controller.snapshot().serviceDays[BASE_DATE].weather).toBe('dry');
    expect(controller.snapshot().serviceDays[BASE_DATE].outsideOpen).toBe(true);
  });

  it('replaces operational data with a valid deterministic demo month and can reset everything', () => {
    const { controller } = createHarness();
    controller.updateWeatherLocation({ label: 'Berlin', latitude: 52.52, longitude: 13.405 });
    controller.createReservation(draft({ name: 'Wird ersetzt' }));
    const summary = controller.generateDemoMonth();
    const demo = controller.snapshot();
    expect(summary.reservations).toBeGreaterThan(300);
    expect(summary.joinedReservations).toBe(10);
    expect(Object.keys(demo.serviceDays)).toHaveLength(30);
    expect(demo.reservations.some((reservation) => reservation.name === 'Wird ersetzt')).toBe(false);
    expect(demo.settings.weatherLocation?.label).toBe('Berlin');
    expect(demo.reservations.every((reservation) => (
      reservation.assignment?.region !== 'outside'
      || demo.serviceDays[reservation.serviceDate].weather !== 'rain'
    ))).toBe(true);
    const joinedReservations = demo.reservations.filter((reservation) => (
      (reservation.assignment?.tableIds.length ?? 0) > 1
    ));
    expect(joinedReservations).toHaveLength(10);
    expect(new Set(joinedReservations.map((reservation) => reservation.assignment?.optionId)).size)
      .toBeGreaterThanOrEqual(3);
    expect(joinedReservations.every((reservation) => reservation.partySize >= 8)).toBe(true);
    expect(validateOperationalState(demo)).toEqual([]);

    controller.resetAll();
    expect(controller.snapshot().reservations).toHaveLength(0);
    expect(controller.snapshot().settings.weatherLocation).toBeNull();
  });

  it('round-trips an exact-schema backup and rejects legacy schemas', () => {
    const { controller } = createHarness();
    controller.createReservation(draft({ name: 'Backup' }));
    const backup = controller.exportBackup();
    controller.resetAll();
    controller.importBackup(backup);
    expect(controller.reservationsForDate()).toHaveLength(1);
    const legacy = JSON.parse(serializeBackup(controller.snapshot()));
    legacy.schemaVersion = 0;
    expect(() => controller.importBackup(JSON.stringify(legacy))).toThrow(/schemaVersion/);
  });

  it('sanitizes settings before persistence', () => {
    const { controller } = createHarness();
    const settings = controller.snapshot().settings;
    settings.openingHours.tuesday = { intervals: [
      { opensAt: '09:00', closesAt: '12:00' },
      { opensAt: '16:00', closesAt: '22:00' },
    ] };
    controller.updateSettings({ ...settings, cleaningMinutes: 999, solverRuntimeMilliseconds: 1 });
    expect(controller.snapshot().settings.cleaningMinutes).toBe(120);
    expect(controller.snapshot().settings.solverRuntimeMilliseconds).toBe(25);
    expect(controller.snapshot().settings.openingHours.tuesday.intervals).toEqual([
      { opensAt: '09:00', closesAt: '12:00' },
      { opensAt: '16:00', closesAt: '22:00' },
    ]);
    controller.updateSettings({ ...controller.snapshot().settings, solverRuntimeMilliseconds: 5_000 });
    expect(controller.snapshot().settings.solverRuntimeMilliseconds).toBe(1_000);
  });
});
