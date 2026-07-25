<script lang="ts">
  import type { PlacementChoice, Reservation } from '../domain/model';
  import { formatTableList, regionLabel, tableById } from '../domain/tableCatalog';
  import { formatClock, MINUTE_MS, reservationStart } from '../domain/time';

  export let reservation: Reservation;
  export let tableId: string;
  export let choices: PlacementChoice[];
  export let onassign: (choice: PlacementChoice, overrideReason: string) => void;
  export let oncancel: () => void;
  export let intro = '';

  let overrideReason = '';
  $: table = tableById(tableId);
  // Geteilte Belegung ist der seltene Sonderfall – nur zeigen, wenn die
  // Reservierung Teilung erlaubt (oder ein Walk-in dazugesetzt werden soll).
  $: visibleChoices = choices.filter((choice) => (
    choice.mode !== 'shared' || reservation.allowTableSharing || choice.seatedSharingOverrideRequired
  ));

  function needsReason(choice: PlacementChoice): boolean {
    return choice.preferenceOverrideRequired
      || choice.sharingOverrideRequired
      || choice.seatedSharingOverrideRequired
      || choice.shortenedDurationMinutes !== undefined;
  }

  function shortenedUntil(choice: PlacementChoice): string {
    return formatClock(reservationStart(reservation) + (choice.shortenedDurationMinutes ?? 0) * MINUTE_MS);
  }

  function choose(choice: PlacementChoice): void {
    if (!choice.available) {
      return;
    }
    // Abschluss nie blockieren: fehlt bei einer Abweichung ein Grund,
    // wird automatisch ein neutraler Standardgrund gesetzt.
    const reason = needsReason(choice) && !overrideReason.trim()
      ? 'Manuell vom Betrieb gesetzt'
      : overrideReason.trim();
    onassign(choice, reason);
  }
</script>

<div class="placement-options">
  <div class="wizard-copy"><h3>{reservation.name} · {reservation.partySize} Pers.</h3><p>{intro || `Tisch ${table.number} antippen zum Platzieren.`}</p></div>

  <div class="placement-list">
    {#each visibleChoices as choice}
      <button class:disabled={!choice.available} class:override={needsReason(choice)} type="button" disabled={!choice.available} onclick={() => choose(choice)}>
        <div>
          <strong>{choice.option.kind === 'joined' ? 'Tische' : 'Tisch'} {formatTableList(choice.option.tableIds)}</strong>
          <span>{choice.option.capacity} Plätze · {regionLabel(choice.option.region)}{choice.mode === 'shared' ? ' · geteilt' : ''}</span>
        </div>
        <small>
          {#if choice.shortenedDurationMinutes !== undefined}
            Nur bis {shortenedUntil(choice)} frei · verkürzt auf {choice.shortenedDurationMinutes} Min. — bitte Gäste vorab informieren
          {:else if choice.seatedSharingOverrideRequired}
            Zu bereits sitzender Partei dazusetzen — bitte Gäste am Tisch vorab fragen
          {:else}
            {choice.reason ?? (choice.option.connectionCount > 0 ? `${choice.option.connectionCount} Verbindung(en) vorbereiten` : 'sofort möglich')}
          {/if}
        </small>
      </button>
    {/each}
  </div>

  {#if visibleChoices.some((choice) => choice.available && needsReason(choice))}
    <label class="large-field"><span>Grund für Abweichung (optional)</span><input bind:value={overrideReason} placeholder="z. B. Gast wünscht spontan außen" /></label>
  {/if}
  <button class="modal-close-button" type="button" onclick={oncancel}>Abbrechen</button>
</div>
