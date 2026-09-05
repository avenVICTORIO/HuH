<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    AppSettings,
    AppState,
    OperationalTask,
    PlacementChoice,
    PlanResult,
    Reservation,
    ReservationDraft,
    SeatingPreference,
    WeatherLocation,
  } from './domain/model';
  import { controller } from './application/runtime';
  import { dateToServiceDate, shiftServiceDate } from './domain/time';
  import { TABLES, tableById } from './domain/tableCatalog';
  import Header from './components/Header.svelte';
  import NextActionBar from './components/NextActionBar.svelte';
  import TaskDropdown from './components/TaskDropdown.svelte';
  import ReservationList from './components/ReservationList.svelte';
  import FloorPlan from './components/FloorPlan.svelte';
  import Modal from './components/Modal.svelte';
  import ReservationWizard from './components/ReservationWizard.svelte';
  import type { OperationsTab, PlacementAfterCreate } from './application/uiTypes';
  import WalkInWizard from './components/WalkInWizard.svelte';
  import ReservationDetail from './components/ReservationDetail.svelte';
  import ReservationEdit from './components/ReservationEdit.svelte';
  import TableDetail from './components/TableDetail.svelte';
  import PlacementOptions from './components/PlacementOptions.svelte';
  import PlanPreview from './components/PlanPreview.svelte';
  import OperationsDrawer from './components/OperationsDrawer.svelte';
  import ScheduleView from './components/ScheduleView.svelte';
  import WeatherOverlay from './components/WeatherOverlay.svelte';
  import WeatherDetail from './components/WeatherDetail.svelte';
  import { WeatherGateway } from './infrastructure/weatherGateway';
  import type { WeatherForecastState } from './application/weatherForecast';

  interface HeaderStats {
    unassigned: number;
    assigned: number;
    seated: number;
    freeSeats: number;
  }

  type ModalKind =
    | 'reservation-wizard'
    | 'walkin-wizard'
    | 'reservation-detail'
    | 'reservation-edit'
    | 'table-detail'
    | 'placement-options'
    | 'share-ask'
    | 'plan-preview'
    | 'table-place-list'
    | 'weather-detail'
    | 'confirm'
    | null;

  const stateStore = controller.state;
  const nowStore = controller.now;
  const weatherGateway = new WeatherGateway();
  let modal: ModalKind = null;
  let operationsOpen = false;
  let tasksOpen = false;
  let operationsTab: OperationsTab = 'now';
  let mobileReservationsOpen = false;
  let selectedReservationId: string | undefined;
  let selectedTableId: string | undefined;
  let reservationReturnTableId: string | undefined;
  let placementReservationId: string | undefined;
  let placementSource: 'manual' | 'recovery' = 'manual';
  let placementAutoArrive = false;
  let placementChoices: PlacementChoice[] = [];
  let placementIntro = '';
  let shareAsk: { id: string; choice: PlacementChoice; free: number; partySize: number } | undefined;
  let tafelAnchor: string | undefined;
  let plan: PlanResult | undefined;
  let toast = '';
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let confirmTitle = '';
  let confirmText = '';
  let confirmCallback: (() => void) | undefined;
  let walkInRecovery = false;
  let placeableForSelectedTable: Reservation[] = [];
  let canPlan = false;
  let workspaceView: 'floor' | 'schedule' = 'floor';
  let reservationsInView = 0;
  let highlightTableIds: string[] = [];
  let directTableId: string | undefined;
  let directInitialDate = '';
  let directInitialTime = '';
  let weatherState: WeatherForecastState = { status: 'idle' };
  let weatherRequest = 0;

  $: state = $stateStore;
  $: now = $nowStore;
  $: tasks = tasksAt(now, state.ui.selectedServiceDate);
  $: serviceDay = state.serviceDays[state.ui.selectedServiceDate];
  $: selectedReservation = selectedReservationId
    ? state.reservations.find((reservation) => reservation.id === selectedReservationId)
    : undefined;
  $: stats = calculateStats(state);
  $: reconciliationPending = controller.reconciliationPending(state.ui.selectedServiceDate);
  $: selectedDayReservations = state.reservations.filter((reservation) => (
    reservation.serviceDate === state.ui.selectedServiceDate
  ));
  $: hasReservations = selectedDayReservations.length > 0;
  $: autoTargetLabel = selectedReservation && selectedReservation.status === 'unassigned'
    ? controller.previewAutoPlacement(selectedReservation.id)
    : null;
  $: {
    void state.revision;
    void now;
    canPlan = controller.hasPlannableReservations(state.ui.selectedServiceDate)
      && selectedDayReservations.some((reservation) => reservation.status === 'unassigned');
  }
  $: {
    void state.revision;
    placeableForSelectedTable = selectedTableId
      ? controller.placeableUnassignedReservationsAtTable(selectedTableId)
      : [];
  }

  onMount(() => {
    controller.tick();
    // Vorschau: beim ersten Öffnen ein realistisches, nach hinten abnehmendes
    // Testszenario befüllen (einmalig; „Alles auf null" im Betrieb setzt es zurück).
    if (typeof localStorage !== 'undefined'
        && !localStorage.getItem('hah-scenario-seeded')
        && state.reservations.length === 0) {
      controller.generateDemoMonth(state.ui.selectedServiceDate, true);
      localStorage.setItem('hah-scenario-seeded', '1');
    }
    const interval = window.setInterval(() => controller.tick(), 30_000);
    void refreshWeather();
    const weatherInterval = window.setInterval(() => void refreshWeather(), 30 * 60_000);
    if (controller.startupError) {
      showToast(controller.startupError, 8_000);
    }
    return () => {
      window.clearInterval(interval);
      window.clearInterval(weatherInterval);
    };
  });

  function tasksAt(at: number, serviceDate: string): OperationalTask[] {
    void at;
    return controller.getTasks(serviceDate);
  }

  function showToast(message: string, duration = 3_500): void {
    toast = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast = '', duration);
  }

  function execute(action: () => void, success?: string): boolean {
    try {
      action();
      if (success) showToast(success);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 6_000);
      return false;
    }
  }

  function calculateStats(current: AppState): HeaderStats {
    const dayReservations = current.reservations.filter((reservation) => reservation.serviceDate === current.ui.selectedServiceDate);
    const totalSeats = TABLES
      .filter((table) => table.region === current.ui.selectedRegion && (!table.isBarSeat || current.settings.useBarSeatsForSingles))
      .reduce((sum, table) => sum + table.capacity, 0)
      - (current.ui.selectedRegion === 'inside' ? 1 : 0);
    const currentReservations = dayReservations.filter((reservation) => (
      reservation.assignment?.region === current.ui.selectedRegion
      && (reservation.status === 'seated' || reservation.status === 'cleaning')
    ));
    let used = 0;
    const countedExclusive = new Set<string>();
    for (const reservation of currentReservations) {
      if (!reservation.assignment) continue;
      if (reservation.assignment.mode === 'shared') {
        used += reservation.partySize;
      } else {
        const key = reservation.assignment.tableIds.slice().sort().join('+');
        if (!countedExclusive.has(key)) {
          countedExclusive.add(key);
          used += reservation.assignment.capacity;
        }
      }
    }
    return {
      unassigned: dayReservations.filter((reservation) => reservation.status === 'unassigned').length,
      assigned: dayReservations.filter((reservation) => reservation.status === 'assigned').length,
      seated: dayReservations.filter((reservation) => reservation.status === 'seated').length,
      freeSeats: Math.max(0, totalSeats - used),
    };
  }

  function closeModal(): void {
    modal = null;
    selectedTableId = undefined;
    reservationReturnTableId = undefined;
    directTableId = undefined;
    directInitialDate = '';
    directInitialTime = '';
    placementChoices = [];
  }

  function openReservation(id: string, returnTableId?: string): void {
    selectedReservationId = id;
    reservationReturnTableId = returnTableId;
    modal = 'reservation-detail';
    mobileReservationsOpen = false;
  }

  function returnToTable(): void {
    if (!reservationReturnTableId) {
      return;
    }
    selectedTableId = reservationReturnTableId;
    reservationReturnTableId = undefined;
    modal = 'table-detail';
  }

  function openTable(tableId: string): void {
    selectedTableId = tableId;
    if (placementReservationId) {
      const reservation = state.reservations.find((entry) => entry.id === placementReservationId);
      // Tafel-Modus (alte HaH-Logik): zweiter Tipp wählt den Tisch zum Anschließen.
      if (tafelAnchor && reservation) {
        if (tableId === tafelAnchor) {
          showToast('Das ist der Haupttisch – bitte einen Nachbartisch antippen.');
          return;
        }
        const anchorChoices = controller.placementChoices(placementReservationId, tafelAnchor);
        const combos = anchorChoices
          .filter((choice) => (
            choice.option.kind === 'joined'
            && choice.mode === 'exclusive'
            && choice.option.tableIds.includes(tableId)
            && choice.option.capacity >= reservation.partySize
          ))
          .sort((left, right) => left.option.capacity - right.option.capacity);
        const usable = combos.find((choice) => choice.available);
        if (usable) {
          tafelAnchor = undefined;
          const preferenceMismatch = reservation.preference !== 'none'
            && reservation.preference !== usable.option.region;
          assignChoice(usable, preferenceMismatch ? 'Direkt am Plan platziert' : '');
          return;
        }
        if (combos.length > 0) {
          showToast(combos[0].reason ?? 'Diese Tischkombination ist gerade nicht möglich.', 5_000);
          return;
        }
        showToast(`Tisch ${tableById(tableId).number} lässt sich nicht mit Tisch ${tableById(tafelAnchor).number} verbinden – Nachbartisch wählen.`, 5_000);
        return;
      }
      placementChoices = controller.placementChoices(placementReservationId, tableId);
      const simple = placementChoices.find((choice) => (
        choice.option.id === `table:${tableId}` && choice.mode === 'exclusive'
      ));
      // Alte HaH-Logik: passt der Tisch, direkt platzieren – ohne Auswahlfenster.
      if (reservation && simple?.available && simple.shortenedDurationMinutes === undefined) {
        const preferenceMismatch = reservation.preference !== 'none'
          && reservation.preference !== simple.option.region;
        const freeAfter = simple.option.capacity - reservation.partySize;
        const id = placementReservationId;
        const isWalkIn = reservation.source === 'walk-in';
        assignChoice(simple, preferenceMismatch ? 'Direkt am Plan platziert' : '');
        // Restplätze freigeben? – wie in der alten Version ab 2 übrigen Plätzen.
        if (freeAfter >= 2 && !isWalkIn) {
          shareAsk = { id, choice: simple, free: freeAfter, partySize: reservation.partySize };
          modal = 'share-ask';
        }
        return;
      }
      // Tisch zu klein → Tafel-Modus wie in der alten Version: Nachbartisch antippen.
      if (reservation && simple && !simple.available && reservation.partySize > simple.option.capacity) {
        const joined = placementChoices.filter((choice) => (
          choice.option.kind === 'joined' && choice.mode === 'exclusive'
        ));
        if (joined.length > 0) {
          tafelAnchor = tableId;
          const missing = reservation.partySize - simple.option.capacity;
          showToast(`Tisch ${tableById(tableId).number} hat nur ${simple.option.capacity} Plätze (${missing} fehlen). Tisch zum Anschließen antippen.`, 6_000);
          return;
        }
      }
      placementIntro = '';
      modal = 'placement-options';
      return;
    }
    modal = 'table-detail';
  }

  function beginPlacement(id: string, source: 'manual' | 'recovery' = 'manual', autoArrive = false): void {
    selectedReservationId = id;
    reservationReturnTableId = undefined;
    placementReservationId = id;
    placementSource = source;
    placementAutoArrive = autoArrive;
    modal = null;
    operationsOpen = false;
    mobileReservationsOpen = false;
    workspaceView = 'floor';
    showToast('Jetzt einen Tisch im Raumplan antippen.');
  }

  function cancelPlacement(): void {
    placementReservationId = undefined;
    placementAutoArrive = false;
    placementSource = 'manual';
    tafelAnchor = undefined;
    closeModal();
  }

  function finishReservation(draft: ReservationDraft, placement: PlacementAfterCreate): void {
    if (placement === 'selected-table') {
      if (!directTableId) {
        showToast('Der ausgewählte Tisch ist nicht mehr verfügbar.', 6_000);
        return;
      }
      try {
        const id = controller.createReservationAtTable(draft, directTableId);
        closeModal();
        showToast('Reservierung verbindlich am Tisch angelegt.');
        openReservation(id);
      } catch (error) {
        showToast(error instanceof Error ? error.message : String(error), 6_000);
      }
      return;
    }
    const id = controller.createReservation(draft);
    closeModal();
    if (placement === 'auto') {
      const placed = controller.autoAssignReservation(id);
      if (placed) {
        showToast('Reservierung automatisch platziert.');
        openReservation(id);
      } else {
        showToast('Keine sichere Platzierung gefunden. Die Reservierung bleibt offen.', 6_000);
      }
    } else if (placement === 'manual') {
      beginPlacement(id);
    } else {
      showToast('Reservierung in die Liste aufgenommen.');
    }
  }

  function finishWalkIn(partySize: number, preference: SeatingPreference, placement: PlacementAfterCreate): void {
    const id = controller.createWalkIn(partySize, preference);
    closeModal();
    if (placement === 'auto') {
      if (controller.autoAssignReservation(id)) {
        if (walkInRecovery) controller.markReconciled(id);
        const placed = controller.snapshot().reservations.find((reservation) => reservation.id === id);
        if (placed?.assignment) {
          workspaceView = 'floor';
          controller.selectRegion(placed.assignment.region);
          highlightTableIds = [...placed.assignment.tableIds];
          showToast(`Walk-in sitzt an Tisch ${tableById(placed.assignment.tableIds[0]).number}${placed.assignment.tableIds.length > 1 ? ' (Tafel)' : ''}.`);
        } else {
          showToast('Walk-in direkt platziert und als anwesend markiert.');
        }
      } else {
        showToast('Kein sicherer Platz gefunden. Der Walk-in bleibt offen.', 6_000);
      }
    } else if (placement === 'manual') {
      beginPlacement(id, walkInRecovery ? 'recovery' : 'manual', true);
    } else {
      showToast('Walk-in in die Liste aufgenommen.');
    }
    walkInRecovery = false;
  }

  function assignChoice(choice: PlacementChoice, overrideReason: string): void {
    if (!placementReservationId) return;
    const id = placementReservationId;
    const succeeded = execute(() => {
      controller.manualAssign(id, choice.option.id, {
        mode: choice.mode,
        source: placementSource,
        lock: true,
        overrideReason,
        shortenedDurationMinutes: choice.shortenedDurationMinutes,
      });
      if (placementAutoArrive) {
        controller.markArrived(id);
      }
      if (placementSource === 'recovery') {
        controller.markReconciled(id);
      }
    }, 'Platzierung gespeichert.');
    if (succeeded) {
      placementReservationId = undefined;
      placementAutoArrive = false;
      placementSource = 'manual';
      closeModal();
    }
  }

  function previewPlan(): void {
    plan = controller.previewPlan();
    modal = 'plan-preview';
  }

  function applyPlan(): void {
    if (!plan) return;
    if (execute(() => controller.applyPlan(plan!), 'Auto-Plan angewendet.')) {
      closeModal();
      plan = undefined;
    }
  }

  function requestConfirm(title: string, text: string, callback: () => void): void {
    confirmTitle = title;
    confirmText = text;
    confirmCallback = callback;
    modal = 'confirm';
  }

  function confirmAction(): void {
    const callback = confirmCallback;
    closeModal();
    confirmCallback = undefined;
    callback?.();
  }

  function handleTask(task: OperationalTask): void {
    if (task.kind === 'prepare-join' && task.reservationId) {
      execute(() => controller.markPrepared(task.reservationId!), 'Tische als vorbereitet markiert.');
      return;
    }
    if (task.kind === 'cleaning' && task.reservationId) {
      execute(() => controller.completeCleaning(task.reservationId!), 'Reinigung abgeschlossen.');
      return;
    }
    if (task.kind === 'prepare-split' && task.reservationId) {
      execute(() => controller.completeReset(task.reservationId!), 'Rückbau abgeschlossen.');
      return;
    }
    if (task.kind === 'reconciliation') {
      openOperations('operations');
      return;
    }
    if (task.reservationId) {
      operationsOpen = false;
      openReservation(task.reservationId);
    }
  }

  function openOperations(tab: OperationsTab): void {
    tasksOpen = false;
    operationsTab = tab;
    operationsOpen = true;
  }

  function downloadBackup(): void {
    const content = controller.exportBackup();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hand-aufs-herz-${state.ui.selectedServiceDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Backup heruntergeladen.');
  }

  function importBackup(content: string): void {
    controller.importBackup(content);
    operationsOpen = false;
    showToast('Backup vollständig importiert.');
  }

  function selectUnassignedForTable(id: string): void {
    const tableId = selectedTableId;
    closeModal();
    beginPlacement(id);
    if (tableId) openTable(tableId);
  }

  function openNewReservationAtTable(tableId: string, serviceDate = state.ui.selectedServiceDate, startTime = ''): void {
    directTableId = tableId;
    directInitialDate = serviceDate;
    directInitialTime = startTime;
    selectedTableId = undefined;
    modal = 'reservation-wizard';
  }

  async function refreshWeather(): Promise<void> {
    const location = controller.snapshot().settings.weatherLocation;
    if (!location) {
      weatherState = { status: 'idle' };
      return;
    }
    const request = ++weatherRequest;
    const previous = weatherState.status === 'ready' || weatherState.status === 'loading' || weatherState.status === 'error'
      ? weatherState.forecast
      : undefined;
    weatherState = { status: 'loading', forecast: previous };
    try {
      const forecast = await weatherGateway.forecast(location, controller.currentTime());
      if (request === weatherRequest) {
        weatherState = { status: 'ready', forecast };
      }
    } catch (error) {
      if (request === weatherRequest) {
        weatherState = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          forecast: previous,
        };
      }
    }
  }

  function updateWeatherLocation(location: WeatherLocation | null): void {
    if (execute(() => controller.updateWeatherLocation(location), location ? 'Wetterstandort gespeichert.' : 'Wetterstandort entfernt.')) {
      void refreshWeather();
    }
  }
</script>

<Header
  {state}
  {now}
  taskCount={tasks.length}
  criticalTaskCount={tasks.filter((task) => task.priority === 'critical').length}
  {tasksOpen}
  {stats}
  {hasReservations}
  {canPlan}
  {reservationsInView}
  {workspaceView}
  onworkspaceview={(view) => workspaceView = view}
  selectedRegion={state.ui.selectedRegion}
  onregion={(region) => controller.selectRegion(region)}
  onprevday={() => controller.selectServiceDate(shiftServiceDate(state.ui.selectedServiceDate, -1))}
  onnextday={() => controller.selectServiceDate(shiftServiceDate(state.ui.selectedServiceDate, 1))}
  ontoday={() => controller.selectServiceDate(dateToServiceDate(new Date(now)))}
  onselectdate={(serviceDate) => controller.selectServiceDate(serviceDate)}
  onreservations={() => mobileReservationsOpen = true}
  onnew={() => modal = 'reservation-wizard'}
  onwalkin={() => { walkInRecovery = false; modal = 'walkin-wizard'; }}
  onplan={previewPlan}
  ontasks={() => { operationsOpen = false; tasksOpen = !tasksOpen; }}
  onoperations={() => openOperations('now')}
/>

{#if tasksOpen}
  <TaskDropdown
    {tasks}
    {now}
    onclose={() => tasksOpen = false}
    onaction={(task) => { tasksOpen = false; handleTask(task); }}
    onsnooze={(taskId) => execute(() => controller.snoozeTask(taskId), 'Aufgabe um 10 Minuten verschoben.')}
    onacknowledge={(taskId) => controller.acknowledgeTask(taskId)}
  />
{/if}

<NextActionBar
  rushStatus={serviceDay?.rush.status ?? 'off'}
  onopen={() => openOperations('operations')}
/>

{#if placementReservationId}
  <div class="placement-banner">
    <span><strong>Platzierungsmodus</strong> · {state.reservations.find((reservation) => reservation.id === placementReservationId)?.name}</span>
    <button type="button" onclick={cancelPlacement}>Abbrechen</button>
  </div>
{/if}

<main class="workspace">
  <div class:mobile-open={mobileReservationsOpen} class="sidebar-shell">
    <ReservationList
      {state}
      {now}
      onselect={openReservation}
      onfilter={(filter) => controller.setReservationFilter(filter)}
      onclosemobile={() => mobileReservationsOpen = false}
      oncount={(count) => reservationsInView = count}
    />
  </div>
  {#if mobileReservationsOpen}<button class="mobile-sidebar-scrim" aria-label="Liste schließen" onclick={() => mobileReservationsOpen = false}></button>{/if}
  <div class="workspace-main">
    {#if workspaceView === 'floor'}
      <FloorPlan {state} {now} ontable={openTable} {placementReservationId} onregion={(region) => controller.selectRegion(region)} {highlightTableIds} onclearhighlight={() => highlightTableIds = []} />
    {:else}
      <ScheduleView {state} {now} onreservation={openReservation} onfreeslot={openNewReservationAtTable} ontable={openTable} ondatechange={(serviceDate) => controller.selectServiceDate(serviceDate)} />
    {/if}
  </div>
</main>

{#if state.settings.weatherLocation && workspaceView === 'floor'}
  <WeatherOverlay location={state.settings.weatherLocation} state={weatherState} {now} onopen={() => modal = 'weather-detail'} onretry={() => void refreshWeather()} />
{/if}

{#if modal === 'reservation-wizard'}
  <Modal title={directTableId ? `Neue Reservierung · Tisch ${tableById(directTableId).number}` : 'Neue Reservierung'} onclose={closeModal}><ReservationWizard initialDate={directInitialDate || state.ui.selectedServiceDate} initialTime={directInitialTime} targetTable={directTableId ? tableById(directTableId) : undefined} settings={state.settings} onfinish={finishReservation} oncancel={closeModal} /></Modal>
{:else if modal === 'walkin-wizard'}
  <Modal title="Walk-in" onclose={closeModal}><WalkInWizard onfinish={finishWalkIn} oncancel={closeModal} /></Modal>
{:else if modal === 'reservation-detail' && selectedReservation}
  <Modal
    title="Reservierung"
    onclose={closeModal}
    onback={reservationReturnTableId ? returnToTable : undefined}
    backLabel={reservationReturnTableId ? `Zurück zu Tisch ${tableById(reservationReturnTableId).number}` : 'Zurück'}
  >
    <ReservationDetail
      reservation={selectedReservation}
      settings={state.settings}
      {now}
      onauto={() => execute(() => { if (!controller.autoAssignReservation(selectedReservation.id)) throw new Error('Keine sichere Platzierung gefunden.'); }, 'Automatisch platziert.')}
      onmanual={() => beginPlacement(selectedReservation.id)}
      autoTargetLabel={autoTargetLabel}
      onedit={() => modal = 'reservation-edit'}
      onarrive={() => { if (execute(() => controller.markArrived(selectedReservation.id), 'Ankunft bestätigt.')) closeModal(); }}
      onleft={() => { if (execute(() => { controller.markLeft(selectedReservation.id); controller.completeCleaningAndReset(selectedReservation.id); }, 'Tisch ist wieder frei.')) closeModal(); }}
      onclean={() => execute(() => controller.completeCleaning(selectedReservation.id), 'Reinigung abgeschlossen.')}
      onreset={() => { if (execute(() => controller.completeReset(selectedReservation.id), 'Rückbau abgeschlossen.')) closeModal(); }}
      ondelay={(minutes) => execute(() => controller.delayReservation(selectedReservation.id, minutes), `Verspätung +${minutes} Min. gespeichert.`)}
      onnoshow={() => requestConfirm('No-Show bestätigen', `${selectedReservation.name} ist nicht erschienen?`, () => execute(() => controller.markNoShow(selectedReservation.id), 'No-Show gespeichert.'))}
      onunassign={() => { if (execute(() => controller.unassignReservation(selectedReservation.id), 'Zurück in die Liste.')) closeModal(); }}
      onunlock={() => execute(() => controller.unlockAssignment(selectedReservation.id), 'Für Auto-Plan freigegeben.')}
      oncancelreservation={() => requestConfirm('Reservierung stornieren', `${selectedReservation.name} wirklich stornieren?`, () => { controller.cancelReservation(selectedReservation.id); showToast('Reservierung storniert.'); })}
      onclose={closeModal}
    />
  </Modal>
{:else if modal === 'reservation-edit' && selectedReservation}
  <Modal title="Reservierung bearbeiten" onclose={() => modal = 'reservation-detail'}>
    <ReservationEdit reservation={selectedReservation} onsave={(update) => { if (execute(() => controller.updateReservation(selectedReservation.id, update), 'Änderungen gespeichert.')) modal = 'reservation-detail'; }} oncancel={() => modal = 'reservation-detail'} />
  </Modal>
{:else if modal === 'table-detail' && selectedTableId}
  <Modal title="Tischbelegung" onclose={closeModal}>
    <TableDetail
      {state}
      tableId={selectedTableId}
      {now}
      placeableReservationCount={placeableForSelectedTable.length}
      onreservation={(id) => openReservation(id, selectedTableId)}
      onplace={() => modal = 'table-place-list'}
      onnewat={(serviceDate, startTime) => openNewReservationAtTable(selectedTableId!, serviceDate, startTime)}
      onarrive={(id) => { if (execute(() => controller.markArrived(id), 'Ankunft bestätigt.')) closeModal(); }}
      ondelay={(id, minutes) => execute(() => controller.delayReservation(id, minutes), `Verspätung +${minutes} Min. gespeichert.`)}
      onunassign={(id) => { if (execute(() => controller.unassignReservation(id), 'Zurück in die Liste gelegt.')) closeModal(); }}
      onleft={(id) => { if (execute(() => { controller.markLeft(id); controller.completeCleaningAndReset(id); }, 'Tisch ist wieder frei.')) closeModal(); }}
      onclean={(id) => execute(() => controller.completeCleaning(id), 'Reinigung abgeschlossen.')}
      onreset={(id) => execute(() => controller.completeReset(id), 'Rückbau abgeschlossen.')}
      onnoshow={(id) => {
        const reservation = state.reservations.find((entry) => entry.id === id);
        requestConfirm('No-Show bestätigen', `${reservation?.name ?? 'Reservierung'} ist nicht erschienen?`, () => execute(() => controller.markNoShow(id), 'No-Show gespeichert.'));
      }}
      onclose={closeModal}
    />
  </Modal>
{:else if modal === 'placement-options' && selectedTableId && placementReservationId}
  <Modal title={placementIntro ? 'Zu wenig Plätze' : 'Platzierung wählen'} onclose={cancelPlacement}>
    <PlacementOptions reservation={state.reservations.find((reservation) => reservation.id === placementReservationId)!} tableId={selectedTableId} choices={placementChoices} intro={placementIntro} onassign={assignChoice} oncancel={cancelPlacement} />
  </Modal>
{:else if modal === 'share-ask' && shareAsk}
  <Modal title="Restplätze freigeben?" onclose={() => { shareAsk = undefined; closeModal(); }}>
    <div class="share-ask" data-testid="share-ask">
      <p>Der Tisch hat {shareAsk.choice.option.capacity} Plätze, die Gruppe nur {shareAsk.partySize}. Die restlichen {shareAsk.free} Plätze für andere Gäste freigeben?</p>
      <div class="modal-actions">
        <button class="touch-button success" data-testid="share-yes" type="button" onclick={() => {
          const ask = shareAsk!;
          shareAsk = undefined;
          execute(() => controller.manualAssign(ask.id, ask.choice.option.id, {
            mode: 'shared', source: 'manual', lock: true, overrideReason: 'Restplätze freigegeben',
          }), `${ask.free} Plätze freigegeben.`);
          closeModal();
        }}>Ja, {shareAsk.free} freigeben</button>
        <button class="touch-button secondary" data-testid="share-no" type="button" onclick={() => { shareAsk = undefined; closeModal(); }}>Nein, ganzer Tisch</button>
      </div>
    </div>
  </Modal>
{:else if modal === 'plan-preview' && plan}
  <Modal title="Auto-Plan prüfen" wide onclose={closeModal}><PlanPreview {state} {plan} onapply={applyPlan} oncancel={closeModal} /></Modal>
{:else if modal === 'table-place-list' && selectedTableId}
  <Modal title="Reservierung auswählen" onclose={closeModal}>
    <div class="selection-list">
      {#each placeableForSelectedTable as reservation}
        <button type="button" onclick={() => selectUnassignedForTable(reservation.id)}><time>{reservation.startTime}</time><span><strong>{reservation.name}</strong><small>{reservation.partySize} Pers.</small></span><b>›</b></button>
      {:else}
        <div class="empty-state"><b>Keine offene Reservierung</b><span>Neue Reservierung oder Walk-in zuerst anlegen.</span></div>
      {/each}
      <button class="modal-close-button" type="button" onclick={closeModal}>Abbrechen</button>
    </div>
  </Modal>
{:else if modal === 'weather-detail' && (weatherState.status === 'ready' || weatherState.status === 'loading' || weatherState.status === 'error') && weatherState.forecast}
  <Modal title="7-Tage-Wettervorhersage" wide onclose={closeModal}>
    <WeatherDetail forecast={weatherState.forecast} onclose={closeModal} />
  </Modal>
{:else if modal === 'confirm'}
  <Modal title={confirmTitle} onclose={closeModal}>
    <div class="confirm-dialog"><p>{confirmText}</p><div class="modal-actions"><button class="touch-button secondary" type="button" onclick={closeModal}>Abbrechen</button><button class="touch-button danger" type="button" onclick={confirmAction}>Bestätigen</button></div></div>
  </Modal>
{/if}

{#if operationsOpen}
  <OperationsDrawer
    {state}
    {now}
    {tasks}
    {reconciliationPending}
    tab={operationsTab}
    notificationPermission={controller.notificationPermission()}
    onclose={() => operationsOpen = false}
    ontab={(tab) => operationsTab = tab}
    ontaskaction={handleTask}
    onsnooze={(taskId) => execute(() => controller.snoozeTask(taskId), 'Aufgabe um 10 Minuten verschoben.')}
    onacknowledge={(taskId) => controller.acknowledgeTask(taskId)}
    onweather={(weather) => execute(() => controller.setWeather(state.ui.selectedServiceDate, weather), weather === 'rain' ? 'Regen: Außenbereich geschlossen.' : 'Wetter auf trocken gesetzt.')}
    onlocationsearch={(query) => weatherGateway.searchLocations(query)}
    onweatherlocation={updateWeatherLocation}
    onoutside={(open) => execute(() => controller.setOutsideOpen(state.ui.selectedServiceDate, open), open ? 'Außenbereich geöffnet.' : 'Außenbereich geschlossen.')}
    onnotes={(notes) => execute(() => controller.updateServiceNotes(state.ui.selectedServiceDate, notes), 'Tagesnotiz gespeichert.')}
    onstartrush={() => execute(() => controller.startRush(), 'Stoßbetrieb aktiv.')}
    onendrush={() => execute(() => controller.endRush(), 'Stoßbetrieb beendet. Bitte Raum abgleichen.')}
    onbeginreconcile={() => execute(() => controller.beginReconciliation(), 'Raumabgleich gestartet.')}
    onconfirmplanned={(id) => execute(() => controller.reconcileAtPlannedTable(id), 'Sitzplatz bestätigt.')}
    onreconcilemove={(id) => beginPlacement(id, 'recovery', true)}
    onreconcilenoshow={(id) => execute(() => controller.reconcileNoShow(id), 'No-Show abgeglichen.')}
    onreconcilegone={(id) => execute(() => controller.reconcileLeftAndClean(id), 'Abgang und Reinigung abgeglichen.')}
    onmarkreconciled={(id) => execute(() => controller.markReconciled(id), 'Vorgang bestätigt.')}
    onfinishreconcile={() => execute(() => controller.finishReconciliation(), 'Raumabgleich abgeschlossen.')}
    onwalkin={() => { operationsOpen = false; walkInRecovery = true; modal = 'walkin-wizard'; }}
    onsavesettings={(settings: AppSettings) => execute(() => controller.updateSettings(settings), 'Einstellungen gespeichert.')}
    onenablenotifications={async () => { const result = await controller.enableNativeNotifications(); showToast(result === 'granted' ? 'Native Hinweise aktiviert.' : 'Benachrichtigungen wurden nicht freigegeben.'); }}
    onexport={downloadBackup}
    onimport={importBackup}
    ondemomonth={() => {
      const summary = controller.generateDemoMonth();
      operationsOpen = false;
      showToast(`${summary.reservations} Demo-Reservierungen für 30 Tage erzeugt · ${summary.joinedReservations} mit verbundenen Tischen.`, 5_000);
    }}
    onreset={() => { controller.resetAll(); operationsOpen = false; showToast('Lokaler Arbeitsstand gelöscht.'); }}
    onwiximport={(content) => {
      try {
        const summary = controller.importWixReservations(content);
        operationsOpen = false;
        showToast(summary.imported > 0
          ? `${summary.imported} Wix-Reservierungen importiert${summary.duplicates ? ` · ${summary.duplicates} Duplikate übersprungen` : ''}.`
          : `Keine neuen Reservierungen gefunden (${summary.duplicates} Duplikate, ${summary.skippedPast} vergangene, ${summary.skippedStatus} inaktive).`, 6_000);
      } catch (error) {
        showToast(error instanceof Error ? error.message : String(error), 6_000);
      }
    }}
    onunassignall={() => {
      const count = controller.unassignAllAssigned(state.ui.selectedServiceDate);
      operationsOpen = false;
      showToast(count > 0 ? `${count} Reservierungen zurück in die Liste gelegt.` : 'Keine platzierten Reservierungen zum Zurücklegen.');
    }}
  />
{/if}

{#if toast}<div class="toast" role="status" data-testid="toast">{toast}</div>{/if}
