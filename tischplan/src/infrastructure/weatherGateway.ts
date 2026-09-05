import type { WeatherLocation } from '../domain/model';
import { buildWeatherForecast, type WeatherForecast, type WeatherHour } from '../application/weatherForecast';

interface BrightSkyRecord {
  timestamp: string;
  temperature: number | null;
  precipitation: number | null;
  precipitation_probability: number | null;
  wind_speed: number | null;
  wind_gust_speed: number | null;
  icon: string | null;
  condition: string | null;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function brightSkyRecord(value: unknown): BrightSkyRecord | undefined {
  if (!isRecord(value) || typeof value.timestamp !== 'string') {
    return undefined;
  }
  return {
    timestamp: value.timestamp,
    temperature: nullableNumber(value.temperature),
    precipitation: nullableNumber(value.precipitation),
    precipitation_probability: nullableNumber(value.precipitation_probability),
    wind_speed: nullableNumber(value.wind_speed),
    wind_gust_speed: nullableNumber(value.wind_gust_speed),
    icon: typeof value.icon === 'string' ? value.icon : null,
    condition: typeof value.condition === 'string' ? value.condition : null,
  };
}

function toWeatherHour(record: BrightSkyRecord): WeatherHour | undefined {
  const timestamp = Date.parse(record.timestamp);
  if (!Number.isFinite(timestamp) || record.temperature === null) {
    return undefined;
  }
  return {
    timestamp,
    temperature: record.temperature,
    precipitation: record.precipitation ?? 0,
    precipitationProbability: record.precipitation_probability ?? 0,
    windSpeed: record.wind_speed ?? 0,
    windGustSpeed: record.wind_gust_speed ?? record.wind_speed ?? 0,
    icon: record.icon ?? record.condition ?? 'unknown',
    condition: record.condition ?? 'unknown',
  };
}

export class WeatherGateway {
  private readonly locationCache = new Map<string, WeatherLocation[]>();
  private lastLocationRequestAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
    private readonly now: () => number = Date.now,
  ) {}

  async forecast(location: WeatherLocation, now = Date.now()): Promise<WeatherForecast> {
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1_000);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
    const parameters = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      date: start.toISOString(),
      last_date: end.toISOString(),
      tz: timezone,
      units: 'dwd',
    });
    const response = await this.fetcher(`https://api.brightsky.dev/weather?${parameters}`);
    if (!response.ok) {
      throw new Error(`Wetterdienst antwortet mit Status ${response.status}.`);
    }
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.weather)) {
      throw new Error('Der Wetterdienst hat keine lesbare Vorhersage geliefert.');
    }
    const hours = payload.weather
      .map(brightSkyRecord)
      .filter((record): record is BrightSkyRecord => record !== undefined)
      .map(toWeatherHour)
      .filter((hour): hour is WeatherHour => hour !== undefined);
    if (hours.length === 0) {
      throw new Error('Für diesen Standort ist derzeit keine Vorhersage verfügbar.');
    }
    return buildWeatherForecast(location, now, hours);
  }

  async searchLocations(query: string): Promise<WeatherLocation[]> {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return [];
    }
    const cacheKey = normalized.toLocaleLowerCase('de');
    const cached = this.locationCache.get(cacheKey);
    if (cached) {
      return cached.map((location) => ({ ...location }));
    }
    const requestAt = this.now();
    if (requestAt - this.lastLocationRequestAt < 1_000) {
      throw new Error('Bitte vor einer weiteren Standortsuche kurz warten.');
    }
    this.lastLocationRequestAt = requestAt;
    const parameters = new URLSearchParams({
      q: normalized,
      format: 'jsonv2',
      limit: '5',
      'accept-language': 'de',
    });
    const response = await this.fetcher(`https://nominatim.openstreetmap.org/search?${parameters}`);
    if (!response.ok) {
      throw new Error(`Standortsuche antwortet mit Status ${response.status}.`);
    }
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error('Die Standortsuche hat keine lesbare Antwort geliefert.');
    }
    const locations = payload.flatMap((candidate): WeatherLocation[] => {
      if (!isRecord(candidate)) {
        return [];
      }
      const value: NominatimResult = {
        display_name: typeof candidate.display_name === 'string' ? candidate.display_name : '',
        lat: typeof candidate.lat === 'string' ? candidate.lat : '',
        lon: typeof candidate.lon === 'string' ? candidate.lon : '',
      };
      const latitude = Number(value.lat);
      const longitude = Number(value.lon);
      if (!value.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return [];
      }
      return [{ label: value.display_name, latitude, longitude }];
    });
    this.locationCache.set(cacheKey, locations);
    return locations.map((location) => ({ ...location }));
  }
}
