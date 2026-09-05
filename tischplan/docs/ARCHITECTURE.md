# Technical Architecture

## Goals

The implementation favors explicit operational state and testability over framework magic:

- Svelte components render state and initiate workflows.
- A single `AppController` performs all mutations.
- Pure domain functions calculate time, options, feasibility, plans, and validation.
- One versioned state object is persisted after every committed mutation.
- Time and notifications are injected so operational behavior can be tested deterministically.

## Layers

### `src/domain`

Pure TypeScript with no browser or Svelte dependencies.

- `model.ts` — canonical domain types.
- `time.ts` — service-date timestamps, arrival, duration, cleaning, and reset calculations.
- `settings.ts` — weekly opening hours, reservation time choices, defaults, bounds, and duration policy.
- `tableTimeline.ts` — logarithmic 3-hour-to-30-day scaling, adaptive markers, buffered epoch windows, multi-day occupancy ranges, and physical free-slot feasibility.
- `tableCatalog.ts` — physical tables, floor fixtures, legal contiguous join chains, generated table options.
- `solver.ts` — placement feasibility, cost model, bounded branch-and-bound search, plan validation.
- `validation.ts` — persisted-shape validation and operational invariants.
- `backup.ts` — exact version-1 backup envelope.

### `src/application`

Use cases and workflow orchestration.

- `appController.ts` is the only production mutation boundary.
- `reservationFactory.ts` constructs valid reservations.
- `tasks.ts` derives operational tasks and notification eligibility.
- `runtime.ts` wires browser infrastructure.
- `weatherForecast.ts` maps hourly forecast data into the informational three-hour and seven-day views.
- `demoMonth.ts` builds deterministic, invariant-valid 30-day demonstration data without browser dependencies.
- `uiTypes.ts` contains workflow-only UI types.

Every controller mutation goes through `commit()`:

1. clone current state,
2. apply one mutation,
3. increment revision and timestamp,
4. append audit entry when appropriate,
5. validate the complete state,
6. persist to the repository,
7. publish a cloned snapshot to Svelte stores.

This makes partial in-memory updates and forgotten persistence less likely.

### `src/infrastructure`

- `localStorageRepository.ts` provides browser and in-memory state repositories.
- `clock.ts` provides `SystemClock` and deterministic `MutableClock`.
- `notifications.ts` wraps the browser Notification API and a memory test double.
- `weatherGateway.ts` is the strict external boundary for Bright Sky forecasts and explicit Nominatim location searches; results from repeated location searches are cached and requests are rate-limited.

### `src/components`

Svelte 5 components are intentionally workflow-focused. They receive state and callbacks; they do not read `localStorage` or mutate domain objects directly.

`App.svelte` composes the primary screen, modal workflows, operations drawer, shared task list, bell-triggered task popover, and the exceptional active-Rush warning strip.

## State ownership

`AppState` is the persisted aggregate root. There is no separate mutable cache for assignments, tasks, merged tables, or UI preferences.

Derived data is recalculated from state:

- operational tasks,
- available placement choices,
- Auto-Plan previews,
- table timelines,
- floor status,
- current capacity indicators.

The configured weather location is durable settings data. Forecast responses are deliberately transient UI state: they are neither persisted nor inputs to tasks, outside availability, reservations, or the solver. The manual operational weather state remains authoritative.

Direct creation from a free table-timeline slot is a single controller mutation. Feasibility is rechecked against the current aggregate and the assigned reservation is committed atomically, so a concurrent conflict cannot leave a partial unassigned reservation behind.

Sub-day timeline projection uses a zoom-derived, position-independent pixel scale. Closed intervals still compress to at most one display hour, but entering such an interval never rescales reservations. A 30-day virtual detail buffer absorbs ordinary horizontal navigation; buffer re-centering is deferred until pointer/scroll activity has gone idle so a dragged scrollbar is never replaced underneath the gesture.

The time plan and table detail use a virtualized horizontal time window rather than a calendar-sized DOM surface. Five visible spans are rendered around the current center. Near a buffer edge the same epoch under the viewport is retained while the window is recentered, yielding effectively unbounded navigation with bounded DOM size. Zoom changes preserve the visible center and map logarithmically from 180 to 43,200 minutes.

Tasks are mostly projections, not rows that must be synchronized. Only snooze/completion acknowledgements and notification receipts are persisted.

## Table-assignment model

Physical tables remain immutable definitions. A reservation owns an `Assignment`:

```ts
{
  optionId: 'join:14+13',
  tableIds: ['14', '13'],
  region: 'inside',
  capacity: 10,
  mode: 'exclusive',
  source: 'auto',
  locked: false,
  assignedAt: 178...
}
```

A later reservation may use table 14 and table 13 separately. There is no global `groupId` and no permanent furniture mutation.

Legal joined options are generated from contiguous slices of `JOIN_CHAINS`. This keeps geometry out of the optimizer and makes operationally impossible combinations unrepresentable.

## Solver

The production search budget is sanitized to at most 1,000 ms. A timeout returns the best feasible incumbent found so far and never bypasses independent plan validation.

`solveAssignments()` uses a bounded dependency-free branch-and-bound search:

1. Build legal single and joined options.
2. Separate fixed placements from variable reservations.
3. Generate and rank up to 20 candidates per variable reservation plus an explicit unassigned candidate.
4. Produce a greedy feasible incumbent.
5. Search lower-cost combinations until the configured runtime budget expires.
6. Return the best feasible plan found, even when optimality is not proven.
7. Validate physical invariants before a plan may be applied.

Hard constraints include:

- capacity,
- customer area preference,
- rain/outside closure,
- active and locked assignments,
- freeze window,
- reservation duration,
- per-party cleaning interval,
- joined-table setup time,
- split/reset time before a different configuration,
- shared-table aggregate capacity,
- the single shared extra seat between tables 17 and 17A.

The objective strongly prefers assigning guests, preserving existing placements, avoiding unnecessary joins, minimizing wasted exclusive capacity, and consolidating consenting walk-ins on already-open shared tables.

“Unassigned” is always a legal candidate. The solver never fabricates feasibility to improve a KPI.

## Shared seating

Shared seating is modeled as multiple `shared` assignments to the same single physical table. Capacity is checked as a time-event sweep from arrival through cleaning completion. There is no fixed limit on the number of parties.

Joined table options are exclusive. Sharing a joined table is intentionally not generated because it combines two distinct operational exceptions and complicates staff communication.

## Time model

Reservation time is derived from:

- service date,
- entered start time,
- delay,
- configured or explicit duration,
- actual arrival/left timestamps when known,
- cleaning duration,
- joined-table connection count and split duration.

Releases at the same timestamp are processed before arrivals, allowing a table to become valid exactly when cleaning/reset has completed.

## Notifications

Tasks are always visible in the app. Native notifications are supplemental:

- permission must be granted,
- notifications must be enabled in settings,
- the app must be open and ticking,
- each task tag is sent once,
- Rush mode suppresses native notifications.

No service worker or push backend is included.

## Persistence and backups

The repository stores one JSON document at:

```text
hand-aufs-herz.app-state.v1
```

`LocalStorageRepository.load()` validates the full shape. No migration or compatibility layer exists. Backup import uses the same domain validator and accepts only the version-1 envelope.

See `BACKUP_AND_DATA.md` for operational consequences.

## Test-only API

`VITE_ENABLE_TEST_API=true` exposes `window.__HAH_TEST__` for Playwright. Production builds do not expose it. Tests use this API only to control time and set up state efficiently; user-facing workflows such as the reservation wizard and backup drawer are still exercised through the DOM where relevant.
