# Verification Report

Verified: **2026-07-15**

## Command-level results

| Check | Result | Detail |
|---|---|---|
| Clean install | PASS | `npm ci` from a source-only copy |
| Dependency audit | PASS | 0 known vulnerabilities |
| Svelte + TypeScript | PASS | 0 errors, 0 warnings |
| Unit tests | PASS | 44 tests across 8 files |
| Deterministic month | PASS | 30/30 service days, all required assertions, 0 validation issues |
| Seeded randomized run | PASS | 120 services, 2030 reservations, 0 invariant violations, 0 outside-in-rain placements |
| Browser E2E | PASS | 20/20 Chromium tests, including a real `file://` launch with persisted data, contextual table → reservation → table navigation, the dedicated German user-guide capture, the bell-triggered task list, suppression of far-future setup work, ten valid joined-table demo reservations, stable next-day timeline scrolling, reconciliation, and 390 px coverage |
| UI screenshot review | PASS | 13 visually inspected, deterministic guide images illustrate the floor, reservation and Walk-in entry, table/reservation navigation, tasks, search, time plan, automatic and manual placement, opening hours, weather, and Rush; report captures additionally cover continuous next-day scrolling, demo load, and complete 390 px layouts |
| Production build | PASS | Vite web build generated in `dist/`; self-contained 273,408-byte filesystem build generated as `dist-file/Hand-aufs-Herz.html` |
| Filesystem browser smoke | PASS | Direct `file://` launch, visible floor, production test API absent, reservation restored after reload, unchanged `localStorage`, 0 page errors |
| Production browser smoke | PASS | Floor visible, 23 inside table elements, 0 page errors, test API absent |

## Deterministic month assertions

- PASS — `allThirtyDaysExecuted`
- PASS — `allRequiredScenariosCovered`
- PASS — `noPhysicalInvariantViolations`
- PASS — `backupRoundTripSucceeded`
- PASS — `rushNotificationsSuppressed`
- PASS — `fourSoloWalkInsSharedOneTable`
- PASS — `rainNeverUsedOutside`

## Randomized observations

- Fixed seed: `1592598566`
- Trials: 120
- Reservations: 2030
- Assigned: 1854
- Explicitly unassigned: 176
- Plans reaching runtime budget: 101
- Invariant violations: 0
- Outside assignments during rain: 0

A runtime-budget timeout is not accepted as a correctness waiver. Every returned incumbent is validated independently; unresolved reservations remain explicit rather than violating a hard constraint.

## Deliberate limits

- Single-browser localStorage persistence; no cloud synchronization or concurrent-device merge.
- No legacy data migration; schemaVersion must be exactly 1.
- Native notifications require permission and an open application; no background push service.
- Filesystem `localStorage` isolation is browser-specific and may depend on the absolute HTML path; back up before moving or replacing the standalone file.
- Filesystem weather still needs internet access and external APIs that accept a file origin.
- Backup JSON contains unencrypted personal data.
- Solver returns the best feasible plan within a runtime budget and does not prove global optimality.
- The production solver budget is capped at 1,000 ms; reaching it still requires an independently valid incumbent.

Machine-readable details are in `reports/verification.json`.
