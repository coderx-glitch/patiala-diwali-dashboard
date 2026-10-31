import React, { useState, useMemo } from 'react';
import type { PredictionsData } from '../types/airQuality';
import { CPCB_NAAQS_STANDARD, getCpcbCategory } from '../utils/aqiColors';
import { calculateEpaSubIndex, EPA_NOTE, EPA_LABEL, CPCB_LABEL } from '../utils/epaAqi';
import { exportPatialaCsv } from '../utils/csvExport';
import { useLanguage } from '../utils/i18n';
import { ArrowUpDown, Info, Download } from 'lucide-react';

interface PredictionTableProps {
  data: PredictionsData;
  compact?: boolean;
}

export const PredictionTable: React.FC<PredictionTableProps> = ({ data, compact = false }) => {
  const { t, language } = useLanguage();
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const sortedPredictions = useMemo(() => {
    return [...data.predictions].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortAsc ? diff : -diff;
    });
  }, [data.predictions, sortAsc]);

  const formatTimeline = (d: number) => {
    if (d === 0) return language === 'hi' ? 'दिवाली (8 नवंबर)' : 'Diwali (Nov 8)';
    const abs = Math.abs(d);
    if (d > 0) {
      return language === 'hi'
        ? `${d} दिन पहले`
        : `${d} ${d === 1 ? 'day' : 'days'} before`;
    }
    return language === 'hi'
      ? `${abs} दिन बाद`
      : `${abs} ${abs === 1 ? 'day' : 'days'} after`;
  };

  const handleDownloadCsv = () => {
    exportPatialaCsv(data.predictions);
  };

  return (
    <div className="rounded-xl bg-white border border-stone-200 p-5 shadow-xs h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-3 border-b border-stone-100 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              {t.table_title}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {data.predictions.length} days · D-{data.predictions[0].days_to_diwali} to D+{Math.abs(data.predictions[data.predictions.length - 1].days_to_diwali)} · Model Town, Patiala
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 transition cursor-pointer"
              title="Download CSV"
            >
              <Download className="w-3 h-3 text-amber-700" />
              <span>{t.btn_download_csv}</span>
            </button>

            {!compact && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[11px] font-medium text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                title="Toggle health advisory details"
              >
                <Info className="w-3 h-3 text-amber-700" />
                <span>{showDetails ? 'Hide Advisory' : 'Show Advisory'}</span>
              </button>
            )}

            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 cursor-pointer"
              title="Sort table"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{sortAsc ? 'Asc' : 'Desc'}</span>
            </button>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs text-stone-700 border-collapse">
            <thead>
              <tr className="border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">
                <th className="py-2.5 px-2">{t.table_col_date}</th>
                <th className="py-2.5 px-2">{t.table_col_timeline}</th>
                <th className="py-2.5 px-2 text-right">{t.table_col_pm25}</th>
                <th className="py-2.5 px-2 text-center">{t.table_col_cpcb}</th>
                <th className="py-2.5 px-2 text-center">{t.table_col_epa}</th>
                {showDetails && <th className="py-2.5 px-2">HEALTH ADVISORY</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono">
              {sortedPredictions.map((item) => {
                const isDiwali = item.days_to_diwali === 0;
                const cat = getCpcbCategory(item.pm25_pred);
                const epa = calculateEpaSubIndex(item.pm25_pred);

                return (
                  <tr
                    key={item.date}
                    className={`transition ${
                      isDiwali
                        ? 'bg-amber-50/70 font-semibold text-stone-900'
                        : 'hover:bg-stone-50/70'
                    }`}
                  >
                    <td className="py-2 px-2 whitespace-nowrap text-stone-800">
                      {item.date}
                    </td>

                    <td className="py-2 px-2 whitespace-nowrap text-stone-600 font-sans">
                      {isDiwali ? (
                        <span className="font-semibold text-amber-900">
                          {formatTimeline(0)}
                        </span>
                      ) : (
                        <span>{formatTimeline(item.days_to_diwali)}</span>
                      )}
                    </td>

                    <td className="py-2 px-2 text-right whitespace-nowrap font-bold text-stone-900">
                      {item.pm25_pred.toFixed(1)}
                    </td>

                    <td className="py-2 px-2 whitespace-nowrap text-center font-sans">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border font-mono"
                        style={{
                          color: cat.color,
                          borderColor: `${cat.color}60`,
                          backgroundColor: `${cat.color}10`,
                        }}
                        title={CPCB_LABEL}
                      >
                        {item.cpcb_pm25_band || cat.label}
                      </span>
                    </td>

                    <td className="py-2 px-2 whitespace-nowrap text-center font-sans">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border font-mono"
                        style={{
                          color: epa.color,
                          borderColor: epa.borderColor,
                          backgroundColor: epa.bgColor,
                        }}
                        title={EPA_LABEL}
                      >
                        {epa.aqi} · {epa.category}
                      </span>
                    </td>

                    {showDetails && (
                      <td className="py-2 px-2 font-sans text-[11px] text-stone-500 max-w-xs truncate" title={cat.healthAdvisory}>
                        {cat.healthAdvisory}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between text-[10px] text-stone-400 font-mono gap-2">
        <span>* {EPA_NOTE}</span>
        <span>CPCB 24-hr limit: {CPCB_NAAQS_STANDARD} µg/m³</span>
      </div>
    </div>
  );
};
