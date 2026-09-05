<script lang="ts">
  import type { Reservation } from '../domain/model';
  import { formatTableList, regionLabel } from '../domain/tableCatalog';
  import {
    ARRIVAL_CONFIRMATION_LEAD_MINUTES,
    MINUTE_MS,
    canConfirmArrival,
    formatClock,
    reservationCleaningEnd,
    reservationStart,
  } from '../domain/time';
  import type { AppSettings } from '../domain/model';

  export let reservation: Reservation;
  export let settings: AppSettings;
  export let now: number;
  export let onauto: () => void;
  export let onmanual: () => void;
  export let autoTargetLabel: string | null = null;
  export let onedit: () => void;
  export let onarrive: () => void;
  export let onleft: () => void;
  export let onclean: () => void;
  export let onreset: () => void;
  export let ondelay: (minutes: number) => void;
  export let onnoshow: () => void;
  export let onunassign: () => void;
  export let onunlock: () => void;
  export let oncancelreservation: () => void;
  export let onclose: () => void;

  const labels = {
    unassigned: 'Offen', assigned: 'Platziert', seated: 'Am Tisch', cleaning: 'Reinigung', done: 'Beendet', 'no-show': 'No-Show', cancelled: 'Storniert',
  } as const;
  $: expectedStart = reservationStart(reservation);
  $: arrivalConfirmationAvailable = canConfirmArrival(reservation, now);
  $: noShowAvailable = now >= expectedStart;
</script>

<div class="reservation-detail">
  <div class="detail-hero">
    <div class="detail-time"><strong>{formatClock(expectedStart)}</strong>{#if reservation.delayMinutes > 0}<span>+{reservation.delayMinutes} Min.</span>{/if}</div>
    <div><h3>{reservation.source === 'walk-in' ? 'Walk-in' : reservation.name}</h3><p>{reservation.partySize} Personen · {labels[reservation.status]}</p></div>
    <span class={`status-chip ${reservation.status}`}>{labels[reservation.status]}</span>
  </div>

  <div class="primary-actions">
    {#if reservation.status === 'unassigned'}
      <div class="placement-action-row">
        <button class="primary-action success" type="button" onclick={onmanual}><strong>Tisch auswählen</strong><span>auf dem Plan antippen</span></button>
        <button class="secondary-action" type="button" onclick={onauto}><strong>Auto-Platzierung</strong><span>{autoTargetLabel ? `Tisch ${autoTargetLabel} · beste freie Option` : 'keine sichere Option frei'}</span></button>
      </div>
    {:else if reservation.status === 'assigned'}
      {#if arrivalConfirmationAvailable}
        <button class="primary-action success" data-testid="mark-arrived" type="button" onclick={onarrive}><strong>✓ Ankunft bestätigen</strong><span>Gäste sind da · Tisch {formatTableList(reservation.assignment?.tableIds ?? [])}</span></button>
      {:else}
        <div class="arrival-wait-state" data-testid="arrival-wait-state">
          <span>Geplante Ankunft</span>
          <strong>{formatClock(expectedStart)} · Tisch {formatTableList(reservation.assignment?.tableIds ?? [])}</strong>
          <small>Bestätigung ab {formatClock(expectedStart - ARRIVAL_CONFIRMATION_LEAD_MINUTES * MINUTE_MS)}</small>
        </div>
      {/if}
      <button class="secondary-action" type="button" onclick={onmanual}><strong>⇄ Anderen Tisch wählen</strong></button>
      <div class="delay-actions"><span>Verspätet:</span>{#each [10, 15, 30, 45] as minutes}<button type="button" onclick={() => ondelay(minutes)}>+{minutes}</button>{/each}</div>
    {:else if reservation.status === 'seated'}
      <button class="primary-action success" data-testid="mark-left" type="button" onclick={onleft}><strong>✓ Gäste sind gegangen</strong><span>Tisch wird sofort wieder frei</span></button>
    {/if}
  </div>

  {#if reservation.status === 'assigned'}
    <div class="secondary-button-grid">
      {#if noShowAvailable}<button type="button" onclick={onnoshow}>No-Show</button>{/if}
      <button type="button" onclick={onunassign}>Zurück in Liste</button>
      {#if reservation.assignment?.locked}<button type="button" onclick={onunlock}>Für Auto-Plan freigeben</button>{/if}
    </div>
  {/if}

  {#if !['seated', 'cleaning', 'done', 'no-show', 'cancelled'].includes(reservation.status)}
    <div class="secondary-button-grid"><button type="button" onclick={onedit}>Bearbeiten</button><button class="danger-text" type="button" onclick={oncancelreservation}>Stornieren</button></div>
  {/if}

  <div class="detail-grid">
    <div><span>Sitzbereich</span><strong>{reservation.preference === 'none' ? 'keine Präferenz' : regionLabel(reservation.preference)}</strong></div>
    <div><span>Dauer</span><strong>{reservation.durationMinutes} Min.</strong></div>
    <div><span>Tischteilung</span><strong>{reservation.allowTableSharing ? 'erlaubt' : 'nicht gewünscht'}</strong></div>
    <div><span>Quelle</span><strong>{reservation.source}</strong></div>
  </div>

  {#if reservation.assignment}
    <div class="assignment-summary">
      <div><span>{reservation.assignment.tableIds.length > 1 ? 'Tischkombination' : 'Tisch'}</span><strong>{formatTableList(reservation.assignment.tableIds)}</strong></div>
      <div><span>Belegung</span><strong>{reservation.assignment.mode === 'shared' ? 'geteilt' : 'ganzer Tisch'} · {reservation.assignment.locked ? 'fixiert' : 'optimierbar'}</strong></div>
      {#if reservation.assignment.overrideReason}<small>Abweichung: {reservation.assignment.overrideReason}</small>{/if}
    </div>
  {/if}

  {#if reservation.notes}<div class="note-box"><span>Notiz</span>{reservation.notes}</div>{/if}
  {#if reservation.phone || reservation.email}
    <div class="contact-row">
      {#if reservation.phone}<a class="touch-button secondary" href={`tel:${reservation.phone.replace(/\s/g, '')}`}>☎ {reservation.phone}</a>{/if}
      {#if reservation.email}<a class="touch-button secondary" href={`mailto:${reservation.email}`}>✉ E-Mail</a>{/if}
    </div>
  {/if}

  <button class="modal-close-button" type="button" onclick={onclose}>Schließen</button>
</div>
