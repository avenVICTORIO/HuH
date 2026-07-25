<script lang="ts">
  export let title = '';
  export let wide = false;
  export let onclose: () => void;
  export let onback: (() => void) | undefined = undefined;
  export let backLabel = 'Zurück';
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onclose(); } }} />

<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && onclose()}>
  <div class:wide class="modal-card" role="dialog" aria-modal="true" aria-label={title}>
    <header class="modal-header">
      <div>
        {#if onback}
          <button class="modal-back-button" type="button" aria-label={backLabel} onclick={onback}><span aria-hidden="true">←</span>{backLabel}</button>
        {/if}
        {#if title}<h2>{title}</h2>{/if}
      </div>
      <button class="icon-button" type="button" aria-label="Schließen" onclick={onclose}>×</button>
    </header>
    <div class="modal-body"><slot /></div>
  </div>
</div>
