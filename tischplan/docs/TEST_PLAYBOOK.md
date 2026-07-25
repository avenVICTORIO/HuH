# Operational Test Playbook

## Deterministic month

The deterministic test runs September 2026 using injected time. Each day isolates a realistic operational concern while the month collectively exercises the complete supported process.

| Day | Scenario | Core observation |
|---:|---|---|
| 1 | Regular Auto-Plan | Normal reservations receive a safe plan. |
| 2 | Inside/outside preferences | Both binding preferences are respected. |
| 3 | Manual inside-to-outside override | Customer changes request; staff override requires a reason. |
| 4 | Rain closes outside | Outdoor preference remains visibly unresolved. |
| 5 | Rain, full inside, later departure | Indoor placement appears only after real departure and release. |
| 6 | Walk-in immediate seating | Fast path ends with an explicit seated state. |
| 7 | Four solo walk-ins | Four parties share one four-top by capacity. |
| 8 | Late arrival | Delay changes operational timing and audit history. |
| 9 | No-show | Planned resources are released. |
| 10 | Cancellation | History remains traceable. |
| 11 | Joined-table preparation | Setup task is due and explicitly completed. |
| 12 | Cleaning and split | Cleaning and reset are separate completion steps. |
| 13 | Same joined configuration follows | No pointless split/rejoin between compatible bookings. |
| 14 | Last-resort regular sharing | Consent/override reason is required. |
| 15 | Too late to join | Reservation stays open instead of assuming impossible setup. |
| 16 | Task snooze/completion | Operational task controls are deterministic. |
| 17 | Rush notification suppression | Native notifications pause; reconciliation becomes mandatory. |
| 18 | Untracked walk-in during Rush | Real occupancy is recovered after overload. |
| 19 | Rain after outside plan | Conflict is visible and manually recovered, never silently moved. |
| 20 | Manual outside closure | Operational closure works independently from weather. |
| 21 | Early cleaning completion | Staff can release capacity before the average estimate. |
| 22 | Delayed departure and replan | Actual room state is recorded before re-optimization. |
| 23 | Backup transfer | Exact backup round-trip succeeds on a fresh controller. |
| 24 | Timing settings change | New averages immediately alter constraints. |
| 25 | Long-stay party | Explicit duration blocks resources through cleanup/reset. |
| 26 | Mixed sources | Phone, online, in-person, other, and walk-in use one model. |
| 27 | Crowded peak | High-load plan remains invariant-valid. |
| 28 | Optional bar seats | Singles use bar only when explicitly enabled. |
| 29 | Audit trail | Important actions remain attributable in local history. |
| 30 | Full-service rehearsal | Planning, preparation, arrival, outside seating, and release combine. |

Assertions require:

- all 30 days executed,
- every required scenario covered,
- zero physical invariant violations,
- successful backup round-trip,
- Rush notification suppression,
- four-solo sharing on one table,
- zero outside placements during rain.

## Seeded randomized observations

The randomized playbook uses seed `1592598566` (`0x5EED2026`) for 120 service trials. It varies:

- 8–26 reservations per service,
- source and party size,
- delays and durations,
- preferences,
- sharing permission,
- rain/outside availability,
- cleaning/setup/split averages,
- optional bar seats,
- solver runtime budget.

The test validates every returned plan and observes assignment, sharing, joins, timeouts, and rain outcomes. A reservation left unassigned is counted as safe behavior; it is not converted into a physical violation.

Use a new fixed seed when adding a second stress corpus. Do not replace the existing seed casually, because stable observations make regressions comparable.
