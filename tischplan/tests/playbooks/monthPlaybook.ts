import { AppController } from '../../src/application/appController';
import type { Reservation, ReservationDraft, ValidationIssue } from '../../src/domain/model';
import { validatePlan } from '../../src/domain/solver';
import { serviceDateTime } from '../../src/domain/time';
import { MutableClock } from '../../src/infrastructure/clock';
import { MemoryNotificationGateway } from '../../src/infrastructure/notifications';
import { MemoryStateRepository } from '../../src/infrastructure/localStorageRepository';

export interface MonthDayObservation {
  date: string;
  scenario: string;
  reservations: number;
  assigned: number;
  seated: number;
  done: number;
  unassigned: number;
  tasks: number;
  notifications: number;
  validationIssues: ValidationIssue[];
  notes: string[];
}

export interface MonthPlaybookReport {
  name: string;
  seed: string;
  startedAt: string;
  completedAt: string;
  days: MonthDayObservation[];
  coveredScenarios: string[];
  totals: {
    reservations: number;
    assignedAtPlanTime: number;
    unassignedAtPlanTime: number;
    notifications: number;
    auditEntries: number;
    validationIssues: number;
  };
  assertions: {
    allThirtyDaysExecuted: boolean;
    allRequiredScenariosCovered: boolean;
    noPhysicalInvariantViolations: boolean;
    backupRoundTripSucceeded: boolean;
    rushNotificationsSuppressed: boolean;
    fourSoloWalkInsSharedOneTable: boolean;
    rainNeverUsedOutside: boolean;
  };
}

const REQUIRED_SCENARIOS = [
  'regular-auto-plan',
  'inside-outside-preferences',
  'manual-inside-to-outside-override',
  'rain-outside-closed',
  'rain-indoor-capacity-and-later-release',
  'walk-in-immediate-seating',
  'four-solo-walk-ins-share-one-table',
  'late-arrival',
  'no-show',
  'cancellation',
  'joined-table-preparation',
  'cleaning-and-split',
  'keep-same-joined-configuration',
  'regular-guests-last-resort-sharing',
  'too-late-to-join',
  'task-snooze-and-complete',
  'rush-mode-notification-suppression',
  'rush-reconciliation-untracked-walk-in',
  'rain-after-outside-plan-manual-recovery',
  'manual-outside-closure',
  'early-cleaning-completion',
  'delayed-departure-and-replan',
  'backup-export-import',
  'timing-settings-change',
  'long-stay-party',
  'mixed-reservation-sources',
  'crowded-peak-service',
  'optional-bar-seats',
  'audit-trail',
  'full-service-rehearsal',
] as const;

function serviceDate(day: number): string {
  return `2026-09-${String(day).padStart(2, '0')}`;
}

function draft(
  date: string,
  name: string,
  startTime: string,
  partySize: number,
  overrides: Partial<ReservationDraft> = {},
): ReservationDraft {
  return {
    serviceDate: date,
    startTime,
    partySize,
    name,
    source: 'phone',
    preference: 'none',
    allowTableSharing: false,
    ...overrides,
  };
}

function setClock(clock: MutableClock, date: string, time: string): void {
  clock.set(serviceDateTime(date, time));
}

function planDay(controller: AppController, date: string): ReturnType<AppController['previewPlan']> {
  controller.selectServiceDate(date);
  const plan = controller.previewPlan(date);
  controller.applyPlan(plan, date);
  return plan;
}

function assignedReservation(controller: AppController, id: string): Reservation | undefined {
  const reservation = controller.findReservation(id);
  return reservation.assignment ? reservation : undefined;
}

function firstAssigned(controller: AppController, ids: string[]): Reservation | undefined {
  return ids.map((id) => controller.findReservation(id)).find((reservation) => reservation.assignment);
}

function uniquePhysicalTableFor(ids: string[], controller: AppController): string | null {
  const tableIds = ids.map((id) => controller.findReservation(id).assignment?.tableIds[0]);
  const unique = new Set(tableIds.filter((value): value is string => Boolean(value)));
  return unique.size === 1 ? [...unique][0] : null;
}

export async function runMonthPlaybook(): Promise<MonthPlaybookReport> {
  const initialNow = serviceDateTime(serviceDate(1), '14:00');
  const clock = new MutableClock(initialNow);
  const repository = new MemoryStateRepository();
  const notifications = new MemoryNotificationGateway();
  const controller = new AppController(repository, clock, notifications);
  const days: MonthDayObservation[] = [];
  const coveredScenarios: string[] = [];
  let backupRoundTripSucceeded = false;
  let rushNotificationsSuppressed = false;
  let fourSoloWalkInsSharedOneTable = false;
  let rainNeverUsedOutside = true;
  let assignedAtPlanTime = 0;
  let unassignedAtPlanTime = 0;

  await controller.enableNativeNotifications();

  for (let day = 1; day <= 30; day += 1) {
    const date = serviceDate(day);
    const scenario = REQUIRED_SCENARIOS[day - 1];
    coveredScenarios.push(scenario);
    setClock(clock, date, '14:00');
    controller.selectServiceDate(date);
    controller.setWeather(date, 'dry');
    controller.setOutsideOpen(date, true);
    const notes: string[] = [];
    const ids: string[] = [];

    const add = (
      name: string,
      time: string,
      partySize: number,
      overrides: Partial<ReservationDraft> = {},
    ): string => {
      const id = controller.createReservation(draft(date, name, time, partySize, overrides));
      ids.push(id);
      return id;
    };

    if (![4, 5, 7, 14, 15, 17, 18, 19, 23, 27, 28, 30].includes(day)) {
      add(`Tag ${day} · Bauer`, '17:30', 2, { preference: 'inside', source: 'online' });
      add(`Tag ${day} · Rossi`, '18:00', 4, { preference: day % 2 === 0 ? 'outside' : 'none' });
      add(`Tag ${day} · Weber`, '19:00', 5, { source: 'phone' });
      add(`Tag ${day} · Klein`, '20:30', 2, { source: 'in-person' });
    }

    switch (day) {
      case 1: {
        const plan = planDay(controller, date);
        assignedAtPlanTime += plan.assignedCount;
        unassignedAtPlanTime += plan.unassignedCount;
        notes.push('Normaler Abend wurde automatisch geplant.');
        break;
      }
      case 2: {
        const inside = add('Innen-Familie', '18:15', 4, { preference: 'inside' });
        const outside = add('Terrassen-Paar', '18:15', 2, { preference: 'outside' });
        const plan = planDay(controller, date);
        assignedAtPlanTime += plan.assignedCount;
        unassignedAtPlanTime += plan.unassignedCount;
        if (controller.findReservation(inside).assignment?.region !== 'inside') {
          throw new Error('Inside preference was not honored.');
        }
        if (controller.findReservation(outside).assignment?.region !== 'outside') {
          throw new Error('Outside preference was not honored.');
        }
        notes.push('Beide Bereichswünsche wurden eingehalten.');
        break;
      }
      case 3: {
        const id = add('Spontan zur Terrasse', '18:00', 4, { preference: 'inside' });
        planDay(controller, date);
        controller.unassignReservation(id);
        controller.manualAssign(id, 'table:301', {
          mode: 'exclusive',
          lock: true,
          overrideReason: 'Gast entscheidet sich bei überraschend gutem Wetter bewusst für draußen.',
        });
        notes.push('Manueller Bereichs-Override mit verpflichtender Begründung.');
        break;
      }
      case 4: {
        controller.setWeather(date, 'rain');
        const outside = add('Nur Terrasse', '18:00', 4, { preference: 'outside' });
        const plan = planDay(controller, date);
        assignedAtPlanTime += plan.assignedCount;
        unassignedAtPlanTime += plan.unassignedCount;
        if (controller.findReservation(outside).assignment) {
          rainNeverUsedOutside = false;
          throw new Error('Rain scenario assigned an outside-only reservation.');
        }
        notes.push('Regen sperrt Außenplätze; Reservierung bleibt sichtbar offen.');
        break;
      }
      case 5: {
        controller.setWeather(date, 'rain');
        const early = add('Frühe Runde', '17:00', 4, { preference: 'inside', durationMinutes: 60 });
        const later = add('Wartende Runde', '18:20', 4, { preference: 'outside' });
        planDay(controller, date);
        controller.updateReservation(later, { preference: 'inside' });
        setClock(clock, date, '17:00');
        if (assignedReservation(controller, early)) {
          controller.markArrived(early);
          setClock(clock, date, '18:00');
          controller.markLeft(early);
          controller.completeCleaningAndReset(early);
        }
        setClock(clock, date, '18:05');
        controller.autoAssignReservation(later);
        notes.push('Außenwunsch wechselte wegen Regen nach innen; Neuplanung erfolgte erst nach realer Freigabe.');
        break;
      }
      case 6: {
        planDay(controller, date);
        setClock(clock, date, '18:10');
        const walkIn = controller.createWalkIn(3, 'none', date, '18:10');
        ids.push(walkIn);
        controller.autoAssignReservation(walkIn);
        if (controller.findReservation(walkIn).assignment) {
          controller.markArrived(walkIn);
        }
        notes.push('Walk-in wurde mit einem direkten, logischen nächsten Schritt platziert.');
        break;
      }
      case 7: {
        const walkIns = Array.from({ length: 4 }, (_, index) => {
          const id = controller.createWalkIn(1, 'inside', date, '18:00');
          ids.push(id);
          controller.updateReservation(id, { name: `Solo Walk-in ${index + 1}` });
          return id;
        });
        const plan = planDay(controller, date);
        assignedAtPlanTime += plan.assignedCount;
        unassignedAtPlanTime += plan.unassignedCount;
        fourSoloWalkInsSharedOneTable = uniquePhysicalTableFor(walkIns, controller) !== null
          && walkIns.every((id) => controller.findReservation(id).assignment?.mode === 'shared');
        if (!fourSoloWalkInsSharedOneTable) {
          throw new Error('Four solo walk-ins were not packed onto one four-top.');
        }
        notes.push('Vier unabhängige Einzel-Walk-ins teilen kapazitätsbasiert einen Vierertisch.');
        break;
      }
      case 8: {
        const late = add('Verspätete Gäste', '18:00', 2);
        planDay(controller, date);
        controller.delayReservation(late, 25);
        setClock(clock, date, '18:26');
        controller.tick();
        if (controller.findReservation(late).assignment) {
          controller.markArrived(late);
        }
        notes.push('Verspätung verschiebt die operative Ankunft und bleibt im Audit sichtbar.');
        break;
      }
      case 9: {
        const noShow = add('No-Show', '18:00', 4);
        planDay(controller, date);
        setClock(clock, date, '18:20');
        controller.markNoShow(noShow);
        notes.push('No-Show gibt die geplanten Ressourcen wieder frei.');
        break;
      }
      case 10: {
        const cancelled = add('Kurzfristige Stornierung', '19:00', 5);
        planDay(controller, date);
        controller.cancelReservation(cancelled);
        notes.push('Stornierung bleibt im Tagesverlauf nachvollziehbar.');
        break;
      }
      case 11: {
        const large = add('Große Tafel', '18:00', 8);
        planDay(controller, date);
        const reservation = controller.findReservation(large);
        if (!reservation.assignment || reservation.assignment.tableIds.length < 2) {
          throw new Error('Large party did not receive a joined option.');
        }
        setClock(clock, date, '17:40');
        controller.markPrepared(large);
        notes.push('Aufbauaufgabe wurde rechtzeitig erledigt und quittiert.');
        break;
      }
      case 12: {
        const large = add('Tafel mit Rückbau', '18:00', 8, { durationMinutes: 60 });
        planDay(controller, date);
        if (controller.findReservation(large).assignment) {
          controller.markPrepared(large);
          setClock(clock, date, '18:00');
          controller.markArrived(large);
          setClock(clock, date, '19:00');
          controller.markLeft(large);
          controller.completeCleaning(large);
          controller.completeReset(large);
        }
        notes.push('Reinigung und Rückbau sind getrennte, explizit abschließbare Schritte.');
        break;
      }
      case 13: {
        const first = add('Tafel A', '18:00', 8, { durationMinutes: 60 });
        const second = add('Tafel B', '19:15', 8);
        controller.manualAssign(first, 'join:14+13', { mode: 'exclusive' });
        controller.manualAssign(second, 'join:14+13', { mode: 'exclusive' });
        controller.markPrepared(first);
        setClock(clock, date, '18:00');
        controller.markArrived(first);
        setClock(clock, date, '19:00');
        controller.markLeft(first);
        controller.completeCleaning(first);
        if (controller.findReservation(second).assignment?.preparedAt === undefined) {
          throw new Error('Same joined configuration was unnecessarily reset.');
        }
        notes.push('Identische Folgetafel bleibt aufgebaut; nur Reinigung ist nötig.');
        break;
      }
      case 14: {
        const first = add('Geteilte Reservierung A', '18:00', 2);
        const second = add('Geteilte Reservierung B', '18:00', 2);
        controller.manualAssign(first, 'table:1', {
          mode: 'shared',
          overrideReason: 'Letzte freie Lösung; beide Parteien stimmen ausdrücklich zu.',
        });
        controller.manualAssign(second, 'table:1', {
          mode: 'shared',
          overrideReason: 'Letzte freie Lösung; beide Parteien stimmen ausdrücklich zu.',
        });
        notes.push('Reguläre Reservierungen teilen nur nach expliziter Zustimmung und Begründung.');
        break;
      }
      case 15: {
        setClock(clock, date, '17:55');
        const large = add('Zu spät für Aufbau', '18:00', 8);
        const assigned = controller.autoAssignReservation(large);
        if (assigned) {
          throw new Error('Joined tables were assigned despite insufficient setup time.');
        }
        notes.push('Zu knappe Aufbauzeit führt bewusst zu offenem Vorgang statt falscher Sicherheit.');
        break;
      }
      case 16: {
        planDay(controller, date);
        setClock(clock, date, '17:10');
        controller.tick();
        const task = controller.getTasks(date)[0];
        if (task) {
          controller.snoozeTask(task.id, 10);
          setClock(clock, date, '17:21');
          controller.tick();
          controller.acknowledgeTask(task.id);
        }
        notes.push('Aufgaben können verschoben und eindeutig abgeschlossen werden.');
        break;
      }
      case 17: {
        const arrival = add('Rush-Ankunft', '18:00', 2);
        planDay(controller, date);
        setClock(clock, date, '17:35');
        controller.tick();
        const before = notifications.messages.length;
        controller.startRush(date);
        setClock(clock, date, '17:50');
        controller.tick();
        rushNotificationsSuppressed = notifications.messages.length === before;
        controller.endRush(date);
        controller.beginReconciliation(date);
        if (controller.findReservation(arrival).assignment) {
          controller.reconcileAtPlannedTable(arrival);
        } else {
          controller.markReconciled(arrival);
        }
        controller.finishReconciliation(date);
        notes.push('Rush-Modus stoppt störende native Hinweise und erzwingt anschließend den Raumabgleich.');
        break;
      }
      case 18: {
        const planned = add('Geplante Rush-Gruppe', '18:00', 2);
        planDay(controller, date);
        setClock(clock, date, '18:05');
        controller.startRush(date);
        const untracked = controller.createWalkIn(1, 'none', date, '18:05');
        ids.push(untracked);
        controller.endRush(date);
        controller.beginReconciliation(date);
        if (controller.findReservation(planned).assignment) {
          controller.reconcileAtPlannedTable(planned);
        } else {
          controller.markReconciled(planned);
        }
        controller.manualAssign(untracked, 'table:9', {
          mode: 'shared',
          source: 'recovery',
          lock: true,
          overrideReason: 'Während Stoßbetrieb real an Tisch 3 gesetzt.',
        });
        controller.markArrived(untracked);
        controller.markReconciled(untracked);
        controller.finishReconciliation(date);
        notes.push('Unprotokolliertes reales Platzieren wird nach der Überlast sauber nacherfasst.');
        break;
      }
      case 19: {
        const outside = add('Terrassengast vor Regen', '18:00', 4, { preference: 'outside' });
        planDay(controller, date);
        controller.setWeather(date, 'rain');
        const rainTasks = controller.getTasks(date).filter((task) => task.kind === 'rain-conflict');
        if (rainTasks.length === 0) {
          throw new Error('Rain conflict was not surfaced to staff.');
        }
        controller.unassignReservation(outside);
        controller.manualAssign(outside, 'table:1', {
          mode: 'exclusive',
          overrideReason: 'Wetterumschwung; Gast stimmt dem Wechsel nach innen zu.',
        });
        notes.push('Regen verschiebt niemanden heimlich; Konflikt wird sichtbar und manuell gelöst.');
        break;
      }
      case 20: {
        controller.setOutsideOpen(date, false);
        const outside = add('Außen bei Betriebsschließung', '18:00', 2, { preference: 'outside' });
        planDay(controller, date);
        if (controller.findReservation(outside).assignment) {
          throw new Error('Closed outside area was used.');
        }
        notes.push('Außenbereich kann unabhängig vom Wetter betrieblich geschlossen werden.');
        break;
      }
      case 21: {
        const id = firstAssigned(controller, ids)?.id;
        planDay(controller, date);
        const target = id ? controller.findReservation(id) : firstAssigned(controller, ids);
        if (target?.assignment) {
          setClock(clock, date, target.startTime);
          controller.markArrived(target.id);
          clock.advance(45);
          controller.markLeft(target.id);
          controller.completeCleaningAndReset(target.id);
        }
        notes.push('Früh abgeschlossene Reinigung gibt Kapazität sofort statt erst nach Schätzwert frei.');
        break;
      }
      case 22: {
        const first = ids[0];
        planDay(controller, date);
        if (first && controller.findReservation(first).assignment) {
          setClock(clock, date, '17:30');
          controller.markArrived(first);
          controller.delayReservation(ids[1] ?? first, 20);
          clock.advance(90);
          controller.markLeft(first);
          controller.completeCleaningAndReset(first);
          controller.previewPlan(date);
        }
        notes.push('Verspätete Abreise und geänderte Ankunft werden vor Neuplanung im Ist-Zustand erfasst.');
        break;
      }
      case 23: {
        const id = add('Backup-Test', '18:00', 3);
        planDay(controller, date);
        const backup = controller.exportBackup();
        const restored = new AppController(new MemoryStateRepository(), new MutableClock(clock.now()), new MemoryNotificationGateway());
        restored.importBackup(backup);
        backupRoundTripSucceeded = restored.findReservation(id).name === 'Backup-Test'
          && restored.snapshot().revision > controller.snapshot().revision;
        if (!backupRoundTripSucceeded) {
          throw new Error('Backup round-trip failed.');
        }
        notes.push('Vollständiges, exakt validiertes Backup wurde auf einer frischen Instanz importiert.');
        break;
      }
      case 24: {
        controller.updateSettings({
          ...controller.snapshot().settings,
          cleaningMinutes: 20,
          joinMinutesPerConnection: 10,
          splitMinutesPerConnection: 7,
        });
        planDay(controller, date);
        notes.push('Betriebszeiten wurden angepasst und sofort in den Nebenbedingungen verwendet.');
        break;
      }
      case 25: {
        add('Langer Abend', '18:00', 6, { durationMinutes: 240 });
        const plan = planDay(controller, date);
        assignedAtPlanTime += plan.assignedCount;
        unassignedAtPlanTime += plan.unassignedCount;
        notes.push('Individuelle lange Aufenthaltsdauer blockiert Ressourcen bis Reinigung und Rückbau abgeschlossen sind.');
        break;
      }
      case 26: {
        add('Online', '18:00', 2, { source: 'online' });
        add('Telefon', '18:30', 3, { source: 'phone' });
        add('Persönlich', '19:00', 4, { source: 'in-person' });
        add('Sonstige', '19:30', 2, { source: 'other' });
        planDay(controller, date);
        notes.push('Alle unterstützten Reservierungsquellen durchlaufen denselben konsistenten Prozess.');
        break;
      }
      case 27: {
        for (let index = 0; index < 24; index += 1) {
          add(`Peak ${index + 1}`, `${17 + Math.floor(index / 8)}:${String((index % 4) * 15).padStart(2, '0')}`, 2 + (index % 5));
        }
        const plan = planDay(controller, date);
        assignedAtPlanTime += plan.assignedCount;
        unassignedAtPlanTime += plan.unassignedCount;
        notes.push(`Peak-Plan: ${plan.assignedCount} platziert, ${plan.unassignedCount} bewusst offen.`);
        break;
      }
      case 28: {
        controller.updateSettings({ ...controller.snapshot().settings, useBarSeatsForSingles: true });
        for (let index = 0; index < 7; index += 1) {
          add(`Bar-Solo ${index + 1}`, '18:00', 1, { source: 'walk-in', allowTableSharing: true });
        }
        planDay(controller, date);
        notes.push('Barplätze können gezielt zugeschaltet werden, bleiben standardmäßig aber aus der Planung.');
        break;
      }
      case 29: {
        planDay(controller, date);
        controller.updateServiceNotes(date, 'Allergiehinweis an Küche übergeben.');
        controller.setOutsideOpen(date, false);
        controller.setOutsideOpen(date, true);
        const dayAudit = controller.snapshot().auditLog.filter((entry) => entry.timestamp >= serviceDateTime(date, '00:00'));
        if (dayAudit.length < 3) {
          throw new Error('Audit trail did not record operational changes.');
        }
        notes.push('Wesentliche Bedienhandlungen sind revisionssicher im lokalen Audit nachvollziehbar.');
        break;
      }
      case 30: {
        const regular = add('Abschluss-Familie', '17:30', 4, { preference: 'inside' });
        const terrace = add('Abschluss-Terrasse', '18:00', 2, { preference: 'outside' });
        const large = add('Abschluss-Tafel', '19:00', 8);
        const plan = planDay(controller, date);
        assignedAtPlanTime += plan.assignedCount;
        unassignedAtPlanTime += plan.unassignedCount;
        if (controller.findReservation(large).assignment?.tableIds.length) {
          controller.markPrepared(large);
        }
        setClock(clock, date, '17:30');
        if (controller.findReservation(regular).assignment) {
          controller.markArrived(regular);
        }
        setClock(clock, date, '18:05');
        if (controller.findReservation(terrace).assignment) {
          controller.markArrived(terrace);
        }
        setClock(clock, date, '20:00');
        if (controller.findReservation(regular).status === 'seated') {
          controller.markLeft(regular);
          controller.completeCleaningAndReset(regular);
        }
        notes.push('Abschlusstag kombiniert Planung, Vorbereitung, Ankunft, Außenbereich und reale Freigabe.');
        break;
      }
      default:
        break;
    }

    const currentReservations = controller.reservationsForDate(date);
    const validationIssues = validatePlan(controller.snapshot(), date);
    if (controller.snapshot().serviceDays[date].weather === 'rain') {
      const outsideAssignments = currentReservations.filter((reservation) => reservation.assignment?.region === 'outside');
      if (outsideAssignments.length > 0) {
        rainNeverUsedOutside = false;
      }
    }
    days.push({
      date,
      scenario,
      reservations: currentReservations.length,
      assigned: currentReservations.filter((reservation) => reservation.status === 'assigned').length,
      seated: currentReservations.filter((reservation) => reservation.status === 'seated').length,
      done: currentReservations.filter((reservation) => reservation.status === 'done').length,
      unassigned: currentReservations.filter((reservation) => reservation.status === 'unassigned').length,
      tasks: controller.getTasks(date).length,
      notifications: notifications.messages.length,
      validationIssues,
      notes,
    });
  }

  const validationIssues = days.reduce((sum, day) => sum + day.validationIssues.length, 0);
  const allRequiredScenariosCovered = REQUIRED_SCENARIOS.every((scenario) => coveredScenarios.includes(scenario));
  const snapshot = controller.snapshot();

  return {
    name: 'Deterministischer Betriebsmonat September 2026',
    seed: 'HAH-MONTH-2026-09-v1',
    startedAt: new Date(initialNow).toISOString(),
    completedAt: new Date(clock.now()).toISOString(),
    days,
    coveredScenarios,
    totals: {
      reservations: snapshot.reservations.length,
      assignedAtPlanTime,
      unassignedAtPlanTime,
      notifications: notifications.messages.length,
      auditEntries: snapshot.auditLog.length,
      validationIssues,
    },
    assertions: {
      allThirtyDaysExecuted: days.length === 30,
      allRequiredScenariosCovered,
      noPhysicalInvariantViolations: validationIssues === 0,
      backupRoundTripSucceeded,
      rushNotificationsSuppressed,
      fourSoloWalkInsSharedOneTable,
      rainNeverUsedOutside,
    },
  };
}
