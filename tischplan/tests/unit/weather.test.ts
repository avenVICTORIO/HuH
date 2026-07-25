import { describe, expect, it } from 'vitest';
import { buildWeatherForecast, weatherConditionLabel, weatherSymbol, type WeatherHour } from '../../src/application/weatherForecast';
import { WeatherGateway } from '../../src/infrastructure/weatherGateway';

describe('weather forecast', () => {
  it('aggregates hourly data into seven detailed days', () => {
    const start = Date.parse('2026-09-01T00:00:00+02:00');
    const hours: WeatherHour[] = Array.from({ length: 8 * 24 }, (_, index) => ({
      timestamp: start + index * 60 * 60_000,
      temperature: 10 + (index % 24) / 2,
      precipitation: index % 5 === 0 ? 0.5 : 0,
      precipitationProbability: index % 5 === 0 ? 70 : 10,
      windSpeed: 12,
      windGustSpeed: 25,
      icon: 'partly-cloudy-day',
      condition: 'dry',
    }));
    const forecast = buildWeatherForecast({ label: 'Berlin', latitude: 52.52, longitude: 13.405 }, start, hours);
    expect(forecast.days).toHaveLength(7);
    expect(forecast.days[0].precipitationProbability).toBe(70);
    expect(forecast.days[0].maximumWindGustSpeed).toBe(25);
    expect(weatherSymbol('rain')).toBe('🌧️');
    expect(weatherConditionLabel('dry', 'clear-day')).toBe('Trocken');
  });

  it('parses Bright Sky and Nominatim responses at the infrastructure boundary', async () => {
    let locationRequestCount = 0;
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('nominatim')) {
        locationRequestCount += 1;
        return new Response(JSON.stringify([{ display_name: 'Berlin, Deutschland', lat: '52.52', lon: '13.405' }]), { status: 200 });
      }
      return new Response(JSON.stringify({ weather: [{
        timestamp: '2026-09-01T16:00:00+02:00',
        temperature: 21.5,
        precipitation: 0.2,
        precipitation_probability: 35,
        wind_speed: 14,
        wind_gust_speed: 28,
        icon: 'partly-cloudy-day',
        condition: 'dry',
      }] }), { status: 200 });
    };
    const gateway = new WeatherGateway(fetcher);
    const locations = await gateway.searchLocations('Berlin');
    expect(locations[0]).toEqual({ label: 'Berlin, Deutschland', latitude: 52.52, longitude: 13.405 });
    expect(await gateway.searchLocations(' berlin ')).toEqual(locations);
    expect(locationRequestCount).toBe(1);
    const forecast = await gateway.forecast(locations[0], Date.parse('2026-09-01T14:00:00+02:00'));
    expect(forecast.hours[0].temperature).toBe(21.5);
    expect(forecast.hours[0].precipitationProbability).toBe(35);
    expect(weatherSymbol('partly-cloudy-day')).toBe('⛅️');
  });
});
