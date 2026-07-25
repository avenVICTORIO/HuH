<script lang="ts">
  import type { Reservation, SeatingPreference } from '../domain/model';
  import type { ReservationUpdate } from '../application/appController';
  import LocalDatePicker from './LocalDatePicker.svelte';

  export let reservation: Reservation;
  export let onsave: (update: ReservationUpdate) => void;
  export let oncancel: () => void;

  let serviceDate = reservation.serviceDate;
  let startTime = reservation.startTime;
  let durationMinutes = reservation.durationMinutes;
  let partySize = reservation.partySize;
  let name = reservation.name;
  let phone = reservation.phone;
  let email = reservation.email;
  let notes = reservation.notes;
  let preference: SeatingPreference = reservation.preference;
  let allowTableSharing = reservation.allowTableSharing;
  let error = '';

  function save(): void {
    if (!name.trim()) {
      error = 'Name darf nicht leer sein.';
      return;
    }
    onsave({ serviceDate, startTime, durationMinutes, partySize, name, phone, email, notes, preference, allowTableSharing });
  }
</script>

<div class="edit-form">
  {#if error}<div class="form-error">{error}</div>{/if}
  <div class="form-row">
    <LocalDatePicker caption="Datum" label="Reservierungsdatum bearbeiten" value={serviceDate} onchange={(value) => serviceDate = value} large />
    <label class="large-field"><span>Uhrzeit</span><input type="time" bind:value={startTime} /></label>
  </div>
  <div class="form-row">
    <label class="large-field"><span>Personen</span><input type="number" min="1" max="50" bind:value={partySize} /></label>
  </div>
  <div class="pax-stepper duration-stepper">
    <span>Geplante Dauer<small>Std.</small></span>
    <button type="button" aria-label="15 Minuten kürzer" onclick={() => durationMinutes = Math.max(30, durationMinutes - 15)}>−</button>
    <b data-testid="edit-duration">{Math.floor(durationMinutes / 60)}:{String(durationMinutes % 60).padStart(2, '0')}</b>
    <button type="button" aria-label="15 Minuten länger" onclick={() => durationMinutes = Math.min(480, durationMinutes + 15)}>＋</button>
  </div>
  <label class="large-field required"><span>Name</span><input bind:value={name} /></label>
  <div class="form-row">
    <label class="large-field"><span>Telefon</span><input bind:value={phone} inputmode="tel" /></label>
    <label class="large-field"><span>E-Mail</span><input bind:value={email} inputmode="email" /></label>
  </div>
  <label class="large-field"><span>Notiz</span><textarea bind:value={notes} rows="2"></textarea></label>
  <div class="choice-grid three compact-choices">
    <button class:selected={preference === 'none'} type="button" onclick={() => preference = 'none'}>Egal</button>
    <button class:selected={preference === 'inside'} type="button" onclick={() => preference = 'inside'}>Innen</button>
    <button class:selected={preference === 'outside'} type="button" onclick={() => preference = 'outside'}>Außen</button>
  </div>
  <label class="toggle-row"><input type="checkbox" bind:checked={allowTableSharing} /><span><strong>Tischteilung erlauben</strong><small>Kapazitätsbasiert, ohne feste Parteiengrenze.</small></span></label>
  <div class="modal-actions"><button class="touch-button secondary" type="button" onclick={oncancel}>Abbrechen</button><button class="touch-button" type="button" onclick={save}>Speichern</button></div>
</div>
