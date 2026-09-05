import { describe, expect, it } from 'vitest';
import { runRandomizedPlaybook } from './randomizedPlaybook';

describe('seeded randomized observational playbook', () => {
  it('returns only physically valid plans across randomized messy services', () => {
    const report = runRandomizedPlaybook();
    expect(report.trials).toBe(120);
    expect(report.reservations).toBeGreaterThan(1_000);
    expect(report.invariantViolations).toBe(0);
    expect(report.outsideAssignmentsInRain).toBe(0);
    expect(report.assigned).toBeGreaterThan(0);
    expect(report.sharedAssignments).toBeGreaterThan(0);
    expect(report.joinedAssignments).toBeGreaterThan(0);
  }, 60_000);
});
