import { describe, expect, it } from 'vitest';
import { runMonthPlaybook } from './monthPlaybook';

describe('deterministic month operational playbook', () => {
  it('executes all thirty realistic service days without violating physical invariants', async () => {
    const report = await runMonthPlaybook();
    expect(report.days).toHaveLength(30);
    expect(report.assertions).toEqual({
      allThirtyDaysExecuted: true,
      allRequiredScenariosCovered: true,
      noPhysicalInvariantViolations: true,
      backupRoundTripSucceeded: true,
      rushNotificationsSuppressed: true,
      fourSoloWalkInsSharedOneTable: true,
      rainNeverUsedOutside: true,
    });
  }, 30_000);
});
