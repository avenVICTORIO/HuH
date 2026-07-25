import { describe, expect, it } from 'vitest';
import { formatDateInput, parseDateInput } from '../../src/domain/time';

describe('local date input', () => {
  it('formats and parses German calendar dates without timezone conversion', () => {
    expect(formatDateInput('2027-09-01')).toBe('01.09.2027');
    expect(parseDateInput('1.9.2027')).toBe('2027-09-01');
    expect(parseDateInput('01/09/2027')).toBe('2027-09-01');
    expect(parseDateInput('2027-09-01')).toBe('2027-09-01');
  });

  it('rejects impossible calendar dates', () => {
    expect(parseDateInput('31.02.2027')).toBeNull();
    expect(parseDateInput('heute')).toBeNull();
  });
});
