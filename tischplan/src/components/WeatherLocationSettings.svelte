<script lang="ts">
  import type { WeatherLocation } from '../domain/model';

  export let location: WeatherLocation | null;
  export let onsearch: (query: string) => Promise<WeatherLocation[]>;
  export let onsave: (location: WeatherLocation) => void;
  export let onclear: () => void;

  let query = '';
  let results: WeatherLocation[] = [];
  let loading = false;
  let error = '';

  async function search(): Promise<void> {
    error = '';
    results = [];
    if (query.trim().length < 2) {
      error = 'Bitte mindestens zwei Zeichen eingeben.';
      return;
    }
    loading = true;
    try {
      results = await onsearch(query);
      if (results.length === 0) {
        error = 'Kein passender Standort gefunden.';
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  }

  function select(result: WeatherLocation): void {
    onsave(result);
    query = '';
    results = [];
  }
</script>

<div class="weather-location-settings">
  {#if location}
    <div class="configured-location"><span>⌖</span><div><strong>{location.label}</strong><small>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</small></div><button type="button" onclick={onclear}>Entfernen</button></div>
  {/if}
  <form onsubmit={(event) => { event.preventDefault(); void search(); }}>
    <label class="large-field"><span>{location ? 'Anderen Standort suchen' : 'Ort oder Postleitzahl'}</span><input data-testid="weather-location-query" bind:value={query} placeholder="z. B. 10115 Berlin" autocomplete="off" /></label>
    <button class="touch-button secondary" type="submit" disabled={loading}>{loading ? 'Suche …' : 'Standort suchen'}</button>
  </form>
  {#if error}<div class="form-error">{error}</div>{/if}
  {#if results.length > 0}
    <div class="location-results">
      {#each results as result}
        <button type="button" onclick={() => select(result)}><span>⌖</span><strong>{result.label}</strong><b>Auswählen</b></button>
      {/each}
    </div>
  {/if}
  <p class="fine-print">Die Suche startet nur auf Knopfdruck. Koordinaten werden an OpenStreetMap und für Vorhersagen an Bright Sky übertragen.</p>
</div>

