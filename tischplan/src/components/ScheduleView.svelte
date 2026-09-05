<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { AppState, Region, TableDefinition } from '../domain/model';
  import { TABLES } from '../domain/tableCatalog';
  import { dateToServiceDate, formatServiceDate, MINUTE_MS, serviceDateTime } from '../domain/time';
  import { openingHoursForDate } from '../domain/settings';
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
  import TableTimelineLane from './TableTimelineLane.svelte';

  export let state: AppState;
  export let now: number;
  export let onreservation: (id: string) => void;
  export let onfreeslot: (tableId: string, serviceDate: string, startTime: string) => void;
  export let ontable: (tableId: string) => void;
  export let ondatechange: (serviceDate: string) => void;

  let zoomLevel = timelineZoomForVisibleMinutes(9 * 60);
  let centerAt = initialCenterForDate(state.ui.selectedServiceDate);
  let visibleCenterAt = centerAt;
  let viewportWidth = 700;
  let scrollElement: HTMLDivElement;
  let rebasing = false;
  let programmaticScroll = false;
  let pointerScrolling = false;
  let rebaseTimeout: ReturnType<typeof setTimeout> | undefined;
  let selectedDate = state.ui.selectedServiceDate;
  let collapsed: Record<Region, boolean> = { inside: false, outside: false };

  $: visibleMinutes = timelineVisibleMinutes(zoomLevel);
  $: window = timelineWindow(centerAt, visibleMinutes, viewportWidth);
  $: projection = timelineProjection(state, window, viewportWidth);
  $: dateMarkers = timelineDateMarkers(state, window, projection);
  $: timeMarkers = timelineTimeMarkers(window, projection);
  $: tickMinutes = timelineTickMinutes(visibleMinutes);
  // Reactive statements (not inline template calls) so the position tracks
  // projection rebuilds from zooming/rebasing, not only the 30 s clock tick.
  $: nowLineVisible = now >= window.startAt && now <= window.endAt;
  $: nowLineLeft = timelinePositionAt(now, projection);

  $: if (state.ui.selectedServiceDate !== selectedDate) {
    selectedDate = state.ui.selectedServiceDate;
    void jumpTo(state.ui.selectedServiceDate);
  }

  function tables(region: Region): TableDefinition[] {
    return TABLES
      .filter((table) => table.region === region)
      .sort((left, right) => Number(left.isBarSeat) - Number(right.isBarSeat));
  }

  function left(at: number): number {
    return timelinePositionAt(at, projection);
  }

  function currentVisibleCenter(): number {
    if (!scrollElement) {
      return centerAt;
    }
    return timelineEpochAtPosition(scrollElement.scrollLeft + viewportWidth / 2, projection);
  }

  async function recenter(): Promise<void> {
    rebasing = true;
    await tick();
    if (scrollElement) {
      programmaticScroll = true;
      scrollElement.scrollLeft = Math.max(0, left(centerAt) - viewportWidth / 2);
    }
    await tick();
    rebasing = false;
  }

  async function setCenter(at: number): Promise<void> {
    clearScheduledRebase();
    centerAt = at;
    visibleCenterAt = at;
    await recenter();
  }

  // Today centers on the current time (placed a quarter in from the left so the
  // upcoming hours dominate) — otherwise the "now" line would sit far off-screen
  // outside service hours. Other days center on their service midpoint.
  function initialCenterForDate(serviceDate: string): number {
    if (serviceDate === dateToServiceDate(new Date(now))) {
      const firstInterval = openingHoursForDate(serviceDate, state.settings).intervals[0];
      const opensAt = firstInterval ? serviceDateTime(serviceDate, firstInterval.opensAt) : undefined;
      // Once service has begun, center on the current time (bounded quarter-window
      // offset keeps "now" a quarter in from the left without drifting days at
      // coarse zooms). Before opening, the service midpoint is the useful view.
      if (opensAt !== undefined && now >= opensAt) {
        return now + Math.min(timelineVisibleMinutes(zoomLevel), 12 * 60) * MINUTE_MS / 4;
      }
    }
    return timelineCenterForDate(serviceDate, state.settings);
  }

  async function jumpTo(serviceDate: string): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      return;
    }
    await setCenter(initialCenterForDate(serviceDate));
  }

  function syncVisibleDate(): void {
    const visibleServiceDate = dateToServiceDate(new Date(visibleCenterAt));
    if (visibleServiceDate !== selectedDate) {
      selectedDate = visibleServiceDate;
      ondatechange(visibleServiceDate);
    }
  }

  async function changeZoom(event: Event): Promise<void> {
    const preservedCenter = currentVisibleCenter();
    zoomLevel = Number((event.currentTarget as HTMLInputElement).value);
    await setCenter(preservedCenter);
  }

  function handleScroll(): void {
    if (rebasing || !scrollElement) {
      return;
    }
    visibleCenterAt = currentVisibleCenter();
    if (programmaticScroll) {
      programmaticScroll = false;
    } else {
      syncVisibleDate();
    }
    const maximumScroll = Math.max(0, projection.width - viewportWidth);
    const outsideBufferedCenter = scrollElement.scrollLeft < viewportWidth
      || scrollElement.scrollLeft > maximumScroll - viewportWidth;
    if (outsideBufferedCenter) {
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
      void setCenter(currentVisibleCenter());
    }, 160);
  }

  function finishPointerScroll(): void {
    pointerScrolling = false;
  }

  let pinching = false;
  let pinchStartDistance = 0;
  let pinchStartVisibleMinutes = 0;
  let pinchAnchorAt = 0;

  function touchDistance(touches: TouchList): number {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  }

  function touchMidX(touches: TouchList): number {
    return (touches[0].clientX + touches[1].clientX) / 2 - scrollElement.getBoundingClientRect().left;
  }

  function handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 2) {
      return;
    }
    pinching = true;
    pointerScrolling = false;
    clearScheduledRebase();
    pinchStartDistance = touchDistance(event.touches);
    pinchStartVisibleMinutes = visibleMinutes;
    pinchAnchorAt = timelineEpochAtPosition(scrollElement.scrollLeft + touchMidX(event.touches), projection);
  }

  async function handleTouchMove(event: TouchEvent): Promise<void> {
    if (!pinching || event.touches.length !== 2) {
      return;
    }
    event.preventDefault();
    const scale = touchDistance(event.touches) / pinchStartDistance;
    if (!Number.isFinite(scale) || scale <= 0) {
      return;
    }
    zoomLevel = timelineZoomForVisibleMinutes(pinchStartVisibleMinutes / scale);
    centerAt = pinchAnchorAt;
    visibleCenterAt = pinchAnchorAt;
    rebasing = true;
    await tick();
    scrollElement.scrollLeft = Math.max(0, left(pinchAnchorAt) - touchMidX(event.touches));
    await tick();
    rebasing = false;
  }

  function handleTouchEnd(event: TouchEvent): void {
    if (pinching && event.touches.length < 2) {
      pinching = false;
      void setCenter(currentVisibleCenter());
    }
  }

  onMount(() => {
    const resize = new ResizeObserver(() => {
      const nextWidth = Math.max(240, scrollElement.clientWidth - 116);
      if (Math.abs(nextWidth - viewportWidth) > 1) {
        const preservedCenter = currentVisibleCenter();
        viewportWidth = nextWidth;
        void setCenter(preservedCenter);
      }
    });
    resize.observe(scrollElement);
    globalThis.window.addEventListener('pointerup', finishPointerScroll);
    globalThis.window.addEventListener('pointercancel', finishPointerScroll);
    viewportWidth = Math.max(240, scrollElement.clientWidth - 116);
    void recenter();
    return () => {
      clearScheduledRebase();
      resize.disconnect();
      globalThis.window.removeEventListener('pointerup', finishPointerScroll);
      globalThis.window.removeEventListener('pointercancel', finishPointerScroll);
    };
  });
</script>

<section class="schedule-view" data-testid="schedule-view" data-visible-minutes={visibleMinutes}>
  <header class="schedule-toolbar timeline-toolbar">
    <div><strong>Tischbelegung</strong><span>Freie Öffnungszeit antippen und direkt reservieren.</span></div>
    <label class="timeline-zoom"><span>Zeitraum</span><input aria-label="Zeitplan Zoom" type="range" min="0" max="1000" step="1" value={zoomLevel} oninput={(event) => void changeZoom(event)} /><b>{timelineSpanLabel(visibleMinutes)}</b></label>
  </header>

  <div class="schedule-scroll" role="region" aria-label="Tischbelegungszeitplan" bind:this={scrollElement} onscroll={handleScroll} onpointerdown={() => { pointerScrolling = true; clearScheduledRebase(); }} ontouchstart={handleTouchStart} ontouchmove={handleTouchMove} ontouchend={handleTouchEnd} ontouchcancel={handleTouchEnd}>
    <div class="schedule-content" style={`width:${projection.width + 116}px`}>
      {#if nowLineVisible}
        <i class="timeline-now-line" data-testid="timeline-now-line" style={`left:${116 + nowLineLeft}px`} aria-hidden="true"></i>
      {/if}
      <div class="schedule-axis-row">
        <div class="schedule-corner">Tisch</div>
        <div class="schedule-axis" style={`width:${projection.width}px`}>
          <div class="timeline-date-axis" data-testid="schedule-date-axis">
            {#each dateMarkers as marker}
              <i class="timeline-date-boundary" style={`left:${left(marker.boundaryAt)}px`} aria-hidden="true"></i>
              {#if visibleMinutes > 24 * 60 && marker.showLabel}<time style={`left:${left(marker.at)}px`}>{marker.label}</time>{/if}
            {/each}
            {#if visibleMinutes <= 24 * 60}<time class="timeline-visible-date" data-testid="timeline-visible-date" data-service-date={dateToServiceDate(new Date(visibleCenterAt))} style={`left:${left(visibleCenterAt)}px`}>{formatServiceDate(dateToServiceDate(new Date(visibleCenterAt)))}</time>{/if}
          </div>
          <div class="timeline-time-axis" data-testid="schedule-time-axis" data-tick-minutes={tickMinutes}>
            {#each projection.segments.filter((segment) => !segment.open) as segment}
              <span class="timeline-closed-axis" style={`left:${left(segment.startAt)}px;width:${Math.max(1, left(segment.endAt) - left(segment.startAt))}px`} aria-hidden="true"></span>
            {/each}
            {#each timeMarkers as marker}
              <time class:major={marker.major} class:without-label={!marker.showLabel} style={`left:${left(marker.at)}px`}>{marker.showLabel ? marker.label : ''}</time>
            {/each}
            {#if nowLineVisible}
              <i class="timeline-now-axis-marker" style={`left:${nowLineLeft}px`} aria-hidden="true"></i>
            {/if}
          </div>
        </div>
      </div>

      {#each [{ id: 'inside' as Region, label: 'Innen' }, { id: 'outside' as Region, label: 'Außen' }] as group}
        <button class="schedule-group" type="button" onclick={() => collapsed[group.id] = !collapsed[group.id]}>
          <strong>{collapsed[group.id] ? '▸' : '▾'} {group.label}</strong><span>{tables(group.id).length} Tische</span>
        </button>
        {#if !collapsed[group.id]}
          {#each tables(group.id) as table}
            <div class:disabled-table={table.isBarSeat && !state.settings.useBarSeatsForSingles} class="schedule-lane-row">
              <button class="schedule-table-label" type="button" onclick={() => ontable(table.id)} title={`Tisch ${table.number} öffnen`}>
                <strong>{table.number}</strong><span>{table.isBarSeat && !state.settings.useBarSeatsForSingles ? 'Bar aus' : `${table.capacity}P`}</span>
              </button>
              <TableTimelineLane
                {state}
                {table}
                {window}
                {projection}
                {now}
                {onreservation}
                onfreeslot={(serviceDate, startTime) => onfreeslot(table.id, serviceDate, startTime)}
              />
            </div>
          {/each}
        {/if}
      {/each}
    </div>
  </div>
</section>
