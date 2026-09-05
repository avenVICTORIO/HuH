<script lang="ts">
  import type { AppState, Region, Reservation, TableDefinition } from '../domain/model';
  import { FLOOR_FIXTURES, TABLES, tableById } from '../domain/tableCatalog';
  import { reservationStart } from '../domain/time';

  export let state: AppState;
  export let now: number;
  export let ontable: (tableId: string) => void;
  export let placementReservationId: string | undefined;
  export let onregion: (region: Region) => void;
  export let highlightTableIds: string[] = [];
  export let onclearhighlight: () => void = () => {};

  interface TableView {
    status: 'free' | 'future' | 'soon' | 'overdue' | 'seated' | 'cleaning' | 'closed';
    primary: string;
    secondary: string;
    count: number;
    urgency?: number;
    shared?: boolean;
    freeSeats?: number;
  }

  function activeReservations(tableId: string): Reservation[] {
    return state.reservations
      .filter((reservation) => (
        reservation.serviceDate === state.ui.selectedServiceDate
        && reservation.assignment?.tableIds.includes(tableId)
        && !['cancelled', 'no-show'].includes(reservation.status)
      ))
      .sort((left, right) => reservationStart(left) - reservationStart(right));
  }

  // Tische, die physisch aus mehreren Einzeltischen bestehen (gestrichelte Fuge).
  const SEAM_COUNT: Record<string, number> = { '1': 1, '6': 1, '9': 2, '11': 1, '12': 1, '13': 1, '14': 1 };

  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeTracking = false;
  let fadingTableIds: string[] = [];
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;

  function clearHighlight(): void {
    if (highlightTableIds.length === 0) {
      return;
    }
    fadingTableIds = [...highlightTableIds];
    onclearhighlight();
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => fadingTableIds = [], 1_700);
  }

  function swipeStart(event: TouchEvent): void {
    swipeTracking = event.touches.length === 1;
    if (swipeTracking) {
      swipeStartX = event.touches[0].clientX;
      swipeStartY = event.touches[0].clientY;
    }
  }

  function swipeEnd(event: TouchEvent): void {
    if (!swipeTracking) {
      return;
    }
    swipeTracking = false;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    if (Math.abs(deltaY) > 70 && Math.abs(deltaY) > Math.abs(deltaX) * 1.6) {
      onregion(state.ui.selectedRegion === 'inside' ? 'outside' : 'inside');
    }
  }

  function fitLabel(text: string, tableWidth: number): string {
    const maxChars = Math.max(5, Math.floor(tableWidth / 6.4));
    return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
  }

  function viewFor(table: TableDefinition): TableView {
    const reservations = activeReservations(table.id);
    const seated = reservations.filter((reservation) => reservation.status === 'seated');
    const cleaning = reservations.filter((reservation) => reservation.status === 'cleaning');
    const upcoming = reservations.filter((reservation) => reservation.status === 'assigned');
    const day = state.serviceDays[state.ui.selectedServiceDate];

    if (seated.length > 0) {
      const used = seated.reduce((sum, reservation) => sum + reservation.partySize, 0);
      const shared = seated.some((reservation) => reservation.assignment?.mode === 'shared');
      return {
        status: 'seated',
        primary: seated[0].source === 'walk-in' ? 'Walk-in' : seated[0].name,
        secondary: `${used}/${table.capacity}P${seated.length > 1 ? ` · +${seated.length - 1}` : ''}${cleaning.length > 0 ? ' · Reinigung' : ''}`,
        count: seated.length + cleaning.length,
        shared,
        freeSeats: shared ? Math.max(0, table.capacity - used) : undefined,
      };
    }
    if (cleaning.length > 0) {
      return {
        status: 'cleaning',
        primary: 'Reinigung',
        secondary: cleaning[0].assignment && cleaning[0].assignment.tableIds.length > 1 ? 'danach Rückbau' : 'noch offen',
        count: cleaning.length,
      };
    }
    if (upcoming.length > 0) {
      const firstStart = reservationStart(upcoming[0]);
      const simultaneous = upcoming.filter((reservation) => reservationStart(reservation) === firstStart);
      const minutes = Math.round((firstStart - now) / 60_000);
      const sharedUpcoming = simultaneous.some((reservation) => reservation.assignment?.mode === 'shared');
      const upcomingUsed = simultaneous.reduce((sum, reservation) => sum + reservation.partySize, 0);
      return {
        status: minutes < 0 ? 'overdue' : minutes <= 45 ? 'soon' : 'future',
        urgency: minutes < 0 ? 1 : Math.max(0, Math.min(1, 1 - minutes / 60)),
        primary: upcoming[0].source === 'walk-in' ? 'Walk-in' : upcoming[0].name,
        secondary: `${upcoming[0].startTime} · ${upcomingUsed}P${simultaneous.length > 1 ? ` · +${simultaneous.length - 1}` : ''}`,
        count: simultaneous.length,
        shared: sharedUpcoming,
        freeSeats: sharedUpcoming ? Math.max(0, table.capacity - upcomingUsed) : undefined,
      };
    }
    if (table.region === 'outside' && day && (day.weather === 'rain' || !day.outsideOpen)) {
      return { status: 'closed', primary: table.number, secondary: 'geschlossen', count: 0 };
    }
    return { status: 'free', primary: table.number, secondary: `${table.capacity}P`, count: 0 };
  }

  function joinedAssignments(
    reservations: Reservation[],
    serviceDate: string,
    region: Region,
  ): { id: string; tableIds: string[]; status: string }[] {
    const seen = new Set<string>();
    const groups: { id: string; tableIds: string[]; status: string }[] = [];
    const relevant = reservations
      .filter((reservation) => (
        reservation.serviceDate === serviceDate
        && reservation.assignment
        && reservation.assignment.region === region
        && reservation.assignment.tableIds.length > 1
        && ['assigned', 'seated', 'cleaning'].includes(reservation.status)
      ))
      .sort((left, right) => reservationStart(left) - reservationStart(right));
    for (const reservation of relevant) {
      const key = reservation.assignment!.tableIds.slice().sort().join('+');
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ id: key, tableIds: reservation.assignment!.tableIds, status: reservation.status });
      }
    }
    return groups;
  }

  function bounds(tableIds: string[]): { x: number; y: number; width: number; height: number } {
    const members = tableIds.map((tableId) => {
      const table = tableById(tableId);
      const offset = dock.get(tableId) ?? { dx: 0, dy: 0 };
      return { x: table.x + offset.dx, y: table.y + offset.dy, width: table.width, height: table.height };
    });
    const x = Math.min(...members.map((table) => table.x)) - 8;
    const y = Math.min(...members.map((table) => table.y)) - 8;
    const right = Math.max(...members.map((table) => table.x + table.width)) + 8;
    const bottom = Math.max(...members.map((table) => table.y + table.height)) + 8;
    return { x, y, width: right - x, height: bottom - y };
  }

  // Optisches Anrücken (alte HaH-Logik): Neben-Tische einer Tafel docken an den
  // größten Tisch an; beim Auflösen springen sie automatisch zurück.
  function dockOffsets(
    activeGroups: { tableIds: string[] }[],
    tables: TableDefinition[],
    room: { x: number; y: number; width: number; height: number },
  ): Map<string, { dx: number; dy: number }> {
    const map = new Map<string, { dx: number; dy: number }>();
    const GAP = 2;
    for (const group of activeGroups) {
      const members = group.tableIds.map(tableById).sort((a, b) => b.capacity - a.capacity);
      const anchor = members[0];
      const others = members.slice(1);
      if (others.length === 0) continue;
      const obstacles = tables.filter((table) => !group.tableIds.includes(table.id));
      const tryDirection = (direction: 'right' | 'left' | 'down' | 'up') => {
        const positions: { id: string; x: number; y: number; width: number; height: number; ox: number; oy: number }[] = [];
        let right = anchor.x + anchor.width + GAP;
        let left = anchor.x - GAP;
        let down = anchor.y + anchor.height + GAP;
        let up = anchor.y - GAP;
        for (const table of others) {
          let nx = table.x; let ny = table.y;
          if (direction === 'right') { nx = right; ny = anchor.y + (anchor.height - table.height) / 2; right += table.width + GAP; }
          else if (direction === 'left') { nx = left - table.width; ny = anchor.y + (anchor.height - table.height) / 2; left = nx - GAP; }
          else if (direction === 'down') { ny = down; nx = anchor.x + (anchor.width - table.width) / 2; down += table.height + GAP; }
          else { ny = up - table.height; nx = anchor.x + (anchor.width - table.width) / 2; up = ny - GAP; }
          positions.push({ id: table.id, x: nx, y: ny, width: table.width, height: table.height, ox: table.x, oy: table.y });
        }
        let score = 0;
        for (const p of positions) {
          score += (Math.max(0, room.x - p.x) + Math.max(0, (p.x + p.width) - (room.x + room.width))
            + Math.max(0, room.y - p.y) + Math.max(0, (p.y + p.height) - (room.y + room.height))) * 100;
          for (const o of obstacles) {
            if (p.x < o.x + o.width && o.x < p.x + p.width && p.y < o.y + o.height && o.y < p.y + p.height) score += 100_000;
          }
        }
        return { positions, score };
      };
      const vertical = anchor.height >= anchor.width;
      const order: ('right' | 'left' | 'down' | 'up')[] = vertical
        ? ['down', 'up', 'right', 'left']
        : ['right', 'left', 'down', 'up'];
      let best: ReturnType<typeof tryDirection> | null = null;
      for (const direction of order) {
        const attempt = tryDirection(direction);
        if (!best || attempt.score < best.score) best = attempt;
      }
      for (const p of best!.positions) {
        if (!map.has(p.id)) map.set(p.id, { dx: p.x - p.ox, dy: p.y - p.oy });
      }
    }
    return map;
  }

  $: fixtures = FLOOR_FIXTURES[state.ui.selectedRegion];
  $: visibleTables = TABLES.filter((table) => table.region === state.ui.selectedRegion);
  $: groups = joinedAssignments(
    state.reservations,
    state.ui.selectedServiceDate,
    state.ui.selectedRegion,
  );
  $: dock = dockOffsets(groups, visibleTables, fixtures.room);
</script>

<section class:placing={placementReservationId} class="floor-panel">
  <div class="floor-caption">
    <div class="floor-legend" aria-label="Legende">
      <span class="legend seated">besetzt</span><span class="legend soon">bald</span><span class="legend free">frei</span>
    </div>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -- swipe and tap-to-dismiss are redundant shortcuts; buttons remain the accessible path -->
  <div class="svg-wrap" ontouchstart={swipeStart} ontouchend={swipeEnd} ontouchcancel={() => swipeTracking = false} onclick={clearHighlight}>
    <svg viewBox="0 0 900 540" role="img" aria-label="Raumplan" data-testid="floor-plan">
      <rect class="room" x={fixtures.room.x} y={fixtures.room.y} width={fixtures.room.width} height={fixtures.room.height} rx="16" />
      {#each fixtures.benches as bench}
        <rect class="bench" x={bench.x} y={bench.y} width={bench.width} height={bench.height} rx="5" />
      {/each}
      {#each fixtures.columns as column}
        <rect class="column" x={column.x} y={column.y} width={column.width} height={column.height} rx="3" />
      {/each}
      {#each fixtures.labels as label}
        <g class="fixture-label">
          <rect x={label.x} y={label.y} width={label.width} height={label.height} rx="5" />
          <text x={label.x + label.width / 2} y={label.y + label.height / 2 + 3}>{label.label}</text>
        </g>
      {/each}

      {#each groups as group}
        {@const box = bounds(group.tableIds)}
        <rect class:active-group={group.status === 'seated'} class="join-outline" x={box.x} y={box.y} width={box.width} height={box.height} rx="12" />
      {/each}

      {#each visibleTables as table (table.id)}
        {@const view = viewFor(table)}
        <g
          class={`table-svg ${view.status}`}
          class:shared={view.shared}
          class:imminent={view.status === 'soon' && (view.urgency ?? 0) >= 0.75}
          class:highlighted={highlightTableIds.includes(table.id)}
          class:highlight-fading={fadingTableIds.includes(table.id)}
          class:bar-disabled={table.isBarSeat && !state.settings.useBarSeatsForSingles}
          class:docked={dock.has(table.id)}
          style={`${view.urgency !== undefined ? `--urgency:${view.urgency.toFixed(2)};` : ''}transform: translate(${dock.get(table.id)?.dx ?? 0}px, ${dock.get(table.id)?.dy ?? 0}px)`}
          role="button"
          tabindex="0"
          aria-label={`Tisch ${table.number}: ${view.primary}, ${view.secondary}`}
          onclick={() => ontable(table.id)}
          onkeydown={(event) => event.key === 'Enter' && ontable(table.id)}
          data-testid={`table-${table.id}`}
        >
          <rect x={table.x} y={table.y} width={table.width} height={table.height} rx={table.shape === 'round' ? Math.min(table.width, table.height) / 2 : 9} />
          {#each table.seats as seat}
            {@const alongTop = seat.y <= 4 || seat.y >= table.height - 4}
            <rect
              class="seat-chair"
              x={table.x + seat.x - (alongTop ? 8 : 3.5)}
              y={table.y + seat.y - (alongTop ? 3.5 : 8)}
              width={alongTop ? 16 : 7}
              height={alongTop ? 7 : 16}
              rx="3.5"
            />
          {/each}
          {#if SEAM_COUNT[table.id]}
            {#each Array.from({ length: SEAM_COUNT[table.id] }) as _, seamIndex}
              {#if table.height >= table.width}
                <line
                  class="table-seam"
                  x1={table.x + 7}
                  x2={table.x + table.width - 7}
                  y1={table.y + table.height * (seamIndex + 1) / (SEAM_COUNT[table.id] + 1)}
                  y2={table.y + table.height * (seamIndex + 1) / (SEAM_COUNT[table.id] + 1)}
                />
              {:else}
                <line
                  class="table-seam"
                  x1={table.x + table.width * (seamIndex + 1) / (SEAM_COUNT[table.id] + 1)}
                  x2={table.x + table.width * (seamIndex + 1) / (SEAM_COUNT[table.id] + 1)}
                  y1={table.y + 7}
                  y2={table.y + table.height - 7}
                />
              {/if}
            {/each}
          {/if}
          {#if view.count > 1 && table.shape !== 'round'}
            {#each Array.from({ length: view.count - 1 }) as _, index}
              {#if table.width >= table.height}
                <line
                  class="table-share-divider"
                  x1={table.x + table.width * (index + 1) / view.count}
                  x2={table.x + table.width * (index + 1) / view.count}
                  y1={table.y + 5}
                  y2={table.y + table.height - 5}
                />
              {:else}
                <line
                  class="table-share-divider"
                  x1={table.x + 5}
                  x2={table.x + table.width - 5}
                  y1={table.y + table.height * (index + 1) / view.count}
                  y2={table.y + table.height * (index + 1) / view.count}
                />
              {/if}
            {/each}
          {/if}
          {#if view.status !== 'free' && view.status !== 'closed'}
            <text class="table-number-tag" x={table.x + table.width - 6} y={table.y + 13}>{table.number}</text>
          {/if}
          <text class="table-primary" x={table.x + table.width / 2} y={table.y + table.height / 2 - 2}>{fitLabel(view.primary, table.width)}</text>
          <text class="table-secondary" x={table.x + table.width / 2} y={table.y + table.height / 2 + 12}>{view.secondary}</text>
          {#if view.shared && (view.freeSeats ?? 0) > 0}
            <g class="free-chip">
              <rect x={table.x + table.width / 2 - 22} y={table.y + table.height - 26} width="44" height="16" rx="8" />
              <text x={table.x + table.width / 2} y={table.y + table.height - 14.5}>{view.freeSeats} frei</text>
            </g>
          {/if}
        </g>
      {/each}

      {#if state.ui.selectedRegion === 'inside'}
        <circle class="shared-seat" cx="429" cy="141" r="5" />
      {/if}
    </svg>
  </div>
</section>
