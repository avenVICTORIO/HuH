<script lang="ts">
  import type { WeatherLocation } from '../domain/model';
  import { weatherSymbol, type WeatherForecastState, type WeatherHour } from '../application/weatherForecast';
  import { formatClock } from '../domain/time';

  export let location: WeatherLocation;
  export let state: WeatherForecastState;
  export let now: number;
  export let onopen: () => void;
  export let onretry: () => void;

  $: forecast = state.status === 'ready' || state.status === 'loading' || state.status === 'error'
    ? state.forecast
    : undefined;
  $: nextHours = forecast?.hours.filter((hour) => hour.timestamp >= now - 30 * 60_000).slice(0, 3) ?? [];

  function rainLevel(hour: WeatherHour): 0 | 1 | 2 {
    if (hour.precipitationProbability >= 60 || hour.precipitation >= 1) return 2;
    if (hour.precipitationProbability >= 30 || hour.precipitation > 0) return 1;
    return 0;
  }

  function windLevel(hour: WeatherHour): 0 | 1 | 2 {
    if (hour.windGustSpeed >= 40) return 2;
    if (hour.windGustSpeed >= 25) return 1;
    return 0;
  }

  function hourVerdict(hour: WeatherHour): { level: 0 | 1 | 2; word: string } {
    const rain = rainLevel(hour);
    const wind = windLevel(hour);
    if (rain === 2) return { level: 2, word: `Regen ${Math.round(hour.precipitationProbability)}%` };
    if (wind === 2) return { level: 2, word: 'Sturmböen' };
    if (rain === 1) return { level: 1, word: 'evtl. Regen' };
    if (wind === 1) return { level: 1, word: 'windig' };
    return { level: 0, word: 'trocken' };
  }

  $: overallLevel = nextHours.length > 0
    ? Math.max(...nextHours.map((hour) => hourVerdict(hour).level)) as 0 | 1 | 2
    : 0;
  const overallText = ['Draußen ok', 'Draußen unsicher', 'Nicht draußen'] as const;
</script>

<aside class="weather-overlay" data-testid="weather-overlay">
  <button class="weather-overlay-main" type="button" onclick={onopen} disabled={!forecast}>
    <span class="weather-location">
      {#if nextHours.length > 0}<b class={`weather-verdict level-${overallLevel}`}>{overallLevel === 0 ? '✓' : '⚠'} {overallText[overallLevel]}</b>{:else}<b>Vorhersage</b>{/if}
      <small>{location.label.split(',')[0]}</small>
    </span>
    {#each nextHours as hour}
      {@const verdict = hourVerdict(hour)}
      <span
        class="weather-hour"
        class:warn={verdict.level === 1}
        class:alert={verdict.level === 2}
        title={`Regen ${Math.round(hour.precipitationProbability)} % · Böen bis ${Math.round(hour.windGustSpeed)} km/h`}
      >
        <time>{formatClock(hour.timestamp)}</time>
        <i>{weatherSymbol(hour.icon)}</i>
        <strong>{Math.round(hour.temperature)}°</strong>
        <small class={`weather-word level-${verdict.level}`}>{verdict.word}</small>
      </span>
    {/each}
    {#if state.status === 'loading' && nextHours.length === 0}<span class="weather-message">Wetter wird geladen …</span>{/if}
    {#if state.status === 'error' && nextHours.length === 0}<span class="weather-message error">Wetter nicht verfügbar</span>{/if}
  </button>
  {#if state.status === 'error'}<button class="weather-retry" type="button" aria-label="Wetter erneut laden" onclick={onretry}>↻</button>{/if}
</aside>

