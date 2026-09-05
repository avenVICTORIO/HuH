<script lang="ts">
  import type { AppState, Reservation } from '../domain/model';
  import { formatTableList } from '../domain/tableCatalog';
  import { formatServiceDate, reservationStart } from '../domain/time';

  export let state: AppState;
  export let now: number;
  export let onselect: (id: string) => void;
  export let onfilter: (filter: AppState['ui']['reservationFilter']) => void;
  export let onclosemobile: () => void;
  export let oncount: (count: number) => void = () => {};

  let query = '';

  function normalizeText(value: string): string {
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  // Open reservations and walk-ins need action, so they always lead the list.
  function rank(reservation: Reservation): number {
    if (reservation.status === 'unassigned') return 0;
    if (reservation.status === 'seated' || reservation.status === 'cleaning') return 1;
    if (reservation.status === 'assigned') return 2;
    return 3;
  }

  function visible(reservation: Reservation, needle: string): boolean {
    if (reservation.serviceDate !== state.ui.selectedServiceDate) return false;
    if (needle) {
      const phoneNeedle = needle.replace(/\D/g, '');
      const phone = reservation.phone.replace(/\D/g, '');
      const matchesName = normalizeText(reservation.name).includes(needle);
      const matchesPhone = phoneNeedle.length > 0 && phone.includes(phoneNeedle);
      return matchesName || matchesPhone;
    }
    return state.ui.reservationFilter === 'all' || reservation.status === state.ui.reservationFilter;
  }

  $: normalizedQuery = normalizeText(query);
  $: reservations = state.reservations
    .filter((reservation) => visible(reservation, normalizedQuery))
    .sort((left, right) => rank(left) - rank(right) || reservationStart(left) - reservationStart(right));
  $: oncount(reservations.length);

  function statusText(reservation: Reservation): string {
    return {
      unassigned: 'Offen',
      assigned: 'Platziert',
      seated: 'Am Tisch',
      cleaning: 'Reinigung',
      done: 'Beendet',
      'no-show': 'No-Show',
      cancelled: 'Storniert',
    }[reservation.status];
  }
</script>

<aside class="reservation-sidebar">
  <header class="sidebar-header sidebar-header-compact">
    <button class="icon-button sidebar-close" type="button" aria-label="Reservierungsliste schließen" onclick={onclosemobile}>×</button>
  </header>

  <div class="filter-row">
    {#each [
      ['all', 'Alle'],
      ['unassigned', 'Offen'],
      ['assigned', 'Platziert'],
      ['seated', 'Am Tisch'],
    ] as item}
      <button
        class:active={state.ui.reservationFilter === item[0]}
        type="button"
        onclick={() => onfilter(item[0] as AppState['ui']['reservationFilter'])}
      >{item[1]}</button>
    {/each}
  </div>

  <div class="reservation-scroll">
    {#if reservations.length === 0}
      {#if query.trim()}
        <div class="empty-state"><b>Keine Treffer</b><span>Am {formatServiceDate(state.ui.selectedServiceDate)} passt keine Reservierung zu „{query.trim()}“.</span><button type="button" class="text-action" onclick={() => query = ''}>Suche löschen</button></div>
      {:else}
        <div class="empty-state"><b>Keine Einträge</b><span>Neue Reservierungen und Walk-ins erscheinen hier.</span></div>
      {/if}
    {:else}
      {#each reservations as reservation, index (reservation.id)}
        {#if index === 0 || rank(reservations[index - 1]) !== rank(reservation)}
          <div class="list-section-title">
            {rank(reservation) === 0 ? 'Noch zu platzieren' : rank(reservation) === 1 ? 'Jetzt' : rank(reservation) === 2 ? 'Platziert' : 'Erledigt'}
          </div>
        {/if}
        <button
          type="button"
          class:done={rank(reservation) === 3}
          class:seated={reservation.status === 'seated'}
          class:overdue={reservation.status === 'assigned' && reservationStart(reservation) < now}
          class="reservation-card"
          onclick={() => onselect(reservation.id)}
          data-testid={`reservation-${reservation.id}`}
        >
          <div class="reservation-time">
            <strong>{reservation.startTime}</strong>
            {#if reservation.delayMinutes > 0}<small>+{reservation.delayMinutes}</small>{/if}
          </div>
          <div class="party-pill">{reservation.partySize}</div>
          <div class="reservation-main">
            <strong>{reservation.source === 'walk-in' ? 'Walk-in' : reservation.name}</strong>
            <small>
              {statusText(reservation)}
              {#if reservation.preference !== 'none'} · {reservation.preference === 'inside' ? 'innen' : 'außen'}{/if}
            </small>
          </div>
          {#if reservation.assignment}
            <div class="table-pill">{formatTableList(reservation.assignment.tableIds)}</div>
          {:else if reservation.status === 'unassigned'}
            <span class="mini-action">Platzieren</span>
          {/if}
        </button>
      {/each}
    {/if}
  </div>

  <div class="sidebar-search">
    <div class="sidebar-search-heading"><label for="reservation-search">Am {formatServiceDate(state.ui.selectedServiceDate)} suchen</label>{#if query.trim()}<span>{reservations.length} Treffer · alle Status</span>{/if}</div>
    <div class="sidebar-search-input">
      <input id="reservation-search" bind:value={query} type="search" enterkeyhint="search" placeholder="Name oder Telefon" aria-label="Reservierungen durchsuchen" />
      {#if query}<button type="button" aria-label="Suche löschen" title="Suche löschen" onclick={() => query = ''}>×</button>{/if}
    </div>
  </div>
</aside>
