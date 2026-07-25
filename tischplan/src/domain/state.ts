import type { AppState, Reservation, ServiceDayState } from './model';
import { cloneSettings, DEFAULT_SETTINGS } from './settings';
import { dateToServiceDate } from './time';

export function createServiceDay(date: string): ServiceDayState {
  return {
    date,
    weather: 'dry',
    outsideOpen: true,
    rush: {
      status: 'off',
      reconciledReservationIds: [],
    },
    notes: '',
  };
}

export function createInitialState(now = Date.now()): AppState {
  const selectedServiceDate = dateToServiceDate(new Date(now));
  return {
    schemaVersion: 1,
    revision: 0,
    reservations: [],
    serviceDays: {
      [selectedServiceDate]: createServiceDay(selectedServiceDate),
    },
    settings: cloneSettings(DEFAULT_SETTINGS),
    taskAcknowledgements: {},
    notificationReceipts: {},
    auditLog: [],
    ui: {
      selectedServiceDate,
      selectedRegion: 'inside',
      reservationFilter: 'all',
    },
    lastSavedAt: now,
  };
}

export function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

export function ensureServiceDay(state: AppState, date: string): ServiceDayState {
  const existing = state.serviceDays[date];
  if (existing) {
    return existing;
  }
  const created = createServiceDay(date);
  state.serviceDays[date] = created;
  return created;
}

export function activeReservationsForDate(state: AppState, date: string): Reservation[] {
  return state.reservations.filter((reservation) => (
    reservation.serviceDate === date
    && reservation.status !== 'cancelled'
  ));
}
