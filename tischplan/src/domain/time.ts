import type { AppSettings, Reservation } from './model';

export const MINUTE_MS = 60_000;
export const ARRIVAL_CONFIRMATION_LEAD_MINUTES = 20;

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateToServiceDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function serviceDateTime(serviceDate: string, time: string): number {
  const [year, month, day] = serviceDate.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

export function reservationScheduledStart(reservation: Reservation): number {
  return serviceDateTime(reservation.serviceDate, reservation.startTime);
}

export function reservationStart(reservation: Reservation): number {
  return reservationScheduledStart(reservation) + reservation.delayMinutes * MINUTE_MS;
}

export function canConfirmArrival(reservation: Reservation, now: number): boolean {
  return reservationStart(reservation) - now <= ARRIVAL_CONFIRMATION_LEAD_MINUTES * MINUTE_MS;
}

export function reservationMealEnd(reservation: Reservation): number {
  const actualStart = reservation.arrivedAt ?? reservationStart(reservation);
  return actualStart + reservation.durationMinutes * MINUTE_MS;
}

export function reservationCleaningStart(reservation: Reservation): number {
  return reservation.leftAt ?? reservationMealEnd(reservation);
}

export function reservationCleaningEnd(
  reservation: Reservation,
  settings: AppSettings,
): number {
  if (reservation.cleaningCompletedAt !== undefined) {
    return reservation.cleaningCompletedAt;
  }
  return reservationCleaningStart(reservation) + settings.cleaningMinutes * MINUTE_MS;
}

export function reservationResetEnd(
  reservation: Reservation,
  connectionCount: number,
  settings: AppSettings,
): number {
  if (connectionCount <= 0) {
    return reservationCleaningEnd(reservation, settings);
  }
  if (reservation.resetCompletedAt !== undefined) {
    return reservation.resetCompletedAt;
  }
  return reservationCleaningEnd(reservation, settings)
    + connectionCount * settings.splitMinutesPerConnection * MINUTE_MS;
}

export function addMinutes(epochMs: number, minutes: number): number {
  return epochMs + minutes * MINUTE_MS;
}

export function minutesBetween(left: number, right: number): number {
  return Math.round((right - left) / MINUTE_MS);
}

export function formatClock(epochMs: number): string {
  const date = new Date(epochMs);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatServiceDate(serviceDate: string): string {
  const [year, month, day] = serviceDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatDateInput(serviceDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(serviceDate);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : serviceDate;
}

export function parseDateInput(value: string): string | null {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const localMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  const year = Number(isoMatch?.[1] ?? localMatch?.[3]);
  const month = Number(isoMatch?.[2] ?? localMatch?.[2]);
  const day = Number(isoMatch?.[3] ?? localMatch?.[1]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  const isValid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isValid ? dateToServiceDate(date) : null;
}

export function shiftServiceDate(serviceDate: string, days: number): string {
  const [year, month, day] = serviceDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateToServiceDate(date);
}

export function isOverlapping(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function parseTimeInput(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0 || digits.length > 4) {
    return null;
  }

  let hour: number;
  let minute: number;
  if (digits.length <= 2) {
    hour = Number(digits);
    minute = 0;
  } else if (digits.length === 3) {
    hour = Number(digits.slice(0, 1));
    minute = Number(digits.slice(1));
  } else {
    hour = Number(digits.slice(0, 2));
    minute = Number(digits.slice(2));
  }

  if (hour > 23 || minute > 59) {
    return null;
  }
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function formatRelativeMinutes(dueAt: number, now: number): string {
  const minutes = Math.round((dueAt - now) / MINUTE_MS);
  if (minutes === 0) {
    return 'jetzt';
  }
  if (minutes > 0) {
    return `in ${minutes} Min.`;
  }
  return `seit ${Math.abs(minutes)} Min.`;
}
