<script lang="ts">
  import type { AppState, TableDefinition } from '../domain/model';
  import { dateToServiceDate, formatClock, MINUTE_MS } from '../domain/time';
  import {
    tableSlotIsAvailableAt,
    timelineOpeningsBetween,
    timelinePositionAt,
    timelineReservationsForTableBetween,
    timelineTickMinutes,
    type TimelineOpening,
    type TimelineProjection,
    type TimelineWindow,
  } from '../domain/tableTimeline';

  export let state: AppState;
  export let table: TableDefinition;
  export let window: TimelineWindow;
  export let projection: TimelineProjection;
  export let now: number;
  export let onreservation: (id: string) => void;
  export let onfreeslot: (serviceDate: string, startTime: string) => void;
  export let compact = false;

  type TimelineEntry = ReturnType<typeof timelineReservationsForTableBetween>[number];
  interface StackedEntry {
    entry: TimelineEntry;
    track: number;
    tracks: number;
  }

  // Parties sharing a table overlap in time; each concurrent party gets its own
  // sub-row within the lane. Non-overlapping reservations keep the full height.
  function stackEntries(entries: TimelineEntry[]): StackedEntry[] {
    const sorted = [...entries].sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt);
    const result: StackedEntry[] = [];
    let cluster: { entry: TimelineEntry; track: number }[] = [];
    let trackEnds: number[] = [];
    let clusterEnd = Number.NEGATIVE_INFINITY;
    const flush = () => {
      for (const item of cluster) {
        result.push({ ...item, tracks: trackEnds.length });
      }
      cluster = [];
      trackEnds = [];
    };
    for (const entry of sorted) {
      if (entry.startAt >= clusterEnd) {
        flush();
        clusterEnd = entry.endAt;
      } else {
        clusterEnd = Math.max(clusterEnd, entry.endAt);
      }
      let track = trackEnds.findIndex((end) => end <= entry.startAt);
      if (track === -1) {
        track = trackEnds.length;
        trackEnds.push(entry.endAt);
      } else {
        trackEnds[track] = entry.endAt;
      }
      cluster.push({ entry, track });
    }
    flush();
    return result;
  }

  $: reservations = timelineReservationsForTableBetween(state, table.id, window.startAt, window.endAt);
  $: stackedReservations = stackEntries(reservations);
  $: openings = timelineOpeningsBetween(state, window.startAt, window.endAt);
  $: tickMinutes = timelineTickMinutes(window.visibleMinutes);
  $: tickWidth = Math.max(1, tickMinutes * projection.pixelsPerDisplayMinute);

  function left(at: number): number {
    return timelinePositionAt(at, projection);
  }

  function tickOffset(at: number): number {
    const date = new Date(at);
    const clockMinute = date.getHours() * 60 + date.getMinutes();
    const minutesUntilTick = (tickMinutes - clockMinute % tickMinutes) % tickMinutes;
    return (minutesUntilTick - tickMinutes) * projection.pixelsPerDisplayMinute;
  }

  function selectFreeSlot(event: MouseEvent, opening: TimelineOpening): void {
    const target = event.currentTarget as HTMLElement;
    const bounds = target.getBoundingClientRect();
    const ratio = event.detail === 0 ? .5 : Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const rawAt = opening.startAt + ratio * (opening.endAt - opening.startAt);
    const slotAt = Math.round(rawAt / (15 * MINUTE_MS)) * 15 * MINUTE_MS;
    if (!tableSlotIsAvailableAt(state, table, slotAt, now)) {
      return;
    }
    onfreeslot(dateToServiceDate(new Date(slotAt)), formatClock(slotAt));
  }

</script>

<div
  class:compact
  class="table-timeline-track"
  style={`width:${projection.width}px`}
  data-testid={`timeline-${table.id}`}
  title="Freie Öffnungszeit anklicken, um direkt zu reservieren"
>
  {#each openings as opening}
    <button
      type="button"
      class="timeline-open-range"
      data-opening-date={opening.serviceDate}
      data-opening-start={formatClock(opening.startAt)}
      data-opening-end={formatClock(opening.endAt)}
      aria-label={`Freie Zeit für Tisch ${table.number} am ${opening.serviceDate} wählen`}
      style={`left:${left(opening.startAt)}px;width:${Math.max(0, left(opening.endAt) - left(opening.startAt))}px;--timeline-tick-width:${tickWidth}px;--timeline-tick-offset:${tickOffset(opening.startAt)}px`}
      onclick={(event) => selectFreeSlot(event, opening)}
    ></button>
  {/each}
  {#each stackedReservations as { entry, track, tracks }}
    {@const totalWidth = Math.max(3, left(entry.endAt) - left(entry.startAt))}
    {@const mealWidth = Math.max(2, left(entry.mealEndAt) - left(entry.startAt))}
    <button
      class={`timeline-reservation ${entry.reservation.status}`}
      class:micro={totalWidth < 30}
      class:stacked={tracks > 1}
      type="button"
      style={`left:${left(entry.startAt)}px;width:${totalWidth}px${tracks > 1 ? `;top:calc(${(track / tracks) * 100}% + 3px);height:calc(${100 / tracks}% - 5px);bottom:auto` : ''}`}
      title={`${entry.reservation.serviceDate} · ${entry.reservation.startTime} · ${entry.reservation.name} · ${entry.reservation.partySize} Personen`}
      onclick={(event) => { event.stopPropagation(); onreservation(entry.reservation.id); }}
      data-testid={`timeline-reservation-${entry.reservation.id}-${table.id}`}
    >
      <span class="timeline-meal" style={`width:${Math.min(totalWidth, mealWidth)}px`}></span>
      <strong>{entry.reservation.name}</strong>
      <small>{entry.reservation.startTime} · {entry.reservation.partySize}P</small>
    </button>
  {/each}
</div>
