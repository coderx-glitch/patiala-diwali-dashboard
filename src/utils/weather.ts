/**
 * Open-Meteo Weather Context integration for Patiala.
 * Free API, no API key required, non-commercial attribution CC-BY 4.0.
 * Coordinates: Patiala (Model Town station approx 30.3398 N, 76.3869 E).
 *
 * Fetched once per session and cached in memory.
 * Honesty rule: For any date not covered in the API response,
 * returns null (triggering "Weather data not available for this date").
 */

export interface DailyWeatherData {
  date: string; // YYYY-MM-DD
  temperatureMean: number; // °C
  relativeHumidity: number; // %
  windSpeed: number; // km/h
  windDirection: number; // degrees 0-360
}

export interface WeatherContextState {
  loaded: boolean;
  failed: boolean;
  dataByDate: Record<string, DailyWeatherData>;
}

// Module-level in-memory session cache
let sessionCache: Record<string, DailyWeatherData> | null = null;
let fetchPromise: Promise<Record<string, DailyWeatherData> | null> | null = null;

// Patiala station coordinates (from public/data/map_meta.json / CAAQMS site_1437)
export const PATIALA_LAT = 30.3398;
export const PATIALA_LON = 76.3869;

export async function fetchWeatherContext(): Promise<Record<string, DailyWeatherData> | null> {
  if (sessionCache !== null) {
    return sessionCache;
  }
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${PATIALA_LAT}&longitude=${PATIALA_LON}&daily=temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max,wind_direction_10m_dominant&timezone=Asia%2FKolkata&wind_speed_unit=kmh&forecast_days=16`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        return null;
      }
      const json = await res.json();
      const daily = json?.daily;
      if (!daily || !Array.isArray(daily.time)) {
        return null;
      }

      const map: Record<string, DailyWeatherData> = {};
      daily.time.forEach((t: string, idx: number) => {
        const temp = daily.temperature_2m_mean?.[idx];
        const rh = daily.relative_humidity_2m_mean?.[idx];
        const ws = daily.wind_speed_10m_max?.[idx];
        const wd = daily.wind_direction_10m_dominant?.[idx];

        if (temp !== undefined && rh !== undefined && ws !== undefined && wd !== undefined) {
          map[t] = {
            date: t,
            temperatureMean: Math.round(temp * 10) / 10,
            relativeHumidity: Math.round(rh),
            windSpeed: Math.round(ws * 10) / 10,
            windDirection: Math.round(wd),
          };
        }
      });

      sessionCache = map;
      return sessionCache;
    } catch {
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getWindCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return directions[idx];
}
