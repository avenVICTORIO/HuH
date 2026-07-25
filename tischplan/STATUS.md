# Project Status

Verification date: **2026-07-14**

## Verified

- Svelte/TypeScript diagnostics: 0 errors, 0 warnings.
- Unit tests: 29 passed.
- Browser E2E tests: 11 passed in Chromium, including weekly opening hours, arrival CTA timing, 1024×768, and 390×844 layout coverage.
- Rush recovery E2E coverage verifies that **Abgleich öffnen** selects the operational tab and starts reconciliation from an already-open drawer.
- Deterministic screenshot review completed for the floor, operations drawer, table detail, reservation wizard, mobile list, weekly opening hours, and early-arrival detail.
- Deterministic month playbook: 30/30 days executed; all required assertions passed.
- Seeded randomized observations: 120 services, 2,030 reservations, 0 invariant violations, 0 outside placements in 37 rainy trials.
- Production Vite build and browser smoke: successful; test-only API absent.
- Clean `npm ci`: successful; `npm audit` reports 0 vulnerabilities.
- Backup browser round-trip: successful.

See `reports/verification.md` for the final command-level record.

## Deliberate limits

- Local single-browser persistence only; no cloud sync or concurrent-device merge.
- No authentication or role model.
- No legacy data migration.
- Native notifications require permission and an open application; no background push service.
- Backups are plain JSON containing personal data.
- The solver returns the best feasible incumbent within its time budget; it does not promise a proof of mathematical optimality.

There are no known failing committed tests at this handoff.
