# Operational Runbook

## Before service

1. Open the correct service date.
2. Check weekday opening hours when service times differ from the normal schedule.
3. Set weather and outside-area availability.
4. Open the task bell and review the currently due or near-due work.
5. Open **Auto-Plan**, inspect the preview, then apply it.
6. Resolve reservations left open rather than forcing an unsafe plan.
7. Complete table-joining preparation tasks as they become due.
8. Download a backup before an unusually important or complex service.

## Initial venue setup

1. Configure every weekday under **Betrieb → Daten & Zeiten**. Add separate opening intervals for split service and leave a day empty only when it is a closed day.
2. Verify meal duration, cleaning, joining, and reset timings against real operations; these values reserve physical capacity.
3. Search and save the venue location under **Betrieb → Betrieb** to enable the informational forecast.
4. Decide whether optional bar seats, automatic walk-in sharing, and native in-app-open notifications fit the venue.
5. Exercise one reservation through arrival, departure, and cleaning, then export a first backup.

Timeline views render open intervals at full scale and compress each continuous closed interval to at most one displayed hour. The hatch and axis break indicate this visual compression; all bookings and clicks still use real timestamps.

## Demonstration and test data

Under **Betrieb → Betrieb → Demo & Testdaten**, **Demo-Monat erzeugen** replaces reservations and day states with a deterministic 30-day workload while preserving venue settings. **Alles auf null** resets the complete local aggregate including settings. Both require an explicit confirmation; export a backup first when the browser profile contains relevant data.

## During service

- Confirm arrivals from the reservation or table detail. Walk-ins need no confirmation: placing them seats them immediately.
- Record meaningful delays.
- Mark no-shows explicitly.
- Add walk-ins immediately when practical.
- Use manual shared seating only when capacity permits; regular reservations need consent/override reason.
- Mark departures to start cleaning.
- Complete cleaning and, when required, table reset as separate real-world steps.

## Rain or sudden outside closure

The three-hour overlay and seven-day forecast are informational context only. Staff must still set **Regen/Trocken** and outside availability deliberately; forecast data never changes operations, tasks, reservations, or planning automatically.

1. Set **Regen** or close outside.
2. Existing outdoor assignments remain visible and produce critical conflict tasks.
3. Contact/confirm affected guests as appropriate.
4. Move a reservation manually with an override reason, or leave it open if no indoor capacity exists.
5. Re-run an Auto-Plan preview only after real departures/cleaning have been recorded.

The system does not assume indoor capacity appears merely because weather changed.

## Overload period

When updating every movement would slow service:

1. Start **Stoßbetrieb**.
2. Seat guests pragmatically in the room.
3. Native notifications pause; the UI clearly states that system state may be stale.
4. Do not use Auto-Plan as authoritative until reconciliation.

## Recovering from overload

1. End Rush mode.
2. Begin room reconciliation.
3. Confirm every active reservation:
   - at planned table,
   - at a different actual table,
   - no-show,
   - already gone/clean,
   - still unresolved.
4. Add unrecorded walk-ins.
5. Complete real cleaning/reset steps still open.
6. Finish reconciliation.
7. Preview a new plan for future, unseated reservations.

Actual seated guests become locked constraints. Future plans adapt around the recovered room state.

## When the solver leaves a reservation open

Treat this as a safety result, not a software failure. Check:

- requested region and weather,
- current/seated parties,
- cleaning completion,
- joined-table setup time,
- reset time from the preceding configuration,
- manual locks and freeze window,
- optional bar seats,
- whether sharing was permitted.

Then change a real assumption, make a justified manual placement, or keep the reservation unresolved.
