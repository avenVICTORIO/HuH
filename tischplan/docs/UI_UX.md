# Tablet UI and UX Principles

## Information hierarchy

1. **Floor plan** — primary, always visible at normal tablet widths.
2. **Current tasks on demand** — a counted bell opens the shared task list without permanently reducing the floor-plan height; active Rush remains the exceptional persistent warning.
3. **Reservation list** — compact chronological/operational context.
4. **Operations drawer** — tasks, weather, Rush, settings, backup, audit.
5. **Modals** — one focused workflow with a clear finish or cancel state; child views provide an explicit route back to their parent context.

Adding a feature must not add another permanent dashboard panel unless it is essential during nearly every service minute.

## Visual language

- Information surfaces are quiet and mostly borderless. Muted fills group facts without making them look tappable.
- Actions use a stronger edge, elevation, or filled color. Primary actions are filled; secondary actions remain raised white controls.
- Time-sensitive actions appear only when operationally relevant; arrival confirmation starts 20 minutes before expected arrival and No-Show at the expected arrival time. Walk-ins skip arrival confirmation entirely — placing one seats it immediately, and auto-placement highlights the assigned table on the floor plan until the next tap fades it out.
- Date and current time form the strongest compact information block in the header; the clock remains at least 19 px at the narrow breakpoint.
- Segmented navigation uses one shared track with a raised active item instead of four competing outlined buttons.
- Floor-plan status uses both a tinted fill and a strong outline. The room boundary remains visible behind free tables.
- Critical red is reserved for conflicts and destructive intent; operational actions use petrol, green, or amber.
- Keyboard focus is always visible, and reduced-motion preferences disable non-essential transitions.

## Touch behavior

- Primary touch controls use a minimum height around 44 px.
- Number, date, time, and preference entry use large dedicated controls.
- Destructive actions require a deliberate confirmation.
- The operations drawer is bounded to `100dvh` and owns its scroll surface, so settings and backup controls remain reachable on tablets.
- At narrow widths the reservation list becomes a slide-in panel while the floor remains primary.

## Floor-plan at-a-glance rules

A table renders only the highest-value current label:

- current party/aggregate occupancy,
- cleaning state,
- nearest upcoming party,
- closed/free fallback.

Joined configurations use an outline instead of physically moving table definitions. Color/status and text must both communicate meaning.

## Table detail hierarchy

- Current parties are listed first.
- The next reservation gets the largest card and strongest time cue.
- Later reservations use compact rows.
- Placement is available from the same view, but does not compete visually with the timeline.
- A table without current or future reservations shows one explicit empty state and no synthetic “next reservation” copy.
- Placement is hidden unless at least one unassigned reservation has a valid placement choice for that physical table.
- Closed periods in table and grouped timelines are hatched and compressed to at most one displayed hour; open intervals keep full scale and every position remains invertible to its real timestamp.
- Timeline headers reserve separate rows for calendar dates and clock times. Half-hour ticks remain at detailed zoom and hourly ticks remain at every wider zoom; labels may thin out, but the grid does not disappear.
- Sub-day timelines use a stable pixel scale independent of whether their center is open or closed. Their 30-day buffers avoid re-projecting during ordinary multi-day scrolling; edge re-centering waits until the active pointer/scroll gesture has ended.

## Date and reservation search input

- User-facing date fields display the local `TT.MM.JJJJ` format and pair editable text with a separate 44 px calendar target.
- The reservation search stays anchored to the selected service date, normalizes phone punctuation, explicitly searches across status filters while active, and has one clear 44 px reset action.

## Workflow completion

Every modal should end in one of three states:

- completed and closed with toast feedback,
- deliberately returned to a clear prior step,
- cancelled without mutation.

Avoid “dead-end” informational dialogs. If an exception requires action, show the next operational action in the same context.

Do not render mutation controls that cannot change state. A zero-change plan preview closes as information; it does not offer an apply button. Global planning is hidden when all active reservations are physically fixed.
