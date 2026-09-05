# Domain Model and Invariants

## Reservation lifecycle

```text
unassigned
  ├─ automatic/manual assignment → assigned
  ├─ cancel → cancelled
  └─ no-show → no-show

assigned
  ├─ arrive → seated
  ├─ unassign/edit placement-sensitive data → unassigned
  ├─ cancel → cancelled
  └─ no-show → no-show

seated
  └─ guests leave → cleaning

cleaning
  ├─ single table: cleaning complete → done
  ├─ same joined configuration continues: cleaning complete → done
  └─ joined configuration changes: cleaning complete → reset open → done
```

`done`, `no-show`, and `cancelled` remain in history and audit views but do not consume planning resources.

## Assignment lifecycle

An assignment records:

- legal table option and physical table IDs,
- region and capacity snapshot,
- exclusive/shared mode,
- auto/manual/recovery source,
- lock state,
- assignment timestamp,
- optional joined-table preparation timestamp,
- optional override reason.

Manual assignments are locked by default. Seated and cleaning reservations are always fixed. Auto assignments inside the freeze window are also fixed.

## Hard invariants

The code and tests enforce these properties:

1. A reservation never exceeds the capacity of its table option.
2. Outside options are unavailable when it rains or the outside area is closed.
3. Auto-Plan obeys a non-`none` seating preference.
4. Manual preference/sharing exceptions require a written reason.
5. Exclusive placements sharing a physical table must have enough cleanup/reset/setup time between them.
6. Shared placements are allowed only on one physical table and only when sharing is permitted or explicitly overridden.
7. The sum of guests on a shared table, through each party's cleaning interval, never exceeds capacity.
8. Tisch 17 and 17A jointly expose only one shared fourth seat.
9. Joined tables must be ready before arrival — except for walk-ins, whose guests are present and wait during setup; the join task then becomes due immediately.
10. A changed table configuration requires prior cleaning, split/reset, and next setup.
11. Active real-world occupancy is never silently displaced by planning.
12. A plan that cannot satisfy these constraints leaves the reservation unassigned.

## Service-day state

Each date has:

- `weather`: `dry` or `rain`,
- `outsideOpen`,
- Rush/reconciliation state,
- free-form operational notes.

Rain forces `outsideOpen = false`. Removing rain does not automatically reopen outside; staff retain control.

Weekly opening hours are settings-level policy, stored as zero or more non-overlapping intervals for every weekday. An empty interval list means that weekday is closed. The reservation wizard derives its half-hour choices from every interval on the selected service date and never offers a time in a closed gap. Intervals are same-calendar-day and require closing time to be later than opening time.

## Rush state

```text
off → active → reconciliation-needed → reconciling → off
```

Rush mode intentionally weakens only the system's claim of completeness, not physical validation. Recovery placements still cannot exceed capacity or overlap seated guests.

## Tasks

Tasks are projections of reservation/service state. Stable task IDs allow persisted snooze/completion and exactly-once native notification receipts.

Operational actions such as cleaning and setup are completed by changing the underlying reservation state, not by merely acknowledging the task.
