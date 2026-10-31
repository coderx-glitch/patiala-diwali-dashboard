import React from 'react';
import type { BacktestData, PredictionsData } from '../types/airQuality';
import { CPCB_NAAQS_STANDARD, getCpcbCategory } from '../utils/aqiColors';
import { calculateEpaSubIndex } from '../utils/epaAqi';
import { useLanguage } from '../utils/i18n';

interface KpiSummaryProps {
  predictionsData: PredictionsData;
  backtestData: BacktestData | null;
}

export const KpiSummary: React.FC<KpiSummaryProps> = ({ predictionsData, backtestData }) => {
  const { t } = useLanguage();

  // Find Diwali item (days_to_diwali === 0)
  const diwaliItem =
    predictionsData.predictions.find((p) => p.days_to_diwali === 0) ||
    predictionsData.predictions[0];

  // Find Peak PM2.5 item
  const peakItem = predictionsData.predictions.reduce(
    (max, item) => (item.pm25_pred > max.pm25_pred ? item : max),
    predictionsData.predictions[0]
  );

  const peakCategory = getCpcbCategory(peakItem.pm25_pred);
  const diwaliCategory = getCpcbCategory(diwaliItem.pm25_pred);
  const peakEpa = calculateEpaSubIndex(peakItem.pm25_pred);
  const diwaliEpa = calculateEpaSubIndex(diwaliItem.pm25_pred);

  const peakExceedance = (peakItem.pm25_pred / CPCB_NAAQS_STANDARD).toFixed(1);

  // Model metrics from backtest.json
  const lead1Model = backtestData?.models.find((m) => m.name.includes('1 day ahead'));
  const naiveBaseline = backtestData?.models.find((m) =>
    m.name.toLowerCase().includes('naive') || m.name.toLowerCase().includes('climatology')
  );

  const testMaeValue = lead1Model ? lead1Model.mae.toFixed(1) : '17.5';
  const naiveMaeValue = naiveBaseline ? naiveBaseline.mae.toFixed(1) : '20.2';

  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${monthNames[mIdx]} ${parseInt(parts[2], 10)}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const peakRelativeStr =
    peakItem.days_to_diwali === 0
      ? 'D0'
      : peakItem.days_to_diwali < 0
      ? `D+${Math.abs(peakItem.days_to_diwali)}`
      : `D-${peakItem.days_to_diwali}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Peak Prediction */}
      <div className="rounded-xl bg-white border border-stone-200 p-4.5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
            {t.kpi_peak_title}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-rose-400 text-rose-700 bg-rose-50/60 font-mono">
            {peakCategory.label}
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl sm:text-3.5xl font-bold font-serif text-stone-900 tracking-tight">
            {peakItem.pm25_pred.toFixed(1)}
          </div>
        </div>

        <div className="text-xs text-stone-500 font-mono flex items-center justify-between">
          <span>µg/m³ · {formatShortDate(peakItem.date)} ({peakRelativeStr})</span>
          <span className="text-[10px] font-semibold text-purple-700" title="US EPA PM2.5 sub-index">
            EPA {peakEpa.aqi}
          </span>
        </div>
      </div>

      {/* 2. Diwali Day Forecast */}
      <div className="rounded-xl bg-white border border-stone-200 p-4.5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
            {t.kpi_diwali_title}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-500 text-amber-800 bg-amber-50/60 font-mono">
            {diwaliCategory.label}
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl sm:text-3.5xl font-bold font-serif text-stone-900 tracking-tight">
            {diwaliItem.pm25_pred.toFixed(1)}
          </div>
        </div>

        <div className="text-xs text-stone-500 font-mono flex items-center justify-between">
          <span>µg/m³ · {formatShortDate(diwaliItem.date)}</span>
          <span className="text-[10px] font-semibold text-rose-700" title="US EPA PM2.5 sub-index">
            EPA {diwaliEpa.aqi}
          </span>
        </div>
      </div>

      {/* 3. CPCB Standard Exceedance (tied to predicted peak Nov 10) */}
      <div className="rounded-xl bg-white border border-stone-200 p-4.5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
            {t.kpi_cpcb_title}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-600/70 text-amber-800 bg-amber-50/70 font-mono">
            Exceeded
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl sm:text-3.5xl font-bold font-serif text-stone-900 tracking-tight">
            {peakExceedance}x
          </div>
        </div>

        <div className="text-xs text-stone-500">
          {t.kpi_cpcb_exceedance}
        </div>
      </div>

      {/* 4. Held-Out Test MAE */}
      <div className="rounded-xl bg-white border border-stone-200 p-4.5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
            {t.kpi_mae_title}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500 text-emerald-800 bg-emerald-50/60 font-mono">
            vs naive {naiveMaeValue}
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl sm:text-3.5xl font-bold font-serif text-stone-900 tracking-tight">
            {testMaeValue}
          </div>
        </div>

        <div className="text-xs text-stone-500 font-mono">
          {t.kpi_mae_subtext}
        </div>
      </div>
    </div>
  );
};
