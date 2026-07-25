# Testing Guide

## Test layers

### Type/Svelte diagnostics

```bash
npm run check
```

Runs `svelte-check` against strict TypeScript configuration.

### Unit tests

```bash
npm run test:unit
```

Covers time and local-date input arithmetic, solver invariants and preferences, setup/clean/reset constraints, capacity-based sharing, invertible closed-time timeline projection, table-timeline feasibility, atomic direct table reservations, weather parsing/isolation, controller persistence/lifecycle, backup validation, tasks, notifications, rain, and Rush behavior.

### Deterministic operational playbooks

```bash
npm run test:playbooks
npm run report:playbooks
```

- The month playbook executes 30 dated service scenarios with a mutable clock.
- The randomized playbook uses a fixed seed, so observations are reproducible.
- Reports are written to `reports/` as JSON and Markdown.

### Browser E2E

```bash
npx playwright install chromium
npm run test:e2e
```

The E2E build enables a test-only API through `VITE_ENABLE_TEST_API=true`. Production builds omit it.

Tests run at a 1024×768 tablet viewport and cover:

- touchscreen reservation wizard,
- persisted inside/outside preference and reload,
- four solo walk-ins sharing one four-top,
- table-detail visual hierarchy,
- mock-time arrival/overdue task transition,
- rain conflict without silent reassignment,
- Rush mode and required reconciliation,
- joined-table cleaning/reset,
- backup download, reset, and import,
- split opening hours and contextual action visibility,
- tablet reservation search with status-independent name/normalized-phone matching and an explicit clear action,
- direct reservation from a collision-aware, multi-date table timeline,
- the grouped time-plan tab with continuous 3-hour-to-1-month zoom, separate date/time header rows, persistent half-hour/hour ticks, a stable sub-day pixel scale, a 30-day detail buffer, incremental next-day scrolling, compressed closed intervals, and local-format future-date jumps,
- confirmed deterministic demo-month generation and complete reset,
- forecast location, three-hour overlay, seven-day detail, and strict isolation from operational weather,
- full-layout checks and screenshots at 390 px.

Set `PLAYWRIGHT_CHROMIUM_PATH` to use a system browser instead of Playwright's downloaded browser.

### Standalone filesystem distribution

```bash
npm run build:file
npm run test:e2e:file
```

`scripts/build-filesystem.ts` creates the production-only `dist-file/Hand-aufs-Herz.html`, inlining the generated JavaScript and CSS. It rejects unexpected emitted files so that the one-file guarantee cannot silently regress. The browser test navigates to the artifact with a real `file://` URL, verifies that the production test API is absent, creates a reservation through the visible workflow, reloads the file, and confirms both UI restoration and unchanged `localStorage` data. The test is also part of `npm run test:e2e`.

### German user-guide screenshots

```bash
npm run test:e2e:guide
```

`tests/e2e/user-guide.spec.ts` builds one deterministic tablet scenario and writes the committed screenshots in `docs/assets/user-guide/`. The illustrated set covers the floor plan, table/reservation navigation, tasks, reservation and Walk-in entry, search, schedule, automatic and manual placement, opening hours, weather, and Rush. The test is also part of the complete `npm run test:e2e` suite. When a UI change affects an illustrated workflow, update the scenario if needed, regenerate the images, inspect all of them visually, and keep `docs/USER_GUIDE.de.md` synchronized. The PNG files are generated artifacts and must not be edited manually.

## Mock time

Production uses `SystemClock`. Unit/playbook tests inject `MutableClock`. The E2E build exposes `setNow()` and `tick()` through `window.__HAH_TEST__`.

Do not use real wall-clock sleeps to test business timing. Advance the mutable clock and assert derived tasks or feasibility.

## Adding a critical feature

A change is not complete until it has the appropriate combination of:

1. pure unit tests for rules and edge cases,
2. controller tests for mutation and persistence,
3. E2E coverage for a user-visible critical path,
4. a deterministic playbook scenario when it affects real service operations,
5. randomized invariant checks when it expands the state space.

## Invariant validation

`validatePlan()` and `validateOperationalState()` are independent checks, not merely solver internals. Tests should validate returned plans, especially when the solver reports `timedOut: true`.

A timed-out search is acceptable only when the returned incumbent is feasible.

## Current committed reports

- `reports/playwright-results.json`
- `reports/month-playbook.json`
- `reports/month-playbook.md`
- `reports/randomized-playbook.json`
- `reports/randomized-playbook.md`
- `reports/verification.json`
- `reports/verification.md`
