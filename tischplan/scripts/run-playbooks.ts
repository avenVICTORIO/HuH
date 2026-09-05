import { mkdir, writeFile } from 'node:fs/promises';
import { runMonthPlaybook } from '../tests/playbooks/monthPlaybook';
import { runRandomizedPlaybook } from '../tests/playbooks/randomizedPlaybook';

function monthMarkdown(report: Awaited<ReturnType<typeof runMonthPlaybook>>): string {
  const rows = report.days.map((day) => (
    `| ${day.date} | ${day.scenario} | ${day.reservations} | ${day.assigned} | ${day.unassigned} | ${day.tasks} | ${day.validationIssues.length} | ${day.notes.join(' ')} |`
  ));
  return [
    '# Deterministic Month Playbook Report',
    '',
    `Seed: \`${report.seed}\``,
    '',
    '## Assertions',
    '',
    ...Object.entries(report.assertions).map(([name, value]) => `- ${value ? 'PASS' : 'FAIL'} — ${name}`),
    '',
    '## Daily observations',
    '',
    '| Date | Scenario | Reservations | Assigned now | Open | Tasks | Issues | Observation |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...rows,
    '',
    '## Totals',
    '',
    '```json',
    JSON.stringify(report.totals, null, 2),
    '```',
    '',
  ].join('\n');
}

function randomizedMarkdown(report: ReturnType<typeof runRandomizedPlaybook>): string {
  return [
    '# Seeded Randomized Observation Report',
    '',
    `Seed: \`${report.seed}\``,
    `Trials: ${report.trials}`,
    `Reservations: ${report.reservations}`,
    `Assignment rate: ${(report.assignmentRate * 100).toFixed(1)}%`,
    `Invariant violations: ${report.invariantViolations}`,
    `Outside assignments during rain: ${report.outsideAssignmentsInRain}`,
    '',
    '## Observations',
    '',
    ...report.observations.map((observation) => `- ${observation}`),
    '',
    '> Unassigned is a valid safety outcome: the software prefers an explicit unresolved task over violating capacity, weather, cleaning, setup, reset, or customer-preference constraints.',
    '',
  ].join('\n');
}

await mkdir('reports', { recursive: true });
const month = await runMonthPlaybook();
const randomized = runRandomizedPlaybook();
await Promise.all([
  writeFile('reports/month-playbook.json', `${JSON.stringify(month, null, 2)}\n`),
  writeFile('reports/month-playbook.md', monthMarkdown(month)),
  writeFile('reports/randomized-playbook.json', `${JSON.stringify(randomized, null, 2)}\n`),
  writeFile('reports/randomized-playbook.md', randomizedMarkdown(randomized)),
]);
console.log(JSON.stringify({ month: month.assertions, randomized }, null, 2));
