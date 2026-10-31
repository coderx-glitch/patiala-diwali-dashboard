import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { PredictionItem, PredictionsData } from '../types/airQuality';
import { CPCB_NAAQS_STANDARD, WHO_AIR_QUALITY_GUIDELINE, getCpcbCategory } from '../utils/aqiColors';
import { calculateEpaSubIndex } from '../utils/epaAqi';
import { fetchWeatherContext, type DailyWeatherData } from '../utils/weather';
import { exportPatialaCsv } from '../utils/csvExport';
import {
  getAllComparisonDates,
  formatComparisonSummary,
  type DayComparisonEntry,
} from '../utils/dayComparison';
import { useLanguage } from '../utils/i18n';
import { Download, ArrowRightLeft } from 'lucide-react';

interface ForecastChartProps {
  data: PredictionsData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: PredictionItem }>;
  weatherMap?: Record<string, DailyWeatherData> | null;
}

const formatRelativeDays = (d: number, lang: 'en' | 'hi') => {
  if (d === 0) return lang === 'hi' ? 'दिवाली का दिन (8 नवंबर)' : 'Diwali Day (Nov 8)';
  const abs = Math.abs(d);
  if (d > 0) return lang === 'hi' ? `दिवाली से ${d} दिन पहले` : `${d} days before Diwali`;
  return lang === 'hi' ? `दिवाली के ${abs} दिन बाद` : `${abs} days after Diwali`;
};

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, weatherMap }) => {
  const { language } = useLanguage();
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  const cpcbCat = getCpcbCategory(item.pm25_pred);
  const epa = calculateEpaSubIndex(item.pm25_pred);
  const weather = weatherMap?.[item.date];

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg text-xs min-w-[240px] text-stone-800">
      <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 font-mono">
        <span className="font-semibold text-stone-900">{item.date}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            item.days_to_diwali === 0
              ? 'border-amber-600 text-amber-900 bg-amber-50'
              : 'border-stone-200 text-stone-600 bg-stone-50'
          }`}
        >
          {item.days_to_diwali === 0
            ? 'Diwali (D0)'
            : item.days_to_diwali > 0
            ? `D-${item.days_to_diwali}`
            : `D+${Math.abs(item.days_to_diwali)}`}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between font-mono">
        <span className="text-stone-500 font-sans">Station PM2.5:</span>
        <div className="text-right">
          <span className="text-base font-bold text-stone-900">{item.pm25_pred.toFixed(1)}</span>
          <span className="text-stone-500 text-[10px] ml-1">µg/m³</span>
        </div>
      </div>

      {/* Dual Sub-indices */}
      <div className="mt-1.5 pt-1.5 border-t border-stone-100 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-stone-500">CPCB Band:</span>
          <span
            className="font-semibold px-2 py-0.5 rounded-full text-[10px] border font-mono"
            style={{
              color: cpcbCat.color,
              borderColor: `${cpcbCat.color}50`,
              backgroundColor: `${cpcbCat.color}10`,
            }}
          >
            {item.cpcb_pm25_band || cpcbCat.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-stone-500">US EPA Sub-index:</span>
          <span
            className="font-semibold px-2 py-0.5 rounded-full text-[10px] border font-mono"
            style={{
              color: epa.color,
              borderColor: epa.borderColor,
              backgroundColor: epa.bgColor,
            }}
          >
            {epa.aqi} · {epa.category}
          </span>
        </div>
      </div>

      {/* Weather Strip inside Tooltip */}
      {weather && (
        <div className="mt-2 pt-1.5 border-t border-stone-100 bg-stone-50 rounded p-1.5 text-[10px] font-mono text-stone-700 flex items-center justify-between">
          <span>{weather.temperatureMean}°C</span>
          <span>{weather.relativeHumidity}% RH</span>
          <span>
            {weather.windSpeed} km/h{' '}
            <span
              className="inline-block transform font-bold"
              style={{ transform: `rotate(${weather.windDirection}deg)` }}
            >
              ↓
            </span>
          </span>
        </div>
      )}

      <div className="mt-1.5 text-[10px] text-stone-500 leading-tight">
        {formatRelativeDays(item.days_to_diwali, language)}
      </div>
    </div>
  );
};

export const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  const { t, language } = useLanguage();

  // Weather context for chart tooltip
  const [weatherMap, setWeatherMap] = useState<Record<string, DailyWeatherData> | null>(null);
  useEffect(() => {
    fetchWeatherContext().then(setWeatherMap).catch(() => setWeatherMap(null));
  }, []);

  // Feature 7: Two-day comparison picker state
  const allDates = useMemo(() => getAllComparisonDates(), []);
  const [dateA, setDateA] = useState<string>('2026-11-10'); // Nov 10 Peak
  const [dateB, setDateB] = useState<string>('2026-11-08'); // Nov 8 Diwali

  const entryA: DayComparisonEntry =
    allDates.find((d) => d.date === dateA) || allDates[allDates.length - 1];
  const entryB: DayComparisonEntry =
    allDates.find((d) => d.date === dateB) || allDates[allDates.length - 3];

  const comparisonSentence = useMemo(() => {
    if (!entryA || !entryB) return '';
    return formatComparisonSummary(entryA, entryB, language);
  }, [entryA, entryB, language]);

  // Find Diwali date
  const diwaliItem = useMemo(() => {
    return data.predictions.find((p) => p.days_to_diwali === 0) || data.predictions[0];
  }, [data]);

  // Format tick labels
  const formatXAxis = (tickItem: string) => {
    const item = data.predictions.find((p) => p.date === tickItem);
    if (!item) return tickItem;
    if (item.days_to_diwali === 0) return 'D0 (Nov 8)';
    return item.days_to_diwali > 0 ? `D-${item.days_to_diwali}` : `D+${Math.abs(item.days_to_diwali)}`;
  };

  const handleDownloadCsv = () => {
    exportPatialaCsv(data.predictions);
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Forecast Curve Chart */}
      <div className="rounded-xl bg-white border border-stone-200 p-5 shadow-xs">
        {/* Header with Download CSV */}
        <div className="pb-3 border-b border-stone-100 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Diwali 2026 PM2.5 Forecast Curve
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Official CPCB breakpoint bands · generated from Open-Meteo live 16-day forecast · LightGBM refit on complete daily rows 2021-01-01 to 2024-12-31
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
            <span className="text-[11px] text-stone-400 font-mono hidden sm:inline">
              Model Town, Patiala (site_1437)
            </span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 sm:h-80 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.predictions} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
              <defs>
                <linearGradient id="editorialSaffronGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c2410c" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" />

              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#78716c"
                fontSize={10}
                tickLine={false}
                dy={6}
              />

              <YAxis
                stroke="#78716c"
                fontSize={10}
                tickLine={false}
                domain={[0, (dataMax: number) => Math.ceil((dataMax + 25) / 20) * 20]}
                unit=" µg"
                dx={-2}
              />

              <Tooltip content={<CustomTooltip weatherMap={weatherMap} />} />

              {/* Reference Line for Diwali D-Day */}
              {diwaliItem && (
                <ReferenceLine
                  x={diwaliItem.date}
                  stroke="#44403c"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `Diwali · Nov 8`,
                    position: 'top',
                    fill: '#1c1917',
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 8,
                  }}
                />
              )}

              {/* Reference Line for CPCB 24h standard (60 µg/m³) */}
              <ReferenceLine
                y={CPCB_NAAQS_STANDARD}
                stroke="#b45309"
                strokeDasharray="4 4"
                strokeWidth={1.2}
                label={{
                  value: `CPCB 24-hr standard (60)`,
                  position: 'insideBottomRight',
                  fill: '#b45309',
                  fontSize: 9.5,
                  fontWeight: 500,
                  offset: 8,
                }}
              />

              {/* Reference Line for WHO 24h guideline (15 µg/m³) */}
              <ReferenceLine
                y={WHO_AIR_QUALITY_GUIDELINE}
                stroke="#15803d"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: `WHO guideline (15)`,
                  position: 'insideBottomLeft',
                  fill: '#15803d',
                  fontSize: 9,
                  offset: 6,
                }}
              />

              <Area
                type="monotone"
                dataKey="pm25_pred"
                stroke="#c2410c"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#editorialSaffronGradient)"
                activeDot={{ r: 5, fill: '#c2410c', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Standards Guide */}
        <div className="mt-2 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between text-[11px] text-stone-500 gap-2 font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-orange-700"></span>
              <span>Forecast PM2.5</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-600 border-dashed"></span>
              <span>CPCB 24-hr standard (60 µg/m³)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-700"></span>
              <span>WHO 24-hr guideline (15 µg/m³)</span>
            </span>
          </div>
          <div className="text-stone-400 text-[10px]">
            LightGBM refit on complete daily rows (2021-01-01 to 2024-12-31)
          </div>
        </div>
      </div>

      {/* 2. Feature 7: Compare Any Two Days Widget */}
      <div className="rounded-xl bg-white border border-stone-200 p-5 shadow-xs">
        <div className="pb-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-700" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900">
              {t.compare_title}
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            {t.compare_desc}
          </p>
        </div>

        {/* Selectors Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Day A Selector & Card */}
          <div className="p-4 rounded-lg bg-stone-50/70 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="compare-date-a" className="text-xs font-semibold text-stone-700 font-mono">
                {t.compare_day_1}
              </label>
              <select
                id="compare-date-a"
                value={dateA}
                onChange={(e) => setDateA(e.target.value)}
                className="text-xs rounded-md border border-stone-300 bg-white px-2 py-1 text-stone-800 cursor-pointer max-w-[220px]"
              >
                {allDates.map((d) => (
                  <option key={`a-${d.date}`} value={d.date}>
                    {d.date} ({d.pm25.toFixed(1)} µg/m³)
                  </option>
                ))}
              </select>
            </div>

            {entryA && (
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-serif font-bold text-stone-900">
                    {entryA.pm25.toFixed(1)} <span className="text-xs font-normal text-stone-500">µg/m³</span>
                  </div>
                  <div className="text-[10.5px] font-mono text-stone-500 mt-0.5">
                    {language === 'hi' ? entryA.sourceLabelHi : entryA.sourceLabelEn}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono"
                    style={{
                      color: entryA.epa.color,
                      borderColor: entryA.epa.borderColor,
                      backgroundColor: entryA.epa.bgColor,
                    }}
                  >
                    EPA: {entryA.epa.aqi} ({entryA.epa.category})
                  </span>
                  <span className="text-[10px] font-mono text-stone-600">
                    CPCB: {entryA.cpcbBand}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Day B Selector & Card */}
          <div className="p-4 rounded-lg bg-stone-50/70 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="compare-date-b" className="text-xs font-semibold text-stone-700 font-mono">
                {t.compare_day_2}
              </label>
              <select
                id="compare-date-b"
                value={dateB}
                onChange={(e) => setDateB(e.target.value)}
                className="text-xs rounded-md border border-stone-300 bg-white px-2 py-1 text-stone-800 cursor-pointer max-w-[220px]"
              >
                {allDates.map((d) => (
                  <option key={`b-${d.date}`} value={d.date}>
                    {d.date} ({d.pm25.toFixed(1)} µg/m³)
                  </option>
                ))}
              </select>
            </div>

            {entryB && (
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-serif font-bold text-stone-900">
                    {entryB.pm25.toFixed(1)} <span className="text-xs font-normal text-stone-500">µg/m³</span>
                  </div>
                  <div className="text-[10.5px] font-mono text-stone-500 mt-0.5">
                    {language === 'hi' ? entryB.sourceLabelHi : entryB.sourceLabelEn}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono"
                    style={{
                      color: entryB.epa.color,
                      borderColor: entryB.epa.borderColor,
                      backgroundColor: entryB.epa.bgColor,
                    }}
                  >
                    EPA: {entryB.epa.aqi} ({entryB.epa.category})
                  </span>
                  <span className="text-[10px] font-mono text-stone-600">
                    CPCB: {entryB.cpcbBand}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Honest Comparison Sentence Callout */}
        <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200/70 rounded-lg text-xs font-medium text-stone-800 font-mono flex items-center justify-between">
          <span>{comparisonSentence}</span>
          <span className="text-[10px] text-stone-400">85 dates verified in data files</span>
        </div>
      </div>
    </div>
  );
};
