import React from 'react';
import type { PredictionItem } from '../types/airQuality';
import { calculateEpaSubIndex, EPA_NOTE } from '../utils/epaAqi';
import { useLanguage } from '../utils/i18n';

interface PrintReportProps {
  predictions: PredictionItem[];
  stationName?: string;
  generatedAt?: string;
}

export const PrintReport: React.FC<PrintReportProps> = ({
  predictions,
  stationName = 'Model Town, Patiala - PPCB CAAQMS station site_1437',
  generatedAt = '2026-11-01',
}) => {
  const { t } = useLanguage();

  const diwaliRow = predictions.find((p) => p.date === '2026-11-08') || predictions[7];
  const peakRow = predictions.reduce((max, p) => (p.pm25_pred > max.pm25_pred ? p : max), predictions[0] || { pm25_pred: 0, date: '' });

  const diwaliEpa = diwaliRow ? calculateEpaSubIndex(diwaliRow.pm25_pred) : null;
  const peakEpa = peakRow ? calculateEpaSubIndex(peakRow.pm25_pred) : null;

  return (
    <div className="hidden print:block font-serif text-stone-900 bg-white p-6 max-w-[210mm] mx-auto text-[11px] leading-tight">
      {/* Header */}
      <div className="border-b-2 border-stone-800 pb-2 mb-3">
        <div className="flex justify-between items-baseline">
          <h1 className="text-xl font-bold font-serif tracking-tight text-stone-900">
            {t.print_report_title}
          </h1>
          <span className="text-[10px] font-mono text-stone-600">
            {t.generated_at || 'Generated'}: {generatedAt}
          </span>
        </div>
        <p className="text-[10px] text-stone-700 font-sans mt-0.5">
          {stationName} · CPCB 24-hr standard: 60 µg/m³ · WHO guideline: 15 µg/m³
        </p>
      </div>

      {/* Key Highlights / Diwali Callout */}
      <div className="grid grid-cols-2 gap-3 mb-3 p-2.5 bg-stone-50 border border-stone-300 rounded font-sans">
        <div>
          <span className="text-[9px] uppercase tracking-wider font-mono text-stone-500 block">
            Diwali Day (Nov 8, 2026)
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base font-bold font-serif text-stone-900">
              {diwaliRow?.pm25_pred ?? 'N/A'} µg/m³
            </span>
            <span className="text-[10px] font-semibold text-amber-800">
              {diwaliRow?.cpcb_pm25_band} (CPCB)
            </span>
            {diwaliEpa && (
              <span className="text-[10px] font-mono text-stone-700">
                · EPA: {diwaliEpa.aqi} ({diwaliEpa.category})
              </span>
            )}
          </div>
          <p className="text-[9px] text-stone-600 mt-0.5">
            {diwaliRow ? (diwaliRow.pm25_pred / 60).toFixed(1) : '2.0'}x CPCB 24-hr limit (60 µg/m³)
          </p>
        </div>

        <div>
          <span className="text-[9px] uppercase tracking-wider font-mono text-stone-500 block">
            Peak Forecast Day ({peakRow?.date || 'Nov 10, 2026'})
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base font-bold font-serif text-rose-700">
              {peakRow?.pm25_pred ?? 'N/A'} µg/m³
            </span>
            <span className="text-[10px] font-semibold text-rose-800">
              {peakRow?.cpcb_pm25_band} (CPCB)
            </span>
            {peakEpa && (
              <span className="text-[10px] font-mono text-stone-700">
                · EPA: {peakEpa.aqi} ({peakEpa.category})
              </span>
            )}
          </div>
          <p className="text-[9px] text-stone-600 mt-0.5">
            {peakRow ? (peakRow.pm25_pred / 60).toFixed(1) : '2.4'}x CPCB 24-hr limit at predicted peak (D+2)
          </p>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="mb-3">
        <h2 className="text-xs font-bold font-serif uppercase tracking-wider text-stone-800 mb-1">
          13-Day Station PM2.5 Forecast (Nov 1–13, 2026)
        </h2>
        <table className="w-full text-left border-collapse text-[10px] font-sans">
          <thead>
            <tr className="border-b border-stone-400 bg-stone-100 text-stone-700 font-semibold">
              <th className="py-1 px-1.5">Date</th>
              <th className="py-1 px-1.5">Timeline</th>
              <th className="py-1 px-1.5 text-right">Predicted PM2.5 (µg/m³)</th>
              <th className="py-1 px-1.5">CPCB Sub-Index Band</th>
              <th className="py-1 px-1.5 text-right">US EPA Sub-Index</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => {
              const epa = calculateEpaSubIndex(p.pm25_pred);
              const isDiwali = p.date === '2026-11-08';
              const isPeak = p.date === peakRow?.date;
              return (
                <tr
                  key={p.date}
                  className={`border-b border-stone-200 ${
                    isDiwali ? 'bg-amber-50/80 font-semibold' : isPeak ? 'bg-rose-50/80 font-semibold' : ''
                  }`}
                >
                  <td className="py-0.5 px-1.5 font-mono">{p.date}</td>
                  <td className="py-0.5 px-1.5">
                    {isDiwali
                      ? 'Diwali (Nov 8)'
                      : p.days_to_diwali > 0
                      ? `${p.days_to_diwali}d before`
                      : `${Math.abs(p.days_to_diwali)}d after`}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-mono font-medium">{p.pm25_pred.toFixed(1)}</td>
                  <td className="py-0.5 px-1.5">{p.cpcb_pm25_band}</td>
                  <td className="py-0.5 px-1.5 text-right font-mono">
                    {epa.aqi} ({epa.category})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[8px] text-stone-500 font-sans italic mt-1">
          * Note: {EPA_NOTE}
        </p>
      </div>

      {/* Model & Evaluation Summary */}
      <div className="mb-3 p-2 bg-stone-50 border border-stone-200 rounded text-[9.5px] font-sans">
        <h3 className="font-bold text-stone-800 text-[10px] uppercase tracking-wider mb-0.5">
          {t.print_model_summary_title}
        </h3>
        <p className="text-stone-700 leading-normal">
          {t.print_model_summary_body}
        </p>
      </div>

      {/* Data Sources */}
      <div className="border-t border-stone-300 pt-1 text-[8.5px] text-stone-600 font-sans">
        <p className="font-semibold text-stone-700">{t.print_sources_title}:</p>
        <p>1. CPCB CAAQMS via XKDR Forum India Air Quality Database (CC-BY 4.0) — site_1437 Model Town, Patiala</p>
        <p>2. Open-Meteo Weather Forecast API (CC-BY 4.0) — Numerical Weather Prediction</p>
        <p>3. CREA India (Centre for Research on Energy and Clean Air) — Regional Satellite Context</p>
        <p className="mt-1 text-[8px] text-stone-500">
          Report intended for public awareness and scientific demonstration. Station-level measurements are not neighborhood-exact.
        </p>
      </div>
    </div>
  );
};
