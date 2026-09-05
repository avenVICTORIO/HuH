import type { WeatherLocation } from '../domain/model';

export interface WeatherHour {
  timestamp: number;
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  windGustSpeed: number;
  icon: string;
  condition: string;
}

export interface WeatherDay {
  serviceDate: string;
  minimumTemperature: number;
  maximumTemperature: number;
  precipitation: number;
  precipitationProbability: number;
  maximumWindSpeed: number;
  maximumWindGustSpeed: number;
  icon: string;
  condition: string;
  hours: WeatherHour[];
}

export interface WeatherForecast {
  location: WeatherLocation;
  fetchedAt: number;
  hours: WeatherHour[];
  days: WeatherDay[];
}

export type WeatherForecastState =
  | { status: 'idle' }
  | { status: 'loading'; forecast?: WeatherForecast }
  | { status: 'ready'; forecast: WeatherForecast }
  | { status: 'error'; message: string; forecast?: WeatherForecast };

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function maximum(values: number[]): number {
  return values.length > 0 ? Math.max(...values) : 0;
}

export function weatherSymbol(icon: string): string {
  // U+FE0F forces the colored emoji presentation; without it some glyphs
  // (☁, ☀, ⛈, ❄) fall back to monochrome text style and look inconsistent.
  if (icon.includes('thunderstorm')) return '⛈️';
  if (icon.includes('snow') || icon.includes('sleet')) return '❄️';
  if (icon.includes('rain') || icon.includes('showers')) return '🌧️';
  if (icon.includes('fog')) return '🌫️';
  if (icon.includes('partly-cloudy')) return '⛅️';
  if (icon.includes('cloudy')) return '☁️';
  if (icon.includes('clear')) return '☀️';
  return '◌';
}

export function weatherConditionLabel(condition: string, icon: string): string {
  const value = `${condition} ${icon}`.toLowerCase();
  if (value.includes('thunder')) return 'Gewitter';
  if (value.includes('snow')) return 'Schnee';
  if (value.includes('sleet')) return 'Schneeregen';
  if (value.includes('rain') || value.includes('showers')) return 'Regen';
  if (value.includes('fog')) return 'Nebel';
  if (value.includes('partly')) return 'Leicht bewölkt';
  if (value.includes('cloud')) return 'Bewölkt';
  if (value.includes('dry') || value.includes('clear')) return 'Trocken';
  return 'Wetterlage';
}

export function buildWeatherForecast(
  location: WeatherLocation,
  fetchedAt: number,
  hours: WeatherHour[],
): WeatherForecast {
  const sortedHours = [...hours].sort((left, right) => left.timestamp - right.timestamp);
  const groups = new Map<string, WeatherHour[]>();
  for (const hour of sortedHours) {
    const serviceDate = new Date(hour.timestamp).toLocaleDateString('sv-SE');
    groups.set(serviceDate, [...(groups.get(serviceDate) ?? []), hour]);
  }
  const days = [...groups.entries()].slice(0, 7).map(([serviceDate, dayHours]) => {
    const representative = dayHours.find((hour) => new Date(hour.timestamp).getHours() === 14)
      ?? dayHours[Math.floor(dayHours.length / 2)];
    return {
      serviceDate,
      minimumTemperature: rounded(Math.min(...dayHours.map((hour) => hour.temperature))),
      maximumTemperature: rounded(maximum(dayHours.map((hour) => hour.temperature))),
      precipitation: rounded(dayHours.reduce((sum, hour) => sum + hour.precipitation, 0)),
      precipitationProbability: Math.round(maximum(dayHours.map((hour) => hour.precipitationProbability))),
      maximumWindSpeed: rounded(maximum(dayHours.map((hour) => hour.windSpeed))),
      maximumWindGustSpeed: rounded(maximum(dayHours.map((hour) => hour.windGustSpeed))),
      icon: representative.icon,
      condition: weatherConditionLabel(representative.condition, representative.icon),
      hours: dayHours,
    } satisfies WeatherDay;
  });
  return { location: { ...location }, fetchedAt, hours: sortedHours, days };
}
