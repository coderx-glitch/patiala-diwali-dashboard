import { calculateEpaSubIndex } from './epaAqi';

export interface CsvExportRow {
  date: string;
  pm25_pred: string | number;
  cpcb_pm25_band: string;
  epa_pm25_subindex: number | string;
  actual_pm25: string | number;
}

/**
 * Generates and triggers client-side download of Patiala PM2.5 CSV data.
 * Columns: date, pm25_pred, cpcb_pm25_band, epa_pm25_subindex, actual_pm25
 * File name: patiala-pm25-YYYYMMDD.csv
 */
export function exportPatialaCsv(
  predictions: Array<{ date: string; pm25_pred: number; cpcb_pm25_band?: string }>,
  historicalSeries?: Array<{ date: string; actual?: number | null; predicted?: number | null }>
) {
  const rows: CsvExportRow[] = [];

  // 1. Forecast predictions (Nov 1-13, 2026)
  if (predictions && predictions.length > 0) {
    for (const p of predictions) {
      const epa = calculateEpaSubIndex(p.pm25_pred);
      rows.push({
        date: p.date,
        pm25_pred: p.pm25_pred,
        cpcb_pm25_band: p.cpcb_pm25_band || getCpcbBand(p.pm25_pred),
        epa_pm25_subindex: epa.aqi,
        actual_pm25: '',
      });
    }
  }

  // 2. Historical backtest series if provided
  if (historicalSeries && historicalSeries.length > 0) {
    for (const h of historicalSeries) {
      if (h.actual !== undefined && h.actual !== null) {
        const epa = calculateEpaSubIndex(h.actual);
        rows.push({
          date: h.date,
          pm25_pred: h.predicted !== undefined && h.predicted !== null ? h.predicted : '',
          cpcb_pm25_band: getCpcbBand(h.actual),
          epa_pm25_subindex: epa.aqi,
          actual_pm25: h.actual,
        });
      }
    }
  }

  // Sort rows chronologically by date
  rows.sort((a, b) => a.date.localeCompare(b.date));

  const headers = ['date', 'pm25_pred', 'cpcb_pm25_band', 'epa_pm25_subindex', 'actual_pm25'];
  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.date,
        r.pm25_pred,
        `"${r.cpcb_pm25_band}"`,
        r.epa_pm25_subindex,
        r.actual_pm25,
      ].join(',')
    ),
  ];

  const csvContent = csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const fileName = `patiala-pm25-${year}${month}${day}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getCpcbBand(pm25: number): string {
  if (pm25 <= 30) return 'Good';
  if (pm25 <= 60) return 'Satisfactory';
  if (pm25 <= 90) return 'Moderate';
  if (pm25 <= 120) return 'Poor';
  if (pm25 <= 250) return 'Very Poor';
  return 'Severe';
}
