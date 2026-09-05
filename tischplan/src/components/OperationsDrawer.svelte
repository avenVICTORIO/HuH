<script lang="ts">
  import type {
    AppSettings,
    AppState,
    OperationalTask,
    OpeningInterval,
    Reservation,
    WeatherKind,
    WeatherLocation,
    Weekday,
  } from '../domain/model';
  import { formatTableList } from '../domain/tableCatalog';
  import type { OperationsTab } from '../application/uiTypes';
  import { cloneSettings, openingHoursValidationError, WEEKDAYS } from '../domain/settings';
  import WeatherLocationSettings from './WeatherLocationSettings.svelte';
  import TaskList from './TaskList.svelte';

  export let state: AppState;
  export let now: number;
  export let tasks: OperationalTask[];
  export let reconciliationPending: Reservation[];
  export let notificationPermission: NotificationPermission | 'unsupported';
  export let tab: OperationsTab;
  export let onclose: () => void;
  export let ontab: (tab: OperationsTab) => void;
  export let ontaskaction: (task: OperationalTask) => void;
  export let onsnooze: (taskId: string) => void;
  export let onacknowledge: (taskId: string) => void;
  export let onweather: (weather: WeatherKind) => void;
  export let onlocationsearch: (query: string) => Promise<WeatherLocation[]>;
  export let onweatherlocation: (location: WeatherLocation | null) => void;
  export let onoutside: (open: boolean) => void;
  export let onnotes: (notes: string) => void;
  export let onstartrush: () => void;
  export let onendrush: () => void;
  export let onbeginreconcile: () => void;
  export let onconfirmplanned: (id: string) => void;
  export let onreconcilemove: (id: string) => void;
  export let onreconcilenoshow: (id: string) => void;
  export let onreconcilegone: (id: string) => void;
  export let onmarkreconciled: (id: string) => void;
  export let onfinishreconcile: () => void;
  export let onwalkin: () => void;
  export let onsavesettings: (settings: AppSettings) => void;
  export let onenablenotifications: () => void;
  export let onexport: () => void;
  export let onimport: (content: string) => void;
  export let onwiximport: (content: string) => void = () => {};
  export let ondemomonth: () => void;
  export let onreset: () => void;
  export let onunassignall: () => void = () => {};

  let settingsDraft: AppSettings = cloneSettings(state.settings);
  let notes = state.serviceDays[state.ui.selectedServiceDate]?.notes ?? '';
  let resetArmed = false;
  let demoArmed = false;
  $: placedCount = state.reservations.filter((reservation) => (
    reservation.serviceDate === state.ui.selectedServiceDate && reservation.status === 'assigned'
  )).length;
  let importError = '';
  let settingsError = '';

  $: serviceDay = state.serviceDays[state.ui.selectedServiceDate];
  $: criticalCount = tasks.filter((task) => task.priority === 'critical').length;

  async function importFile(event: Event): Promise<void> {
    importError = '';
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      onimport(await file.text());
      input.value = '';
    } catch (error) {
      importError = String(error instanceof Error ? error.message : error);
    }
  }

  async function importWixFile(event: Event): Promise<void> {
    importError = '';
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      onwiximport(await file.text());
      input.value = '';
    } catch (error) {
      importError = String(error instanceof Error ? error.message : error);
    }
  }

  function saveSettings(): void {
    settingsError = '';
    const openingHoursError = openingHoursValidationError(settingsDraft);
    if (openingHoursError) {
      settingsError = openingHoursError;
      return;
    }
    onsavesettings(cloneSettings(settingsDraft));
    settingsDraft = cloneSettings(settingsDraft);
  }

  function suggestedInterval(weekday: Weekday): OpeningInterval | undefined {
    const existing = settingsDraft.openingHours[weekday].intervals;
    const candidates: OpeningInterval[] = [
      { opensAt: '09:00', closesAt: '12:00' },
      { opensAt: '12:00', closesAt: '15:00' },
      { opensAt: '15:00', closesAt: '17:00' },
      { opensAt: '17:00', closesAt: '23:00' },
      { opensAt: '06:00', closesAt: '09:00' },
    ];
    const preferred = candidates.find((candidate) => existing.every((interval) => (
      candidate.closesAt <= interval.opensAt || candidate.opensAt >= interval.closesAt
    )));
    if (preferred) {
      return preferred;
    }

    const minutes = (value: string): number => {
      const [hours, minute] = value.split(':').map(Number);
      return hours * 60 + minute;
    };
    const time = (value: number): string => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    const occupied = existing
      .map((interval) => ({ start: minutes(interval.opensAt), end: minutes(interval.closesAt) }))
      .sort((left, right) => left.start - right.start);
    let gapStart = 0;
    for (const interval of [...occupied, { start: 24 * 60, end: 24 * 60 }]) {
      if (interval.start - gapStart >= 30) {
        return {
          opensAt: time(gapStart),
          closesAt: time(Math.min(interval.start, gapStart + 120)),
        };
      }
      gapStart = Math.max(gapStart, interval.end);
    }
    return undefined;
  }

  function addOpeningInterval(weekday: Weekday): void {
    const interval = suggestedInterval(weekday);
    if (!interval) {
      return;
    }
    settingsDraft.openingHours[weekday].intervals = [
      ...settingsDraft.openingHours[weekday].intervals,
      interval,
    ].sort((left, right) => left.opensAt.localeCompare(right.opensAt));
    settingsDraft = cloneSettings(settingsDraft);
  }

  function removeOpeningInterval(weekday: Weekday, index: number): void {
    settingsDraft.openingHours[weekday].intervals = settingsDraft.openingHours[weekday].intervals
      .filter((_, candidateIndex) => candidateIndex !== index);
    settingsDraft = cloneSettings(settingsDraft);
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && !document.querySelector('.modal-backdrop')) onclose(); }} />

<div class="drawer-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && onclose()}>
  <div class="operations-drawer" role="dialog" aria-modal="true" aria-label="Betrieb und Einstellungen" data-testid="operations-drawer">
    <header class="drawer-header">
      <div><h2>Betrieb & Abgleich</h2><p>Aktuelle Aufgaben, Tagesbetrieb und Einstellungen.</p></div>
      <button class="icon-button" type="button" aria-label="Betrieb schließen" onclick={onclose}>×</button>
    </header>

    <nav class="drawer-tabs">
      <button class:active={tab === 'now'} type="button" onclick={() => ontab('now')}>Jetzt {#if tasks.length}<span>{tasks.length}</span>{/if}</button>
      <button class:active={tab === 'operations'} type="button" onclick={() => ontab('operations')}>Betrieb {#if serviceDay?.rush.status !== 'off'}<i></i>{/if}</button>
      <button class:active={tab === 'data'} type="button" onclick={() => ontab('data')}>Daten & Zeiten</button>
    </nav>

    <div class="drawer-scroll">
      {#if tab === 'now'}
        <section class="drawer-section">
          <div class="section-heading"><div><h3>Nächste Schritte</h3><p>{criticalCount ? `${criticalCount} kritisch` : 'Betrieb im Plan'}</p></div></div>
          <TaskList {tasks} {now} onaction={ontaskaction} {onsnooze} {onacknowledge} />
        </section>
      {:else if tab === 'operations'}
        <section class="drawer-section">
          <div class="section-heading"><div><h3>Wetter & Außenbereich</h3><p>Regen sperrt Außenplätze für neue Planungen.</p></div></div>
          <div class="weather-switch">
            <button class:active={serviceDay?.weather === 'dry'} type="button" onclick={() => onweather('dry')}>☀ Trocken</button>
            <button class:active={serviceDay?.weather === 'rain'} class="rain" type="button" onclick={() => onweather('rain')}>☂ Regen</button>
          </div>
          <label class="toggle-row">
            <input type="checkbox" checked={serviceDay?.outsideOpen ?? false} disabled={serviceDay?.weather === 'rain'} onchange={(event) => onoutside((event.currentTarget as HTMLInputElement).checked)} />
            <span><strong>Außenbereich geöffnet</strong><small>Bestehende Konflikte werden nicht stillschweigend verschoben.</small></span>
          </label>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><div><h3>Wettervorhersage</h3><p>Externe Prognose als Entscheidungshilfe für Mitarbeitende.</p></div></div>
          <div class="notice"><strong>Keine Automatik</strong><p>Diese Daten ändern niemals Wetterstatus, Außenbereich, Aufgaben oder Planung.</p></div>
          <WeatherLocationSettings
            location={state.settings.weatherLocation}
            onsearch={onlocationsearch}
            onsave={(location) => { settingsDraft.weatherLocation = { ...location }; onweatherlocation(location); }}
            onclear={() => { settingsDraft.weatherLocation = null; onweatherlocation(null); }}
          />
        </section>

        <section class="drawer-section rush-section">
          <div class="section-heading"><div><h3>Stoßbetrieb</h3><p>Für Phasen, in denen das Team schneller handeln muss als dokumentieren.</p></div></div>
          {#if serviceDay?.rush.status === 'off'}
            <div class="notice"><strong>Geordneter Betrieb</strong><p>Plan, Aufgaben und Hinweise sind maßgeblich.</p></div>
            <button class="secondary-action full" type="button" onclick={onstartrush}><strong>⚡ Stoßbetrieb starten</strong><span>Hinweise pausieren, Zustand später abgleichen</span></button>
          {:else if serviceDay?.rush.status === 'active'}
            <div class="notice danger"><strong>Stoßbetrieb aktiv</strong><p>Das System beansprucht gerade nicht, den echten Raumzustand vollständig zu kennen.</p></div>
            <button class="primary-action full" type="button" onclick={onendrush}><strong>Stoßbetrieb beenden</strong><span>anschließend Raumzustand erfassen</span></button>
          {:else}
            {#if serviceDay?.rush.status === 'reconciliation-needed'}
              <div class="notice warning"><strong>Abgleich erforderlich</strong><p>Bestätigen Sie zuerst, wer tatsächlich wo sitzt.</p></div>
              <button class="primary-action full" type="button" onclick={onbeginreconcile}><strong>Raumabgleich beginnen</strong></button>
            {:else}
              <div class="reconciliation-header"><strong>{reconciliationPending.length} Vorgänge offen</strong><button class="touch-button success small" type="button" onclick={onwalkin}>＋ nicht erfasster Walk-in</button></div>
              {#each reconciliationPending as reservation}
                <article class="reconcile-card">
                  <div><time>{reservation.startTime}</time><span><strong>{reservation.source === 'walk-in' ? 'Walk-in' : reservation.name}</strong><small>{reservation.partySize} Pers. {reservation.assignment ? `· Tisch ${formatTableList(reservation.assignment.tableIds)}` : '· ohne Tisch'}</small></span></div>
                  <div class="reconcile-actions">
                    {#if reservation.assignment && reservation.status !== 'cleaning'}<button type="button" onclick={() => onconfirmplanned(reservation.id)}>Sitzt wie geplant</button>{/if}
                    {#if reservation.status !== 'cleaning'}<button type="button" onclick={() => onreconcilemove(reservation.id)}>Anderer Tisch</button>{/if}
                    <button type="button" onclick={() => onreconcilegone(reservation.id)}>Schon weg & sauber</button>
                    {#if reservation.status !== 'seated' && reservation.status !== 'cleaning'}<button type="button" onclick={() => onreconcilenoshow(reservation.id)}>Nicht gekommen</button>{/if}
                    <button type="button" onclick={() => onmarkreconciled(reservation.id)}>Nur bestätigen</button>
                  </div>
                </article>
              {/each}
              <button class="primary-action full" type="button" disabled={reconciliationPending.length > 0} onclick={onfinishreconcile}><strong>Abgleich abschließen</strong><span>{reconciliationPending.length > 0 ? 'erst alle Vorgänge klären' : 'geordneter Betrieb wird fortgesetzt'}</span></button>
            {/if}
          {/if}
        </section>

        <section class="drawer-section">
          <label class="large-field"><span>Tagesnotiz</span><textarea bind:value={notes} rows="3" placeholder="Personalengpass, Veranstaltung, Baustelle …"></textarea></label>
          <button class="touch-button secondary" type="button" onclick={() => onnotes(notes)}>Notiz speichern</button>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><div><h3>Platzierung</h3><p>Alle zugeteilten Reservierungen dieses Tages zurück in die Liste legen. Am Tisch sitzende Gäste bleiben.</p></div></div>
          <button class="secondary-action full" data-testid="unassign-all" type="button" disabled={placedCount === 0} onclick={onunassignall}>
            <strong>↩ Alle platzierten zurück in die Liste</strong>
            <span>{placedCount} zugeteilte {placedCount === 1 ? 'Reservierung' : 'Reservierungen'}</span>
          </button>
        </section>

        <section class="drawer-section demo-tools">
          <div class="section-heading"><div><h3>Demo & Testdaten</h3><p>Realistische Belegung zeigen oder den lokalen Stand vollständig leeren.</p></div></div>
          <div class="demo-tool-actions">
            <button class="secondary-action" data-testid="generate-demo-month" type="button" onclick={() => { demoArmed = true; resetArmed = false; }}><strong>Demo-Monat erzeugen</strong><span>30 Tage ab gewähltem Datum</span></button>
            <button class="secondary-action danger-outline" data-testid="reset-all" type="button" onclick={() => { resetArmed = true; demoArmed = false; }}><strong>Alles auf null</strong><span>Reservierungen und Einstellungen löschen</span></button>
          </div>
          {#if demoArmed}
            <div class="notice warning"><strong>Bestehenden Arbeitsstand ersetzen?</strong><p>Reservierungen und Tageszustände werden durch realistische Demo-Daten ersetzt. Betriebseinstellungen bleiben erhalten.</p></div>
            <div class="modal-actions"><button class="touch-button secondary" type="button" onclick={() => demoArmed = false}>Abbrechen</button><button class="touch-button" data-testid="confirm-demo-month" type="button" onclick={() => { demoArmed = false; ondemomonth(); }}>Demo erzeugen</button></div>
          {:else if resetArmed}
            <div class="notice danger"><strong>Wirklich alles auf null setzen?</strong><p>Auch Öffnungszeiten, Wetterstandort und Einstellungen werden auf Standard zurückgesetzt. Vorher bei Bedarf ein Backup herunterladen.</p></div>
            <div class="modal-actions"><button class="touch-button secondary" type="button" onclick={() => resetArmed = false}>Abbrechen</button><button class="touch-button danger" data-testid="confirm-reset-all" type="button" onclick={onreset}>Endgültig zurücksetzen</button></div>
          {/if}
        </section>
      {:else}
        <section class="drawer-section">
          <div class="section-heading"><div><h3>Öffnungszeiten</h3><p>Diese Zeiten bestimmen die Auswahl beim Anlegen einer Reservierung.</p></div></div>
          {#if settingsError}<div class="form-error">{settingsError}</div>{/if}
          <div class="opening-hours-grid">
            {#each WEEKDAYS as weekday}
              <article class:closed={settingsDraft.openingHours[weekday.id].intervals.length === 0} class="opening-day-card">
                <header>
                  <strong>{weekday.shortLabel}<span>{weekday.label}</span></strong>
                  <small>{settingsDraft.openingHours[weekday.id].intervals.length === 0 ? 'Ruhetag' : `${settingsDraft.openingHours[weekday.id].intervals.length} Zeitfenster`}</small>
                  {#if suggestedInterval(weekday.id)}
                    <button data-testid={`opening-${weekday.id}-add`} type="button" onclick={() => addOpeningInterval(weekday.id)}>＋ Zeitfenster</button>
                  {/if}
                </header>
                {#each settingsDraft.openingHours[weekday.id].intervals as interval, index}
                  <div class="opening-interval-row">
                    <span>{index + 1}</span>
                    <input aria-label={`${weekday.label} Zeitfenster ${index + 1} öffnet`} data-testid={`opening-${weekday.id}-${index}-from`} type="time" step="300" bind:value={interval.opensAt} />
                    <span>bis</span>
                    <input aria-label={`${weekday.label} Zeitfenster ${index + 1} schließt`} data-testid={`opening-${weekday.id}-${index}-until`} type="time" step="300" bind:value={interval.closesAt} />
                    <button type="button" aria-label={`${weekday.label} Zeitfenster ${index + 1} entfernen`} onclick={() => removeOpeningInterval(weekday.id, index)}>×</button>
                  </div>
                {:else}
                  <p>Keine Reservierungszeiten an diesem Tag.</p>
                {/each}
              </article>
            {/each}
          </div>
          <button class="touch-button" type="button" onclick={saveSettings}>Öffnungszeiten speichern</button>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><div><h3>Zeitannahmen</h3><p>Diese Werte sind harte Nebenbedingungen des Auto-Plans.</p></div></div>
          <div class="settings-grid">
            <label><span>Reinigung pro Partei</span><input type="number" min="0" max="120" bind:value={settingsDraft.cleaningMinutes} /><small>Minuten</small></label>
            <label><span>Zusammenstellen je Verbindung</span><input type="number" min="0" max="60" bind:value={settingsDraft.joinMinutesPerConnection} /><small>Minuten</small></label>
            <label><span>Rückbau je Verbindung</span><input type="number" min="0" max="60" bind:value={settingsDraft.splitMinutesPerConnection} /><small>Minuten</small></label>
            <label><span>Dauer kleine Gruppe</span><input type="number" min="30" max="360" bind:value={settingsDraft.defaultDurationSmallMinutes} /><small>Minuten</small></label>
            <label><span>Dauer große Gruppe</span><input type="number" min="30" max="480" bind:value={settingsDraft.defaultDurationLargeMinutes} /><small>Minuten</small></label>
            <label><span>Große Gruppe ab</span><input type="number" min="2" max="30" bind:value={settingsDraft.largePartyThreshold} /><small>Personen</small></label>
            <label><span>Platzierung einfrieren</span><input type="number" min="0" max="240" bind:value={settingsDraft.freezeWindowMinutes} /><small>Min. vor Ankunft</small></label>
            <label><span>Ankunftshinweis</span><input type="number" min="0" max="180" bind:value={settingsDraft.arrivalNotificationLeadMinutes} /><small>Min. vorher</small></label>
            <label><span>Vorbereitungshinweis</span><input type="number" min="0" max="180" bind:value={settingsDraft.preparationNotificationLeadMinutes} /><small>Min. vorher</small></label>
            <label><span>Verspätungs-Kulanz</span><input type="number" min="0" max="120" bind:value={settingsDraft.lateGraceMinutes} /><small>Minuten</small></label>
          </div>
          <label class="toggle-row"><input type="checkbox" bind:checked={settingsDraft.autoShareWalkIns} /><span><strong>Walk-ins automatisch teilen</strong><small>Beliebig viele Parteien bis zur Sitzplatzkapazität.</small></span></label>
          <label class="toggle-row"><input type="checkbox" bind:checked={settingsDraft.useBarSeatsForSingles} /><span><strong>Barplätze für Einzelgäste nutzen</strong></span></label>
          <button class="touch-button" type="button" onclick={saveSettings}>Zeitannahmen speichern</button>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><div><h3>Benachrichtigungen</h3><p>Während Stoßbetrieb werden native Hinweise automatisch pausiert.</p></div></div>
          <div class="notice"><strong>Status: {notificationPermission === 'unsupported' ? 'nicht unterstützt' : notificationPermission}</strong><p>Hinweise erscheinen zusätzlich zur Aufgabenleiste, nicht anstelle davon.</p></div>
          <button class="touch-button secondary" type="button" disabled={notificationPermission === 'unsupported'} onclick={onenablenotifications}>Native Hinweise aktivieren</button>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><div><h3>Wix-Reservierungen</h3><p>Wöchentlichen Wix-Export (Tischreservierungen-CSV) einlesen. Künftige Reservierungen mit Status „Reserviert" landen als offen in der Liste; Vergangenes und Duplikate werden übersprungen.</p></div></div>
          <label class="touch-button success file-button" data-testid="wix-import">↑ Wix-Export (CSV) einlesen<input type="file" accept="text/csv,.csv" onchange={importWixFile} /></label>
        </section>

        <section class="drawer-section">
          <div class="section-heading"><div><h3>Backup & Gerätewechsel</h3><p>Ein Export enthält Plan, Einstellungen, Status, Aufgabenquittungen und Audit-Historie.</p></div></div>
          {#if importError}<div class="form-error">{importError}</div>{/if}
          <div class="backup-actions">
            <button class="touch-button" type="button" onclick={onexport}>↓ Backup herunterladen</button>
            <label class="touch-button secondary file-button">↑ Backup importieren<input type="file" accept="application/json,.json" onchange={importFile} /></label>
          </div>
          <p class="fine-print">Nur exakt passende Schema-Versionen werden akzeptiert. Es gibt bewusst keine Legacy-Migration.</p>
        </section>

        <section class="drawer-section audit-section">
          <div class="section-heading"><div><h3>Letzte Änderungen</h3><p>Nachvollziehbarkeit für das Team.</p></div></div>
          {#each state.auditLog.slice(0, 20) as entry}
            <div class="audit-row"><time>{new Date(entry.timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time><span>{entry.message}</span></div>
          {/each}
        </section>
      {/if}
    </div>
  </div>
</div>
