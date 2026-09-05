# Hand Aufs Herz · Reservierungen

Tablet-first restaurant reservation and table-planning application built with **Svelte 5** and **strict TypeScript**.

The room plan is the primary operational screen. Reservations, automatic table planning, operational tasks, weather handling, Rush-mode recovery, cleaning/reset steps, notifications, and backup/restore are coordinated through one local application state persisted in `localStorage`.

## What is included

- Touch-optimized reservation and walk-in wizards.
- Inside/outside seating preferences.
- Automatic placement with a deterministic, dependency-free TypeScript optimizer.
- Reservation-scoped joined-table assignments; tables are never permanently merged in the data model.
- Configurable cleaning, table-joining, and table-splitting durations as hard planning constraints.
- Capacity-based shared seating on a physical table. There is no arbitrary party-count limit: four solo walk-ins may share one four-top.
- Manual placement, locking, preference overrides, and last-resort sharing with required reasons.
- Rain and outside-area closure handling without silently moving existing guests.
- Upcoming-arrival, late-arrival, setup, cleaning, reset, unassigned, rain-conflict, and reconciliation tasks.
- Optional native browser notifications while the application is open.
- Rush mode for overload periods, followed by explicit room reconciliation.
- Exact-schema JSON backup export/import for device transfer.
- Audit trail for operational changes.
- Unit tests, browser E2E tests, a deterministic 30-day restaurant playbook, and seeded randomized stress observations.

## Requirements

- Node.js `>= 22.12`
- npm
- A modern Chromium, Firefox, or WebKit browser for the application
- Playwright Chromium for browser tests

## Start development

```bash
npm ci
npm run dev
```

Vite prints the local URL. Open it on a tablet or desktop browser on the same network.

## Verify the project

Install the Playwright browser once:

```bash
npx playwright install chromium
```

Then run:

```bash
npm run verify
```

Individual commands:

```bash
npm run check             # Svelte + TypeScript diagnostics
npm run test:unit         # fast domain/application tests
npm run test:playbooks    # deterministic month + seeded randomized tests
npm run report:playbooks  # write reports/*.json and reports/*.md
npm run test:e2e          # Chromium browser tests with mock time
npm run test:e2e:file     # standalone file:// build smoke and persistence
npm run build             # web and standalone production distributions
```

To use an already installed Chromium binary:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

## Production build

```bash
npm ci
npm run build
```

This creates two production distributions without the test API:

- Serve the contents of `dist/` as normal static web files.
- Copy `dist-file/Hand-aufs-Herz.html` to the target device and open it directly in Chromium. This standalone file contains all application JavaScript and CSS and requires no local server, Node.js installation, or neighboring asset directory.

Run `npm run build:file` to regenerate only the standalone distribution. Its build fails if a future application asset cannot be inlined, and `npm run test:e2e:file` opens the generated document through a real `file://` URL and verifies a persisted reservation across reload.

Both distributions intentionally store their state only in the opening browser profile's `localStorage`. Filesystem storage behavior is browser-specific and can be tied to the file location, so keep the HTML at a stable path and export a JSON backup before moving or replacing it. Weather still requires internet access and permission from the external forecast/location APIs; native notifications may be unavailable for `file://` pages.

## Project structure

```text
src/
  application/      orchestration, workflows, tasks, controller
  components/       Svelte 5 tablet UI
  domain/           model, timing, table catalog, solver, validation, backup
  infrastructure/   localStorage, clocks, browser notifications
  App.svelte        UI composition and workflow routing

tests/
  unit/             deterministic domain/application tests
  e2e/              Playwright tablet workflows with mock time
  playbooks/        30-day deterministic simulation and seeded stress run

scripts/            generated report tooling
docs/               operator and technical documentation
reports/            committed verification/playbook outputs
dist/               production build included in the handoff archive
dist-file/          self-contained Chromium filesystem distribution
```

## Important design boundaries

- **No legacy or migration path:** state and backup schema version must be exactly `1`. Invalid or older shapes are rejected rather than guessed into the current model.
- **No cloud synchronization:** this is a local-first single-browser application. Concurrent edits on multiple devices are not merged.
- **No silent operational overrides:** rain, full indoor capacity, insufficient setup time, or a customer preference can leave a reservation explicitly unassigned.
- **Notifications are supplemental:** browser notifications are generated only while the application is open and ticking. The in-app task bell and task list remain authoritative.
- **Backup files contain personal data:** names, phone numbers, email addresses, notes, and audit entries are exported as plain JSON. Store them appropriately.

See [the German user guide](docs/USER_GUIDE.de.md), [architecture](docs/ARCHITECTURE.md), [testing guide](docs/TESTING.md), and [AGENTS.md](AGENTS.md) before making substantial changes.
