<script lang="ts">
  import type { AppState, Reservation } from '../domain/model';
  import { formatTableList, tableById } from '../domain/tableCatalog';
  import { formatClock, reservationStart } from '../domain/time';
  import TableTimelineView from './TableTimelineView.svelte';

  export let state: AppState;
  export let tableId: string;
  export let now: number;
  export let placeableReservationCount: number;
  export let onreservation: (id: string) => void;
  export let onplace: () => void;
  export let onnewat: (serviceDate: string, startTime: string) => void;
  export let onarrive: (id: string) => void;
  export let onnoshow: (id: string) => void;
  export let ondelay: (id: string, minutes: number) => void = () => {};
  export let onunassign: (id: string) => void = () => {};
  export let onleft: (id: string) => void;
  export let onclean: (id: string) => void;
  export let onreset: (id: string) => void;
  export let onclose: () => void;

  let delayOpen = false;
  $: table = tableById(tableId);
  $: all = state.reservations
    .filter((reservation) => (
      reservation.serviceDate === state.ui.selectedServiceDate
      && reservation.assignment?.tableIds.includes(tableId)
      && reservation.status !== 'cancelled'
    ))
    .sort((left, right) => reservationStart(left) - reservationStart(right));
  $: current = all.filter((reservation) => reservation.status === 'seated' || reservation.status === 'cleaning');
  $: future = all.filter((reservation) => reservation.status === 'assigned');
  $: next = future[0];
  $: following = future.slice(1);
  $: hasReservations = current.length > 0 || future.length > 0;

  function name(reservation: Reservation): string {
    return reservation.source === 'walk-in' ? 'Walk-in' : reservation.name;
  }
</script>

<div class="table-detail" data-testid="table-detail">
  <div class="table-detail-heading">
    <div><span>{table.isBarSeat ? 'Barplatz' : 'Tisch'}</span><h3>{table.number}</h3></div>
    <div><b>{table.capacity}</b><span>Plätze</span></div>
  </div>

  {#if current.length > 0}
    <section class="timeline-section current-section">
      {#each current as reservation}
        {#if reservation.status === 'seated'}
          <button class="touch-button success big-action full-width-action" data-testid="table-quick-left" type="button" onclick={() => onleft(reservation.id)}>✓ Gäste sind gegangen{current.filter((entry) => entry.status === 'seated').length > 1 ? ` (${name(reservation)})` : ''}</button>
        {/if}
      {/each}
      <h4>Jetzt am Tisch</h4>
      {#each current as reservation}
        <button class="timeline-card current" type="button" onclick={() => onreservation(reservation.id)}>
          <strong>{name(reservation)}</strong><span>{reservation.partySize} Pers. · {reservation.status === 'cleaning' ? 'Reinigung' : `seit ${formatClock(reservation.arrivedAt ?? reservationStart(reservation))}`}</span>
        </button>
      {/each}
    </section>
  {/if}

  {#if next}
    <div class="table-detail-top-actions">
      <button class="touch-button success big-action" data-testid="table-quick-arrive" type="button" onclick={() => onarrive(next.id)}>✓ Ankunft bestätigen</button>
      <button class:active={delayOpen} class="touch-button secondary big-action" data-testid="table-quick-delay" type="button" onclick={() => delayOpen = !delayOpen}>Verspäten sich</button>
    </div>
    {#if delayOpen}
      <div class="delay-options" data-testid="delay-options">
        {#each [10, 15, 20, 30, 45, 60] as minutes}
          <button type="button" onclick={() => { ondelay(next.id, minutes); delayOpen = false; }}>+{minutes}</button>
        {/each}
      </div>
    {/if}
    <div class="table-detail-slim-row">
      <button class="touch-button danger-outline table-detail-noshow" data-testid="table-quick-noshow" type="button" onclick={() => onnoshow(next.id)}>No-Show</button>
      <button class="touch-button secondary table-detail-unassign" data-testid="table-quick-unassign" type="button" onclick={() => onunassign(next.id)}>↩ Zurück in die Liste</button>
    </div>
    <section class="timeline-section">
      <h4>Nächste Ankunft</h4>
      <button class="next-reservation-card" data-testid="next-reservation" type="button" onclick={() => onreservation(next.id)}>
        <div class="next-time"><strong>{formatClock(reservationStart(next))}</strong>{#if reservationStart(next) < now}<span>überfällig</span>{/if}</div>
        <div><h3>{name(next)}</h3><p>{next.partySize} Personen · {next.assignment?.mode === 'shared' ? 'geteilte Belegung' : formatTableList(next.assignment?.tableIds ?? [])}</p></div>
        <span>›</span>
      </button>
    </section>
  {/if}

  {#if !hasReservations}
    <div class="table-empty-state" data-testid="table-empty-state">
      <span>✓</span>
      <strong>Tisch ist frei</strong>
      <p>Aktuell ist keine Belegung geplant.</p>
    </div>
  {/if}

  {#if following.length > 0}
    <section class="timeline-section following-section">
      <h4>Danach</h4>
      {#each following as reservation}
        <button class="following-row" type="button" onclick={() => onreservation(reservation.id)}>
          <time>{formatClock(reservationStart(reservation))}</time><span><strong>{name(reservation)}</strong><small>{reservation.partySize} Pers.</small></span><b>›</b>
        </button>
      {/each}
    </section>
  {/if}

  {#if placeableReservationCount > 0}
    <button class="secondary-action full" type="button" onclick={onplace}><strong>Offene Reservierung hier platzieren</strong><span>{placeableReservationCount} {placeableReservationCount === 1 ? 'passende Reservierung' : 'passende Reservierungen'}</span></button>
  {/if}
  <section class="timeline-section belegung-section">
    <TableTimelineView {state} {table} {now} {onreservation} onfreeslot={onnewat} />
  </section>
  <button class="modal-close-button" type="button" onclick={onclose}>Schließen</button>
</div>
