<script lang="ts">
  import type { AppState } from '../domain/model';
  import { dateToServiceDate, formatServiceDate } from '../domain/time';
  import logoUrl from '../assets/logo.png';

  interface HeaderStats {
    unassigned: number;
    assigned: number;
    seated: number;
    freeSeats: number;
  }

  export let state: AppState;
  export let now: number;
  export let taskCount: number;
  export let criticalTaskCount: number;
  export let tasksOpen: boolean;
  export let stats: HeaderStats;
  export let hasReservations: boolean;
  export let canPlan: boolean;
  export let reservationsInView: number = 0;
  export let workspaceView: 'floor' | 'schedule' = 'floor';
  export let onworkspaceview: (view: 'floor' | 'schedule') => void = () => {};
  export let selectedRegion: 'inside' | 'outside' = 'inside';
  export let onregion: (region: 'inside' | 'outside') => void = () => {};
  export let onprevday: () => void;
  export let onnextday: () => void;
  export let ontoday: () => void;
  export let onselectdate: (serviceDate: string) => void;
  export let onreservations: () => void;
  export let onnew: () => void;
  export let onwalkin: () => void;
  export let onplan: () => void;
  export let ontasks: () => void;
  export let onoperations: () => void;

  $: clock = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(now));
  $: isToday = state.ui.selectedServiceDate === dateToServiceDate(new Date(now));

  function chooseDate(event: Event): void {
    const serviceDate = (event.currentTarget as HTMLInputElement).value;
    if (serviceDate) {
      onselectdate(serviceDate);
    }
  }
</script>

<header class="topbar">
  <div class="brand-block">
    <img class="brand-logo" src={logoUrl} alt="Hand aufs Herz" />
  </div>

  <div class="day-control" aria-label="Servicetag">
    <button class="icon-button" type="button" onclick={onprevday} aria-label="Vorheriger Tag">‹</button>
    <label class="day-label" title="Datum im Kalender wählen">
      <small data-testid="current-date">{formatServiceDate(state.ui.selectedServiceDate)}</small>
      <strong data-testid="current-time">{clock}</strong>
      <input type="date" aria-label="Servicetag wählen" value={state.ui.selectedServiceDate} onchange={chooseDate} />
    </label>
    <button class="icon-button" type="button" onclick={onnextday} aria-label="Nächster Tag">›</button>
    {#if !isToday}
      <button class="today-jump" type="button" onclick={ontoday}>Heute</button>
    {/if}
  </div>

  <div class="view-summary">
    <div class="res-count">
      <strong>Reservierungen</strong>
      <small>{reservationsInView} in dieser Ansicht</small>
    </div>
    <nav class="workspace-view-tabs header-view-tabs" aria-label="Hauptansicht">
      <button class:active={workspaceView === 'floor'} type="button" onclick={() => onworkspaceview('floor')}>▦ Raumplan</button>
      <button class:active={workspaceView === 'schedule'} type="button" onclick={() => onworkspaceview('schedule')}>↔ Zeitplan</button>
    </nav>
    {#if workspaceView === 'floor'}
      <div class="region-switch header-region-switch" aria-label="Bereich">
        <button class:active={selectedRegion === 'inside'} type="button" onclick={() => onregion('inside')}>Innen</button>
        <button class:active={selectedRegion === 'outside'} type="button" onclick={() => onregion('outside')}>Außen</button>
      </div>
    {/if}
  </div>

  <div class="kpi-row" aria-label="Tagesübersicht">
    <div class="kpi"><b>{stats.unassigned}</b><span>offen</span></div>
    <div class="kpi amber"><b>{stats.assigned}</b><span>platziert</span></div>
    <div class="kpi green"><b>{stats.seated}</b><span>am Tisch</span></div>
    <div class="kpi green"><b>{stats.freeSeats}</b><span>Plätze frei</span></div>
  </div>

  <div class="top-actions">
    {#if hasReservations}<button class="touch-button mobile-reservations" type="button" onclick={onreservations}>Liste</button>{/if}
    {#if canPlan}<button class="touch-button secondary" type="button" onclick={onplan}>✦ Auto-Plan</button>{/if}
    <button class="touch-button" type="button" onclick={onnew}>＋ Reservierung</button>
    <button class="touch-button success" type="button" onclick={onwalkin}>＋ Walk-in</button>
    <button
      class:critical={criticalTaskCount > 0}
      class="task-bell-button"
      type="button"
      onclick={ontasks}
      aria-label={`Aufgaben, ${taskCount} offen`}
      aria-expanded={tasksOpen}
      aria-controls="task-popover"
      data-testid="task-bell"
    >
      <span class="task-bell-icon" aria-hidden="true">🔔</span>
      {#if taskCount > 0}<span class="task-count-badge">{taskCount}</span>{/if}
    </button>
    <button class="operations-button" type="button" onclick={onoperations} aria-label="Betrieb und Aufgaben">Betrieb</button>
  </div>
</header>
