# AGENTS.md

This repository is a local-first Svelte 5 + strict TypeScript restaurant operations application. Work autonomously, make reasonable hard decisions, and leave the repository in a fully verified state.

## Required completion loop

For any non-trivial change:

1. Read the relevant domain model, controller workflow, UI component, and existing tests.
2. Fix the root model or workflow rather than layering another override or compatibility shim.
3. Add or update tests at the appropriate layers.
4. Run `npm run check`.
5. Run `npm run test:unit`.
6. Run `npm run test:playbooks` when operations, timing, solver, weather, Rush, or persistence changed.
7. Run `npm run test:e2e` for user-visible critical paths.
8. Run `npm run build` last so `dist/` is a production build without the test API.
9. Update documentation, committed reports, and user-guide screenshots when behavior or verification changes.
10. Do not report completion while any relevant test is red or skipped without an explicit documented reason.

## Architecture rules

- `src/domain` must stay pure TypeScript. No DOM, Svelte store, `localStorage`, or browser Notification calls.
- `AppController` is the production mutation boundary. Components must not mutate state objects directly.
- Every durable mutation must go through `commit()` so validation, persistence, revision, timestamps, store publication, and audit behavior stay consistent.
- Components receive state and callbacks. They do not access the repository.
- Physical table definitions are immutable catalog data. Never reintroduce global merged-table state.
- Joined tables belong to a reservation assignment as `tableIds`.
- Operational tasks are derived; persist only acknowledgements, snoozes, and notification receipts.
- Use injected `Clock` for domain/application timing. Never bake `Date.now()` into test-dependent workflows when a clock is available.

## Non-negotiable domain invariants

- Never exceed physical capacity.
- Never use outside in rain or while outside is closed.
- Never silently violate an inside/outside preference.
- Manual preference or sharing exceptions require a reason.
- Cleaning occupies capacity until completed or its modeled interval ends.
- A changed joined-table configuration requires cleaning, split/reset, and next setup time.
- Seated and cleaning reservations are fixed physical state.
- Shared seating has no arbitrary party-count limit; aggregate guests determine capacity.
- Sharing is supported only on one physical table, not a joined option.
- Tisch 17 and 17A jointly have one shared extra seat.
- The safe fallback is explicit `unassigned`, not a fabricated assignment.

## Product constraints

- This work-in-progress intentionally has **no legacy migration path**. Do not add adapters, legacy keys, or permissive backup conversion unless the product owner explicitly changes that decision.
- Current persisted and backup schema version is exactly `1`.
- Data remains local to one browser profile. Do not imply cloud sync or concurrent multi-device safety.
- Native notifications supplement the in-app task list and require the app to be open; do not describe them as background push.

## UI rules

- The floor plan is the primary screen and must retain an at-a-glance view.
- Keep normal operational tasks behind the task bell; only exceptional modes such as active Rush may use a persistent warning strip.
- Put infrequent controls behind the operations drawer.
- Preserve minimum touch targets around 44 px.
- Touchscreen forms should use large, staged controls rather than dense desktop forms.
- Every workflow needs a logical next step, clear completion, or explicit cancellation.
- Table detail must keep current parties first, next arrival prominent, and later arrivals compact.
- Test at 1024×768 and the narrow/mobile breakpoint after layout changes.
- Avoid adding permanent panels, badges, or KPIs without removing equal visual noise elsewhere.

## TypeScript and code style

- Keep `strict` TypeScript clean.
- Use curly braces for all control flow.
- Hoist non-trivial conditions into named variables.
- Prefer meaningful domain names over abbreviations.
- Do not catch just to log or swallow an exception.
- Avoid `any`; narrow `unknown` at boundaries.
- Keep pure calculations separate from controller side effects.
- Remove dead code rather than preserving speculative compatibility.
- Comments should explain operational/domain intent, not restate syntax.

## Tests

- Unit tests live in `tests/unit`.
- Deterministic operational simulations live in `tests/playbooks`.
- Browser workflows live in `tests/e2e`.
- `tests/e2e/user-guide.spec.ts` is the single source of truth for screenshots embedded in `docs/USER_GUIDE.de.md`. UI changes that affect those views must update the scenario when necessary, run `npm run test:e2e:guide`, visually inspect every regenerated file in `docs/assets/user-guide/`, and keep the Markdown references valid. Do not hand-edit the generated PNGs.
- Use `MutableClock` or the E2E test API for time; no long real sleeps.
- Validate plans independently with `validatePlan()`.
- A timed-out solver result must still be invariant-valid.
- Keep the deterministic month playbook stable and add realistic scenarios when a new operational feature is introduced.
- Random tests must use committed fixed seeds and assert observations/invariants, not rely on chance.

## Useful commands

```bash
npm ci
npm run dev
npm run check
npm run test:unit
npm run test:playbooks
npm run report:playbooks
npx playwright install chromium
npm run test:e2e
npm run test:e2e:guide
npm run test:e2e:file
npm run build
npm run build:file
npm run verify
```

Use `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium` when CI provides a system browser.

## Before handing off

- Ensure `dist/` comes from `npm run build`, not `build:e2e`, and that `dist-file/Hand-aufs-Herz.html` comes from the same final production build.
- Ensure `reports/` reflects the latest successful runs.
- Exclude `node_modules`, `test-results`, and `playwright-report` from archives.
- Include source, `package-lock.json`, tests, docs, reports, production `dist/`, and the self-contained `dist-file/Hand-aufs-Herz.html`.
- Include the regenerated `docs/assets/user-guide/` screenshots and verify that every image referenced by the user guide exists.
- Validate the archive with `unzip -t` and, ideally, a clean `npm ci` plus core verification.
