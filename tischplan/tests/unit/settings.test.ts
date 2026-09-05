import { describe, expect, it } from 'vitest';
import {
  cloneSettings,
  DEFAULT_SETTINGS,
  isWithinOpeningHours,
  openingHoursValidationError,
  reservationTimePresets,
  weekdayForServiceDate,
} from '../../src/domain/settings';

describe('weekly opening hours', () => {
  it('maps service dates deterministically to weekdays', () => {
    expect(weekdayForServiceDate('2026-09-01')).toBe('tuesday');
    expect(weekdayForServiceDate('2026-09-06')).toBe('sunday');
  });

  it('builds reservation choices from that weekday opening window', () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.openingHours.tuesday = { intervals: [
      { opensAt: '09:00', closesAt: '12:00' },
      { opensAt: '17:00', closesAt: '19:00' },
    ] };

    expect(reservationTimePresets('2026-09-01', settings)).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '17:00', '17:30', '18:00', '18:30',
    ]);
    expect(isWithinOpeningHours('2026-09-01', '09:00', settings)).toBe(true);
    expect(isWithinOpeningHours('2026-09-01', '13:00', settings)).toBe(false);
    expect(isWithinOpeningHours('2026-09-01', '19:00', settings)).toBe(false);
  });

  it('offers no reservation choices on a closed weekday', () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.openingHours.sunday.intervals = [];

    expect(reservationTimePresets('2026-09-06', settings)).toEqual([]);
    expect(isWithinOpeningHours('2026-09-06', '18:00', settings)).toBe(false);
  });

  it('rejects overlapping opening windows', () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.openingHours.tuesday.intervals = [
      { opensAt: '09:00', closesAt: '14:00' },
      { opensAt: '13:00', closesAt: '17:00' },
    ];
    expect(openingHoursValidationError(settings)).toContain('dürfen sich nicht überschneiden');
  });
});
