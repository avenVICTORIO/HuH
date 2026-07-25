import type { AppState, OperationalTask, Reservation, TableOption } from '../domain/model';
import { buildTableOptions, formatTableList } from '../domain/tableCatalog';
import { optionForReservation, sameTableIds } from '../domain/solver';
import {
  MINUTE_MS,
  formatClock,
  reservationCleaningEnd,
  reservationCleaningStart,
  reservationStart,
} from '../domain/time';

const PLANNING_HORIZON_MINUTES = 4 * 60;

function assignmentOption(state: AppState, reservation: Reservation): TableOption | null {
  return optionForReservation(reservation, buildTableOptions(true));
}

function needsSplitAfter(state: AppState, reservation: Reservation, option: TableOption): boolean {
  if (option.connectionCount === 0 || reservation.resetCompletedAt !== undefined) {
    return false;
  }
  const next = state.reservations
    .filter((candidate) => (
      candidate.id !== reservation.id
      && candidate.serviceDate === reservation.serviceDate
      && candidate.assignment
      && !['done', 'no-show', 'cancelled'].includes(candidate.status)
      && reservationStart(candidate) >= reservationCleaningEnd(reservation, state.settings)
      && candidate.assignment.tableIds.some((tableId) => option.tableIds.includes(tableId))
    ))
    .sort((left, right) => reservationStart(left) - reservationStart(right))[0];

  return !next || !sameTableIds(next.assignment?.tableIds ?? [], option.tableIds);
}

function taskVisibleByAcknowledgement(state: AppState, task: OperationalTask, now: number): boolean {
  const acknowledgement = state.taskAcknowledgements[task.id];
  if (acknowledgement?.completedAt !== undefined) {
    return false;
  }
  if (acknowledgement?.snoozedUntil !== undefined && acknowledgement.snoozedUntil > now) {
    return false;
  }
  return true;
}

export function generateOperationalTasks(
  state: AppState,
  serviceDate: string,
  now = Date.now(),
): OperationalTask[] {
  const tasks: OperationalTask[] = [];
  const day = state.serviceDays[serviceDate];

  if (day?.rush.status === 'active') {
    tasks.push({
      id: `reconciliation:rush:${serviceDate}`,
      kind: 'reconciliation',
      priority: 'critical',
      title: 'Stoßbetrieb aktiv',
      detail: 'Freies Arbeiten ist erlaubt. Danach den Raumzustand abgleichen.',
      dueAt: now,
      actionLabel: 'Stoßbetrieb beenden',
    });
  } else if (day?.rush.status === 'reconciliation-needed' || day?.rush.status === 'reconciling') {
    tasks.push({
      id: `reconciliation:needed:${serviceDate}`,
      kind: 'reconciliation',
      priority: 'critical',
      title: 'Raumzustand abgleichen',
      detail: 'Tatsächliche Sitzplätze, Abgänge, No-Shows und nicht erfasste Walk-ins bestätigen.',
      dueAt: day.rush.endedAt ?? now,
      actionLabel: 'Abgleich öffnen',
    });
  }

  const reservations = state.reservations.filter((reservation) => (
    reservation.serviceDate === serviceDate
    && !['cancelled', 'no-show', 'done'].includes(reservation.status)
  ));

  for (const reservation of reservations) {
    const start = reservationStart(reservation);
    const option = assignmentOption(state, reservation);
    const tables = reservation.assignment?.tableIds ?? [];
    const tableLabel = tables.length > 0 ? formatTableList(tables) : 'noch ohne Tisch';
    const withinPlanningHorizon = start - now <= PLANNING_HORIZON_MINUTES * MINUTE_MS;

    if (
      withinPlanningHorizon
      && option?.region === 'outside'
      && day
      && (day.weather === 'rain' || !day.outsideOpen)
    ) {
      tasks.push({
        id: `rain-conflict:${reservation.id}`,
        kind: 'rain-conflict',
        priority: 'critical',
        title: `${reservation.name} kann nicht draußen sitzen`,
        detail: `${formatClock(start)} · ${reservation.partySize} Pers. · Tisch ${tableLabel}`,
        dueAt: now,
        reservationId: reservation.id,
        tableIds: tables,
        actionLabel: 'Neu platzieren',
      });
    }

    if (reservation.status === 'unassigned') {
      const dueAt = start - state.settings.preparationNotificationLeadMinutes * MINUTE_MS;
      if (withinPlanningHorizon) {
        tasks.push({
          id: `unassigned-upcoming:${reservation.id}`,
          kind: 'unassigned-upcoming',
          priority: start <= now + 60 * MINUTE_MS ? 'critical' : 'high',
          title: `${reservation.name} braucht einen Tisch`,
          detail: `${formatClock(start)} · ${reservation.partySize} Pers.`,
          dueAt,
          reservationId: reservation.id,
          actionLabel: 'Platzieren',
        });
      }
      continue;
    }

    if (reservation.status === 'assigned') {
      const lateAt = start + state.settings.lateGraceMinutes * MINUTE_MS;
      if (now >= lateAt) {
        tasks.push({
          id: `late-check:${reservation.id}`,
          kind: 'late-check',
          priority: 'critical',
          title: `${reservation.name} ist überfällig`,
          detail: `Erwartet ${formatClock(start)} · Tisch ${tableLabel}`,
          dueAt: lateAt,
          reservationId: reservation.id,
          tableIds: tables,
          actionLabel: 'Status klären',
        });
      } else if (now >= start - state.settings.arrivalNotificationLeadMinutes * MINUTE_MS) {
        tasks.push({
          id: `arrival:${reservation.id}`,
          kind: 'arrival',
          priority: start - now <= 10 * MINUTE_MS ? 'high' : 'normal',
          title: `${reservation.name} kommt um ${formatClock(start)}`,
          detail: `${reservation.partySize} Pers. · Tisch ${tableLabel}`,
          dueAt: start,
          reservationId: reservation.id,
          tableIds: tables,
          actionLabel: 'Reservierung öffnen',
        });
      }

      if (option && option.connectionCount > 0 && reservation.assignment?.preparedAt === undefined) {
        const dueAt = start
          - option.connectionCount * state.settings.joinMinutesPerConnection * MINUTE_MS;
        const visibleAt = dueAt
          - state.settings.preparationNotificationLeadMinutes * MINUTE_MS;
        if (now >= visibleAt) {
          tasks.push({
            id: `prepare-join:${reservation.id}`,
            kind: 'prepare-join',
            priority: now >= dueAt ? 'critical' : 'high',
            title: `Tische ${formatTableList(option.tableIds)} zusammenstellen`,
            detail: `Für ${reservation.name} um ${formatClock(start)} · ca. ${option.connectionCount * state.settings.joinMinutesPerConnection} Min.`,
            dueAt,
            reservationId: reservation.id,
            tableIds: option.tableIds,
            actionLabel: 'Als vorbereitet markieren',
          });
        }
      }
    }

    if (reservation.status === 'cleaning') {
      if (reservation.cleaningCompletedAt === undefined) {
        tasks.push({
          id: `cleaning:${reservation.id}`,
          kind: 'cleaning',
          priority: 'high',
          title: `Tisch ${tableLabel} reinigen`,
          detail: `${reservation.name} ist gegangen · geplant bis ${formatClock(reservationCleaningEnd(reservation, state.settings))}`,
          dueAt: reservationCleaningStart(reservation),
          reservationId: reservation.id,
          tableIds: tables,
          actionLabel: 'Reinigung fertig',
        });
      } else if (option && needsSplitAfter(state, reservation, option)) {
        tasks.push({
          id: `prepare-split:${reservation.id}`,
          kind: 'prepare-split',
          priority: 'high',
          title: `Tische ${formatTableList(option.tableIds)} zurückbauen`,
          detail: `Reinigung fertig · ca. ${option.connectionCount * state.settings.splitMinutesPerConnection} Min.`,
          dueAt: reservation.cleaningCompletedAt,
          reservationId: reservation.id,
          tableIds: option.tableIds,
          actionLabel: 'Rückbau fertig',
        });
      }
    }
  }

  const priorityRank = { critical: 0, high: 1, normal: 2 } as const;
  return tasks
    .filter((task) => taskVisibleByAcknowledgement(state, task, now))
    .sort((left, right) => (
      priorityRank[left.priority] - priorityRank[right.priority]
      || left.dueAt - right.dueAt
      || left.id.localeCompare(right.id)
    ));
}

export function notificationThreshold(state: AppState, task: OperationalTask): number {
  if (task.kind === 'arrival') {
    return task.dueAt - state.settings.arrivalNotificationLeadMinutes * MINUTE_MS;
  }
  if (task.kind === 'prepare-join' || task.kind === 'prepare-split') {
    return task.dueAt - state.settings.preparationNotificationLeadMinutes * MINUTE_MS;
  }
  return task.dueAt;
}

export function tasksReadyForNotification(
  state: AppState,
  tasks: OperationalTask[],
  now = Date.now(),
): OperationalTask[] {
  const day = state.serviceDays[state.ui.selectedServiceDate];
  if (!state.settings.nativeNotificationsEnabled || day?.rush.status === 'active') {
    return [];
  }
  return tasks.filter((task) => (
    notificationThreshold(state, task) <= now
    && state.notificationReceipts[task.id] === undefined
  ));
}
