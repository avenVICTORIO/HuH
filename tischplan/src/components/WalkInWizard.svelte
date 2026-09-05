<script lang="ts">
  import type { SeatingPreference } from '../domain/model';
  import type { PlacementAfterCreate } from '../application/uiTypes';

  export let onfinish: (partySize: number, preference: SeatingPreference, placement: PlacementAfterCreate) => void;
  export let oncancel: () => void;

  let step = 0;
  let partySize = 2;
  let preference: SeatingPreference = 'none';
  const quickSizes = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];
</script>

<div class="wizard walkin-wizard">
  <div class="wizard-progress"><i class:active={step >= 0}></i><i class:active={step >= 1}></i></div>
  {#if step === 0}
    <div class="wizard-copy"><h3>Walk-in · Gästezahl</h3><p>Geteilte Belegung ist für Walk-ins standardmäßig erlaubt.</p></div>
    <div class="big-number">{partySize}</div>
    <div class="number-grid">
      {#each quickSizes as size}<button class:selected={partySize === size} type="button" onclick={() => partySize = size}>{size}</button>{/each}
    </div>
    <div class="pax-stepper compact"><button type="button" onclick={() => partySize = Math.max(1, partySize - 1)}>−</button><b>{partySize}</b><button type="button" onclick={() => partySize = Math.min(50, partySize + 1)}>＋</button></div>
    <div class="choice-grid three compact-choices">
      <button class:selected={preference === 'none'} type="button" onclick={() => preference = 'none'}><strong>Egal</strong></button>
      <button class:selected={preference === 'inside'} type="button" onclick={() => preference = 'inside'}><strong>Innen</strong></button>
      <button class:selected={preference === 'outside'} type="button" onclick={() => preference = 'outside'}><strong>Außen</strong></button>
    </div>
  {:else}
    <div class="wizard-copy"><h3>{partySize} Walk-in-Gäste</h3><p>{preference === 'none' ? 'Ohne Bereichswunsch' : preference === 'inside' ? 'Wunsch: innen' : 'Wunsch: außen'}</p></div>
    <div class="next-step-stack">
      <button class="primary-action" data-testid="walkin-auto" type="button" onclick={() => onfinish(partySize, preference, 'auto')}><strong>Direkt automatisch platzieren</strong><span>Geteilte Plätze werden genutzt, wenn es sinnvoll ist.</span></button>
      <button class="secondary-action" type="button" onclick={() => onfinish(partySize, preference, 'manual')}><strong>Auf dem Plan platzieren</strong></button>
      <button class="secondary-action" type="button" onclick={() => onfinish(partySize, preference, 'list')}><strong>Erst in die Liste</strong></button>
    </div>
  {/if}
  <div class="wizard-footer">
    <button class="touch-button secondary" type="button" onclick={() => step === 0 ? oncancel() : step = 0}>{step === 0 ? 'Abbrechen' : 'Zurück'}</button>
    {#if step === 0}<button class="touch-button success" type="button" onclick={() => step = 1}>Weiter</button>{/if}
  </div>
</div>
