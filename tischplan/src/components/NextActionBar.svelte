<script lang="ts">
  import type { RushStatus } from '../domain/model';

  export let rushStatus: RushStatus = 'off';
  export let onopen: () => void;
</script>

{#if rushStatus === 'active'}
  <button class="next-action rush" type="button" onclick={onopen} data-testid="rush-banner">
    <span class="next-icon">⚡</span>
    <span><strong>Stoßbetrieb aktiv</strong><small>Hinweise pausiert · danach Raumzustand abgleichen</small></span>
    <b>Öffnen ›</b>
  </button>
{/if}
