<script lang="ts">
  import type { WeatherForecast } from '../application/weatherForecast';
  import { weatherSymbol } from '../application/weatherForecast';
  import { formatClock } from '../domain/time';

  export let forecast: WeatherForecast;
  export let onclose: () => void;

  let selectedDate = forecast.days[0]?.serviceDate ?? '';
  $: selectedDay = forecast.days.find((day) => day.serviceDate === selectedDate) ?? forecast.days[0];

  function dayLabel(serviceDate: string): string {
    const [year, month, day] = serviceDate.split('-').map(Number);
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
      .format(new Date(year, month - 1, day));
  }
</script>

<div class="weather-detail" data-testid="weather-detail">
  <div class="weather-detail-heading">
    <div><span>Standort</span><strong>{forecast.location.label}</strong></div>
    <small>Aktualisiert {formatClock(forecast.fetchedAt)}</small>
  </div>
  <div class="weather-information-note"><strong>Nur zur Information</strong><span>Die Vorhersage ändert weder Wetterstatus noch Außenbereich oder Planung.</span></div>

  <div class="weather-day-grid">
    {#each forecast.days as day}
      <button class:selected={day.serviceDate === selectedDate} type="button" onclick={() => selectedDate = day.serviceDate}>
        <span>{dayLabel(day.serviceDate)}</span><i>{weatherSymbol(day.icon)}</i><strong>{Math.round(day.maximumTemperature)}°</strong><small>{Math.round(day.minimumTemperature)}°</small>
        <b>☂ {day.precipitationProbability}%</b>
      </button>
    {/each}
  </div>

  {#if selectedDay}
    <section class="weather-day-detail">
      <header><div><i>{weatherSymbol(selectedDay.icon)}</i><span><strong>{selectedDay.condition}</strong><small>{Math.round(selectedDay.minimumTemperature)}–{Math.round(selectedDay.maximumTemperature)} °C</small></span></div><div><b>{selectedDay.precipitation} mm</b><small>Niederschlag</small></div><div><b>{Math.round(selectedDay.maximumWindGustSpeed)} km/h</b><small>stärkste Böe</small></div></header>
      <div class="weather-hourly-list">
        {#each selectedDay.hours as hour, index}
          {#if index % 3 === 0}
            <div><time>{formatClock(hour.timestamp)}</time><i>{weatherSymbol(hour.icon)}</i><strong>{Math.round(hour.temperature)}°</strong><span>☂ {Math.round(hour.precipitationProbability)}% · {hour.precipitation} mm</span><span>Wind {Math.round(hour.windSpeed)} · Böen {Math.round(hour.windGustSpeed)} km/h</span></div>
          {/if}
        {/each}
      </div>
    </section>
  {/if}

  <p class="weather-attribution">Wetterdaten: <a href="https://brightsky.dev/" target="_blank" rel="noreferrer">Bright Sky</a> / Deutscher Wetterdienst · Standortsuche: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap-Mitwirkende</a></p>
  <button class="modal-close-button" type="button" onclick={onclose}>Schließen</button>
</div>
