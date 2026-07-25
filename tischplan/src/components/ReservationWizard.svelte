<script lang="ts">
  import type { AppSettings, ReservationDraft, ReservationSource, SeatingPreference, TableDefinition } from '../domain/model';
  import {
    defaultReservationStart,
    durationForPartySize,
    formatOpeningHours,
    isWithinOpeningHours,
    openingHoursForDate,
    reservationTimePresets,
  } from '../domain/settings';

  import type { PlacementAfterCreate } from '../application/uiTypes';
  import LocalDatePicker from './LocalDatePicker.svelte';

  export let initialDate: string;
  export let settings: AppSettings;
  export let initialTime = '';
  export let targetTable: TableDefinition | undefined = undefined;
  export let onfinish: (draft: ReservationDraft, placement: PlacementAfterCreate) => void;
  export let oncancel: () => void;

  let step = 0;
  let source: ReservationSource = 'phone';
  let serviceDate = initialDate;
  let startTime = initialTime || defaultReservationStart(initialDate, settings);
  let partySize = 2;
  let preference: SeatingPreference = targetTable?.region ?? 'none';
  let allowTableSharing = false;
  let name = '';
  let phone = '';
  let email = '';
  let notes = '';
  let error = '';
  let durationOverridden = false;
  let durationMinutes = durationForPartySize(2, settings);
  let moreOpen = false;

  // The planned dwell follows the party-size default until deliberately changed.
  $: if (!durationOverridden) {
    durationMinutes = durationForPartySize(partySize, settings);
  }

  function adjustDuration(delta: number): void {
    durationOverridden = true;
    durationMinutes = Math.min(480, Math.max(30, durationMinutes + delta));
  }

  function durationLabel(minutes: number): string {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
  }

  const sourceOptions: { value: ReservationSource; icon: string; label: string }[] = [
    { value: 'phone', icon: '☎', label: 'Telefonisch' },
    { value: 'in-person', icon: '●', label: 'Persönlich' },
    { value: 'online', icon: '↗', label: 'Online' },
    { value: 'other', icon: '•••', label: 'Sonstige' },
  ];
  const preferences: { value: SeatingPreference; icon: string; label: string; sub: string }[] = [
    { value: 'none', icon: '◇', label: 'Egal', sub: 'beste verfügbare Option' },
    { value: 'inside', icon: '⌂', label: 'Innen', sub: 'verbindlicher Wunsch' },
    { value: 'outside', icon: '☀', label: 'Außen', sub: 'nur bei trockenem Wetter' },
  ];

  $: openingHours = openingHoursForDate(serviceDate, settings);
  $: timePresets = reservationTimePresets(serviceDate, settings);

  function changeServiceDate(nextDate: string): void {
    error = '';
    serviceDate = nextDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(nextDate) && !isWithinOpeningHours(nextDate, startTime, settings)) {
      startTime = defaultReservationStart(nextDate, settings);
    }
  }

  function next(): void {
    error = '';
    if (step === 1 && openingHours.intervals.length === 0) {
      error = 'An diesem Wochentag ist der Betrieb geschlossen.';
      return;
    }
    if (step === 1 && !isWithinOpeningHours(serviceDate, startTime, settings)) {
      error = `Bitte eine Uhrzeit innerhalb der Öffnungsfenster ${formatOpeningHours(openingHours)} wählen.`;
      return;
    }
    if (step === 2 && targetTable && partySize > targetTable.capacity) {
      error = `Tisch ${targetTable.number} hat höchstens ${targetTable.capacity} Plätze.`;
      return;
    }
    if (step === 2 && !name.trim()) {
      error = 'Bitte einen Namen eingeben.';
      return;
    }
    step = Math.min(3, step + 1);
  }

  function back(): void {
    error = '';
    step = Math.max(0, step - 1);
  }

  function finish(placement: PlacementAfterCreate): void {
    if (!name.trim()) {
      error = 'Bitte einen Namen eingeben.';
      step = 2;
      return;
    }
    onfinish({
      serviceDate,
      startTime,
      partySize,
      name,
      phone,
      email,
      notes,
      source,
      preference,
      allowTableSharing,
      durationMinutes,
    }, placement);
  }
</script>

<div class="wizard">
  <div class="wizard-progress" aria-label={`Schritt ${step + 1} von 4`}>
    {#each [0, 1, 2, 3] as item}<i class:active={item <= step}></i>{/each}
  </div>

  {#if step === 0}
    <div class="wizard-copy"><h3>Wie kam die Reservierung rein?</h3><p>Eine große Auswahlfläche pro Schritt vermeidet Fehleingaben.</p></div>
    <div class="choice-grid two">
      {#each sourceOptions as option}
        <button class:selected={source === option.value} type="button" onclick={() => { source = option.value; next(); }}>
          <span class="choice-icon">{option.icon}</span><strong>{option.label}</strong>
        </button>
      {/each}
    </div>
  {:else if step === 1}
    <div class="wizard-copy"><h3>Wann kommen die Gäste?</h3><p>Datum und Uhrzeit gelten als erwartete Ankunft.</p></div>
    {#if error}<div class="form-error">{error}</div>{/if}
    <LocalDatePicker caption="Datum" label="Reservierungsdatum" testid="reservation-date" value={serviceDate} onchange={changeServiceDate} large />
    {#if openingHours.intervals.length > 0}
      <div class="opening-hours-hint"><span>Öffnungszeiten</span><strong>{formatOpeningHours(openingHours)}</strong></div>
      <div class="time-grid">
        {#each timePresets as preset}
          <button class:selected={startTime === preset} type="button" onclick={() => startTime = preset}>{preset}</button>
        {/each}
      </div>
      <label class="large-field"><span>Andere Uhrzeit</span><input data-testid="reservation-time" type="time" bind:value={startTime} step="300" /></label>
    {:else}
      <div class="notice warning" data-testid="reservation-closed-day"><strong>Ruhetag</strong><p>Für diesen Wochentag sind keine Öffnungszeiten hinterlegt.</p></div>
    {/if}
  {:else if step === 2}
    <div class="wizard-copy"><h3>{targetTable ? `Gruppe für Tisch ${targetTable.number}` : 'Gruppe und Name'}</h3></div>
    {#if error}<div class="form-error">{error}</div>{/if}
    <div class="pax-stepper">
      <span>Personen</span>
      <button type="button" onclick={() => partySize = Math.max(1, partySize - 1)}>−</button>
      <b data-testid="reservation-party-size">{partySize}</b>
      <button type="button" onclick={() => partySize = Math.min(50, partySize + 1)}>＋</button>
    </div>
    <label class="large-field required"><span>Name *</span><input data-testid="reservation-name" bind:value={name} autocomplete="name" /></label>
    <label class="large-field"><span>Telefon</span><input bind:value={phone} inputmode="tel" autocomplete="tel" /></label>
    {#if targetTable}
      <div class="fixed-table-choice"><span>✓</span><div><strong>Tisch {targetTable.number} fest ausgewählt</strong><small>Die Verfügbarkeit wird beim Speichern erneut geprüft.</small></div></div>
    {/if}
    <button class="text-button more-toggle" type="button" onclick={() => moreOpen = !moreOpen}>{moreOpen ? '− Weniger' : '＋ Mehr (Dauer, Sitzbereich, E-Mail, Notiz)'}</button>
    {#if moreOpen}
      <div class="pax-stepper duration-stepper">
        <span>Geplante Dauer<small>{durationOverridden ? 'angepasst' : 'Standard'} · Std.</small></span>
        <button type="button" aria-label="15 Minuten kürzer" onclick={() => adjustDuration(-15)}>−</button>
        <b data-testid="reservation-duration">{durationLabel(durationMinutes)}</b>
        <button type="button" aria-label="15 Minuten länger" onclick={() => adjustDuration(15)}>＋</button>
      </div>
      {#if !targetTable}
        <div class="choice-grid three">
          {#each preferences as option}
            <button
              class:selected={preference === option.value}
              data-testid={`preference-${option.value}`}
              type="button"
              onclick={() => preference = option.value}
            >
              <span class="choice-icon">{option.icon}</span><strong>{option.label}</strong><small>{option.sub}</small>
            </button>
          {/each}
        </div>
        <label class="toggle-row">
          <input type="checkbox" bind:checked={allowTableSharing} />
          <span><strong>Geteilten Tisch im Notfall erlauben</strong><small>Mehrere Parteien nur solange die Sitzplatzkapazität reicht.</small></span>
        </label>
      {/if}
      <label class="large-field"><span>E-Mail</span><input bind:value={email} inputmode="email" autocomplete="email" /></label>
      <label class="large-field"><span>Notiz</span><textarea bind:value={notes} rows="2" placeholder="Kinderstuhl, Geburtstag, ruhige Ecke …"></textarea></label>
    {/if}
  {:else}
    <div class="wizard-copy"><h3>{targetTable ? `Für Tisch ${targetTable.number} reservieren` : 'Wie soll es weitergehen?'}</h3><p><b>{name}</b> · {partySize} Pers. · {startTime} · {durationLabel(durationMinutes)} Std. · {targetTable ? `Tisch ${targetTable.number}` : preference === 'none' ? 'kein Bereichswunsch' : preference === 'inside' ? 'innen' : 'außen'}</p></div>
    <div class="next-step-stack">
      {#if targetTable}
        <button class="primary-action success" data-testid="finish-selected-table" type="button" onclick={() => finish('selected-table')}><strong>✓ Verbindlich für Tisch {targetTable.number} anlegen</strong><span>Konflikt, Reinigung und Kapazität werden nochmals geprüft</span></button>
      {:else}
        <div class="placement-action-row">
          <button class="primary-action success" type="button" onclick={() => finish('manual')}><strong>Tisch auswählen</strong><span>auf dem Plan antippen</span></button>
          <button class="secondary-action" data-testid="finish-auto" type="button" onclick={() => finish('auto')}><strong>Auto-Platzierung</strong><span>beste freie Option</span></button>
        </div>
        <button class="text-button" type="button" onclick={() => finish('list')}>Nur in die Liste – später platzieren</button>
      {/if}
    </div>
  {/if}

  <div class="wizard-footer">
    {#if step > 0}<button class="touch-button secondary" type="button" onclick={back}>Zurück</button>{:else}<button class="touch-button secondary" type="button" onclick={oncancel}>Abbrechen</button>{/if}
    {#if step > 0 && step < 3}<button class="touch-button success wizard-next" type="button" onclick={next}>Weiter</button>{/if}
  </div>
</div>
