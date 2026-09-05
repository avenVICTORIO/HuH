import { describe, expect, it } from 'vitest';
import { createReservation } from '../../src/application/reservationFactory';
import { DEFAULT_SETTINGS } from '../../src/domain/settings';
import {
  MINUTE_MS,
  canConfirmArrival,
  parseTimeInput,
  reservationCleaningEnd,
  reservationResetEnd,
  reservationStart,
  serviceDateTime,
} from '../../src/domain/time';
import { BASE_DATE, BASE_NOW, draft } from '../helpers';

describe('time model', () => {
  it('parses compact touchscreen time input', () => {
    expect(parseTimeInput('9')).toBe('09:00');
    expect(parseTimeInput('930')).toBe('09:30');
    expect(parseTimeInput('1830')).toBe('18:30');
    expect(parseTimeInput('2460')).toBeNull();
  });

  it('applies delay, meal, cleaning, and split durations in order', () => {
    const reservation = createReservation(draft({ durationMinutes: 90 }), DEFAULT_SETTINGS, 'r1', BASE_NOW);
    reservation.delayMinutes = 15;
    expect(reservationStart(reservation)).toBe(serviceDateTime(BASE_DATE, '18:15'));
    expect(reservationCleaningEnd(reservation, DEFAULT_SETTINGS)).toBe(serviceDateTime(BASE_DATE, '20:00'));
    expect(reservationResetEnd(reservation, 2, DEFAULT_SETTINGS)).toBe(serviceDateTime(BASE_DATE, '20:10'));
    reservation.cleaningCompletedAt = serviceDateTime(BASE_DATE, '19:55');
    reservation.resetCompletedAt = serviceDateTime(BASE_DATE, '19:58');
    expect(reservationCleaningEnd(reservation, DEFAULT_SETTINGS)).toBe(serviceDateTime(BASE_DATE, '19:55'));
    expect(reservationResetEnd(reservation, 2, DEFAULT_SETTINGS)).toBe(serviceDateTime(BASE_DATE, '19:58'));
  });

  it('uses actual arrival time for meal end', () => {
    const reservation = createReservation(draft({ durationMinutes: 60 }), DEFAULT_SETTINGS, 'r1', BASE_NOW);
    reservation.arrivedAt = serviceDateTime(BASE_DATE, '18:20');
    expect(reservationCleaningEnd(reservation, DEFAULT_SETTINGS)).toBe(
      serviceDateTime(BASE_DATE, '19:35'),
    );
    expect(MINUTE_MS).toBe(60_000);
  });

  it('offers arrival confirmation only from twenty minutes before expected arrival', () => {
    const reservation = createReservation(draft({ startTime: '18:00' }), DEFAULT_SETTINGS, 'r1', BASE_NOW);
    expect(canConfirmArrival(reservation, serviceDateTime(BASE_DATE, '17:39'))).toBe(false);
    expect(canConfirmArrival(reservation, serviceDateTime(BASE_DATE, '17:40'))).toBe(true);
    reservation.delayMinutes = 15;
    expect(canConfirmArrival(reservation, serviceDateTime(BASE_DATE, '17:40'))).toBe(false);
    expect(canConfirmArrival(reservation, serviceDateTime(BASE_DATE, '17:55'))).toBe(true);
  });
});
