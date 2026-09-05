<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { AppState, TableDefinition } from '../domain/model';
  import { dateToServiceDate, formatServiceDate } from '../domain/time';
  import {
    timelineCenterForDate,
    timelineDateMarkers,
    timelineEpochAtPosition,
    timelinePositionAt,
    timelineProjection,
    timelineSpanLabel,
    timelineTickMinutes,
    timelineTimeMarkers,
    timelineVisibleMinutes,
    timelineWindow,
    timelineZoomForVisibleMinutes,
  } from '../domain/tableTimeline';
  import LocalDatePicker from './LocalDatePicker.svelte';
  import TableTimelineLane from './TableTimelineLane.svelte';

  export let state: AppState;
  export let table: TableDefinition;
  export let now: number;
  export let onreservation: (id: string) => void;
  export let onfreeslot: (serviceDate: string, startTime: string) => void;

  let zoomLevel = timelineZoomForVisibleMinutes(6 * 60);
  let centerAt = timelineCenterForDate(state.ui.selectedServiceDate, state.settings);
  let visibleCenterAt = centerAt;
  let viewportWidth = 420;
  let scrollElement: HTMLDivElement;
  let rebasing = false;
  let pointerScrolling = false;
  let rebaseTimeout: ReturnType<typeof setTimeout> | undefined;
  $: visibleMinutes = timelineVisibleMinutes(zoomLevel);
  $: window = timelineWindow(centerAt, visibleMinutes, viewportWidth);
  $: projection = timelineProjection(state, window, viewportWidth);
  $: dateMarkers = timelineDateMarkers(state, window, projection);
  $: timeMarkers = timelineTimeMarkers(window, projection);
  $: tickMinutes = timelineTickMinutes(visibleMinutes);

  function left(at: number): number {
    return timelinePositionAt(at, projection);
  }

  function currentCenter(): number {
    return scrollElement
      ? timelineEpochAtPosition(scrollElement.scrollLeft + viewportWidth / 2, projection)
      : centerAt;
  }

  async function recenter(): Promise<void> {
    rebasing = true;
    await tick();
    scrollElement.scrollLeft = Math.max(0, left(centerAt) - viewportWidth / 2);
    await tick();
    rebasing = false;
  }

  async function setCenter(at: number): Promise<void> {
    clearScheduledRebase();
    centerAt = at;
    visibleCenterAt = at;
    await recenter();
  }

  async function changeZoom(event: Event): Promise<void> {
    const preserved = currentCenter();
    zoomLevel = Number((event.currentTarget as HTMLInputElement).value);
    await setCenter(preserved);
  }

  async function jumpTo(serviceDate: string): Promise<void> {
    if (/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      await setCenter(timelineCenterForDate(serviceDate, state.settings));
    }
  }

  function handleScroll(): void {
    if (rebasing) return;
    visibleCenterAt = currentCenter();
    const maximumScroll = Math.max(0, projection.width - viewportWidth);
    if (scrollElement.scrollLeft < viewportWidth || scrollElement.scrollLeft > maximumScroll - viewportWidth) {
      scheduleRebase();
    } else {
      clearScheduledRebase();
    }
  }

  function clearScheduledRebase(): void {
    if (rebaseTimeout !== undefined) {
      clearTimeout(rebaseTimeout);
      rebaseTimeout = undefined;
    }
  }

  function scheduleRebase(): void {
    clearScheduledRebase();
    rebaseTimeout = setTimeout(() => {
      rebaseTimeout = undefined;
      if (pointerScrolling) {
        scheduleRebase();
        return;
      }
      void setCenter(currentCenter());
    }, 160);
  }

  function finishPointerScroll(): void {
    pointerScrolling = false;
  }

  onMount(() => {
    const resize = new ResizeObserver(() => {
      const next = Math.max(240, scrollElement.clientWidth);
      if (Math.abs(next - viewportWidth) > 1) {
        const preserved = currentCenter();
        viewportWidth = next;
        void setCenter(preserved);
      }
    });
    resize.observe(scrollElement);
    globalThis.window.addEventListener('pointerup', finishPointerScroll);
    globalThis.window.addEventListener('pointercancel', finishPointerScroll);
    viewportWidth = Math.max(240, scrollElement.clientWidth);
    void recenter();
    return () => {
      clearScheduledRebase();
      resize.disconnect();
      globalThis.window.removeEventListener('pointerup', finishPointerScroll);
      globalThis.window.removeEventListener('pointercancel', finishPointerScroll);
    };
  });
</script>

<section class="table-day-timeline" data-testid="table-timeline-view" data-visible-minutes={visibleMinutes}>
  <div class="table-timeline-heading"><strong>Belegungszeit</strong><span>Endlos scrollen oder Datum wählen</span></div>
  <div class="table-timeline-controls">
    <LocalDatePicker label="Tisch-Zeitleiste Datum" value={dateToServiceDate(new Date(visibleCenterAt))} onchange={(serviceDate) => void jumpTo(serviceDate)} />
    <label class="timeline-zoom"><span>Zeitraum</span><input aria-label="Tisch-Zeitleiste Zoom" type="range" min="0" max="1000" step="1" value={zoomLevel} oninput={(event) => void changeZoom(event)} /><b>{timelineSpanLabel(visibleMinutes)}</b></label>
  </div>
  <div class="table-timeline-scroll" role="region" aria-label={`Belegungszeitleiste Tisch ${table.number}`} bind:this={scrollElement} onscroll={handleScroll} onpointerdown={() => { pointerScrolling = true; clearScheduledRebase(); }}>
    <div class="table-timeline-axis" style={`width:${projection.width}px`}>
      <div class="timeline-date-axis" data-testid="table-date-axis">
        {#each dateMarkers as marker}
          <i class="timeline-date-boundary" style={`left:${left(marker.boundaryAt)}px`} aria-hidden="true"></i>
          {#if visibleMinutes > 24 * 60 && marker.showLabel}<time style={`left:${left(marker.at)}px`}>{marker.label}</time>{/if}
        {/each}
        {#if visibleMinutes <= 24 * 60}<time class="timeline-visible-date" style={`left:${left(visibleCenterAt)}px`}>{formatServiceDate(dateToServiceDate(new Date(visibleCenterAt)))}</time>{/if}
      </div>
      <div class="timeline-time-axis" data-testid="table-time-axis" data-tick-minutes={tickMinutes}>
        {#each projection.segments.filter((segment) => !segment.open) as segment}
          <span class="timeline-closed-axis" style={`left:${left(segment.startAt)}px;width:${Math.max(1, left(segment.endAt) - left(segment.startAt))}px`} aria-hidden="true"></span>
        {/each}
        {#each timeMarkers as marker}<time class:major={marker.major} class:without-label={!marker.showLabel} style={`left:${left(marker.at)}px`}>{marker.showLabel ? marker.label : ''}</time>{/each}
      </div>
    </div>
    <TableTimelineLane {state} {table} {window} {projection} {now} {onreservation} {onfreeslot} compact />
  </div>
</section>
