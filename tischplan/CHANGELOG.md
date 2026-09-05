# Changelog

## 1.1.0 — 2026-07-15

Visual redesign and touch-workflow release; the domain model, persistence schema, and backup format are unchanged.

- Redesigned the visual system: muted petrol/sage/ochre palette on a light warm canvas, uniform control geometry and weights, flat secondary controls with shadows reserved for primary actions and floating surfaces, and subtle entrance motion honoring reduced-motion settings.
- Bundled the Inter variable font offline as an inlined data URI so typography is identical in dev, network builds, and the single-file filesystem build.
- Replaced the text brand block with the Hand aufs Herz logo.
- Compacted the chrome: slimmer top bar and banners, the Raumplan/Zeitplan switcher now shares a row with each view's toolbar on wide screens, and the schedule axis rows are tighter — roughly 90 px more vertical space for the plan.
- Consolidated date selection into the header day chip: tap opens a calendar, arrows step days, and a **Heute** shortcut appears when not on today; the schedule's separate date picker was removed.
- Moved the Innen/Außen switch onto the Raumplan (its only scope) and added vertical-swipe region switching on the map.
- Added table-card quick actions — confirm arrival, no-show, guests left, cleaning done, reset done — shown only when temporally plausible.
- Added gradual urgency highlighting on floor-plan tables approaching their next arrival, with a gentle pulse in the final minutes and a stronger overdue state.
- Added pinch-to-zoom in the Zeitplan and a red current-time line.
- Auto-Plan is now offered only while at least one unplaced reservation exists.
- Walk-ins can now be placed on joined table combinations: present guests wait during setup, so the join lead-time rule no longer applies to them (physical occupancy, cleaning, and rebuild conflicts remain enforced, and the prepare task appears immediately).
- Placed walk-ins are seated immediately — no separate arrival confirmation; auto-placement jumps the map to the right region and highlights the assigned table with a pulse that fades out smoothly on the next tap.
- Manual walk-in placement gained two reasoned overrides: a gap-shortened stay on a table that is free until a later reservation (duration truncated so cleaning and any join lead still fit), and joining a party that occupies a table exclusively (head count vs. capacity decides after staff asks the seated guests).
- The floor plan keeps table numbers visible on occupied tables, segments shared tables per party (including parties already in cleaning), and shows a "Reinigung" hint while part of a shared table is being cleaned.
- Every dialog with a close button (modals, operations drawer, task popover) now also closes on Escape; with stacked layers Escape closes the topmost first.
- Schedule lanes stack concurrent parties of a shared table into their own sub-rows instead of overlapping blocks; solo reservations keep the full lane height.
- The reservation wizard now sets the planned dwell time with a 15-minute touch stepper (following the party-size default until deliberately changed, with a one-tap return to the default), the summary step shows it, and the edit dialog replaces the raw minutes field with the same stepper.
- Open reservations and walk-ins now always lead the reservation list ("Noch zu platzieren" first), and the weather overlay shows only on the Raumplan so it never covers schedule lanes.
- Rebuilt the three-hour weather overlay as a plain-language terrace verdict (Draußen ok / unsicher / Nicht draußen, per-hour words, color-coded risk) and unified the weather glyphs to the emoji presentation.
- Fixed reservation-list cards rendering at content width instead of full width, floor-plan guest names overflowing their tables, and the reservation detail's assignment labels running into their values.

## 1.0.0 — 2026-07-14

- Rebuilt the prototype as a maintainable Svelte 5 + strict TypeScript application.
- Added a versioned domain model and single controller mutation boundary.
- Added exact-schema localStorage persistence and backup import/export without legacy migration.
- Added reservation-scoped single/joined table assignments.
- Added bounded pure-TypeScript automatic planning.
- Added configurable cleaning, join, split, duration, freeze, and notification timing.
- Added binding inside/outside preferences and rain/outside closure handling.
- Added capacity-based shared seating, including four solo walk-ins on one four-top.
- Added manual overrides with reasons and locked assignments.
- Added operational tasks, optional browser notifications, Rush mode, and reconciliation.
- Restored touch-first staged reservation and walk-in input.
- Added at-a-glance floor statuses and table timeline hierarchy.
- Refined the visual system so actions, information surfaces, segmented navigation, floor status outlines, and mobile layers are clearly distinguishable.
- Added visible keyboard focus, reduced-motion handling, accessible drawer/list close labels, and mobile overflow E2E coverage.
- Fixed **Abgleich öffnen** so it navigates an already-open drawer to the operational reconciliation workflow instead of appearing inactive.
- Added persisted weekly opening hours with a per-weekday closed state and automatic half-hour reservation choices.
- Delayed the assigned-reservation arrival CTA until 20 minutes before expected arrival, including recorded delays.
- Added deterministic mock-time unit, E2E, month-playbook, and randomized tests.
- Added operator, architecture, data, testing, operations, UX, and agent documentation.
- Updated the Svelte, Vite, Vitest, and Playwright toolchain to patched releases; the committed lockfile audits clean.
