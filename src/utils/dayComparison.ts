import predictionsData from '../../public/data/predictions.json';
import backtestData from '../../public/data/backtest.json';
import diwaliSpecialData from '../../public/data/diwali_special.json';
import { calculateEpaSubIndex, type EpaSubIndexResult } from './epaAqi';

export interface DayComparisonEntry {
  date: string; // YYYY-MM-DD
  pm25: number;
  sourceType: 'station_measured' | 'satellite_derived' | 'model_forecast';
  sourceLabelEn: string;
  sourceLabelHi: string;
  cpcbBand: string;
  epa: EpaSubIndexResult;
  year: number;
}

function getCpcbBand(pm25: number): string {
  if (pm25 <= 30) return 'Good';
  if (pm25 <= 60) return 'Satisfactory';
  if (pm25 <= 90) return 'Moderate';
  if (pm25 <= 120) return 'Poor';
  if (pm25 <= 250) return 'Very Poor';
  return 'Severe';
}

function buildDateMap(): Map<string, DayComparisonEntry> {
  const map = new Map<string, DayComparisonEntry>();

  // 1. From diwali_special.json (2021-2026 Diwali windows)
  const ds = diwaliSpecialData as any;
  const diwaliDates = ds?.diwali_dates_used || {};

  if (ds?.comparison?.years) {
    for (const y of ds.comparison.years) {
      const yearStr = String(y.year);
      const diwaliStr = diwaliDates[yearStr];
      if (!diwaliStr || !Array.isArray(y.points)) continue;

      const baseDt = new Date(diwaliStr + 'T00:00:00+05:30');
      let sourceType: DayComparisonEntry['sourceType'] = 'station_measured';
      let sourceLabelEn = 'Station-measured (CPCB Model Town site_1437)';
      let sourceLabelHi = 'स्टेशन-मापा गया (CPCB मॉडल टाउन site_1437)';

      if (y.kind === 'regional_estimate' || y.kind === 'satellite_estimate') {
        sourceType = 'satellite_derived';
        sourceLabelEn = 'Satellite-derived estimate (CREA 10km grid)';
        sourceLabelHi = 'उपग्रह-आधारित अनुमान (CREA 10km ग्रिड)';
      } else if (y.kind === 'forecast') {
        sourceType = 'model_forecast';
        sourceLabelEn = 'Model forecast (LightGBM)';
        sourceLabelHi = 'मॉडल पूर्वानुमान (LightGBM)';
      }

      for (const pt of y.points) {
        const d = new Date(baseDt);
        d.setDate(d.getDate() + pt.rel_day);
        const dateStr = d.toISOString().slice(0, 10);
        const pm25 = pt.pm25;

        map.set(dateStr, {
          date: dateStr,
          pm25,
          sourceType,
          sourceLabelEn,
          sourceLabelHi,
          cpcbBand: getCpcbBand(pm25),
          epa: calculateEpaSubIndex(pm25),
          year: y.year,
        });
      }
    }
  }

  // 2. From backtest.json (2024 held-out evaluation window)
  const bt = backtestData as any;
  if (Array.isArray(bt?.series)) {
    for (const row of bt.series) {
      const dt = row.date;
      if (!map.has(dt) && typeof row.actual === 'number') {
        map.set(dt, {
          date: dt,
          pm25: row.actual,
          sourceType: 'station_measured',
          sourceLabelEn: 'Station-measured (CPCB Model Town site_1437)',
          sourceLabelHi: 'स्टेशन-मापा गया (CPCB मॉडल टाउन site_1437)',
          cpcbBand: getCpcbBand(row.actual),
          epa: calculateEpaSubIndex(row.actual),
          year: parseInt(dt.slice(0, 4), 10),
        });
      }
    }
  }

  // 3. From predictions.json (2026 forecast window Nov 1-13)
  const preds = (predictionsData as any)?.predictions || [];
  for (const row of preds) {
    const dt = row.date;
    map.set(dt, {
      date: dt,
      pm25: row.pm25_pred,
      sourceType: 'model_forecast',
      sourceLabelEn: 'Model forecast (LightGBM)',
      sourceLabelHi: 'मॉडल पूर्वानुमान (LightGBM)',
      cpcbBand: row.cpcb_pm25_band || getCpcbBand(row.pm25_pred),
      epa: calculateEpaSubIndex(row.pm25_pred),
      year: 2026,
    });
  }

  return map;
}

let cachedEntries: DayComparisonEntry[] | null = null;

export function getAllComparisonDates(): DayComparisonEntry[] {
  if (cachedEntries === null) {
    const map = buildDateMap();
    cachedEntries = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  return cachedEntries;
}

export function formatComparisonSummary(
  entryA: DayComparisonEntry,
  entryB: DayComparisonEntry,
  lang: 'en' | 'hi' = 'en'
): string {
  const diff = Math.round(Math.abs(entryA.pm25 - entryB.pm25) * 10) / 10;
  const isA = entryA.sourceType === 'model_forecast' ? (lang === 'hi' ? 'पूर्वानुमान' : 'forecast') : (lang === 'hi' ? 'दर्ज' : 'measured');
  const dALabel = formatDateLabel(entryA.date, lang);
  const dBLabel = formatDateLabel(entryB.date, lang);

  if (Math.abs(entryA.pm25 - entryB.pm25) < 0.05) {
    return lang === 'hi'
      ? `${dALabel} और ${dBLabel} का PM2.5 समान स्तर (${entryA.pm25} µg/m³) पर है।`
      : `${dALabel} and ${dBLabel} have identical PM2.5 at ${entryA.pm25} µg/m³.`;
  }

  if (entryA.pm25 > entryB.pm25) {
    return lang === 'hi'
      ? `${dALabel} (${isA}) ${dBLabel} से ${diff} µg/m³ अधिक है।`
      : `${dALabel} is ${isA} ${diff} µg/m³ higher than ${dBLabel}.`;
  } else {
    return lang === 'hi'
      ? `${dALabel} (${isA}) ${dBLabel} से ${diff} µg/m³ कम है।`
      : `${dALabel} is ${isA} ${diff} µg/m³ lower than ${dBLabel}.`;
  }
}

function formatDateLabel(dateStr: string, lang: 'en' | 'hi'): string {
  const d = new Date(dateStr + 'T00:00:00+05:30');
  const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', opt);
}
