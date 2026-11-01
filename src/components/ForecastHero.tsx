import React, { useState, useEffect } from 'react';
import type { BacktestData, PredictionsData, PredictionItem } from '../types/airQuality';
import { CPCB_NAAQS_STANDARD, WHO_AIR_QUALITY_GUIDELINE, getCpcbCategory } from '../utils/aqiColors';
import { calculateEpaSubIndex, EPA_NOTE, EPA_LABEL, CPCB_LABEL } from '../utils/epaAqi';
import { fetchWeatherContext, type DailyWeatherData, getWindCompass } from '../utils/weather';
import { exportPatialaCsv } from '../utils/csvExport';
import { useLanguage } from '../utils/i18n';
import { KpiSummary } from './KpiSummary';
import {
  Calendar,
  ShieldAlert,
  Sparkles,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Download,
  Compass,
} from 'lucide-react';

interface ForecastHeroProps {
  predictionsData: PredictionsData;
  backtestData: BacktestData | null;
}

export const ForecastHero: React.FC<ForecastHeroProps> = ({ predictionsData, backtestData }) => {
  const { t, language } = useLanguage();

  // Find Diwali date (days_to_diwali === 0)
  const defaultItem =
    predictionsData.predictions.find((p) => p.days_to_diwali === 0) ||
    predictionsData.predictions[0];

  // Find Peak PM2.5 item
  const peakItem = predictionsData.predictions.reduce(
    (max, item) => (item.pm25_pred > max.pm25_pred ? item : max),
    predictionsData.predictions[0]
  );

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const paramDay = new URLSearchParams(window.location.search).get('day');
      if (paramDay && predictionsData.predictions.some((p) => p.date === paramDay)) {
        return paramDay;
      }
    }
    return defaultItem.date;
  });

  // Weather state (cached Open-Meteo)
  const [weatherMap, setWeatherMap] = useState<Record<string, DailyWeatherData> | null>(null);
  const [weatherLoaded, setWeatherLoaded] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetchWeatherContext()
      .then((data) => {
        if (active) {
          setWeatherMap(data);
          setWeatherLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setWeatherMap(null);
          setWeatherLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedItem: PredictionItem =
    predictionsData.predictions.find((p) => p.date === selectedDate) || defaultItem;

  const cpcbCategory = getCpcbCategory(selectedItem.pm25_pred);
  const epaSubIndex = calculateEpaSubIndex(selectedItem.pm25_pred);

  const ratioToCpcb = (selectedItem.pm25_pred / CPCB_NAAQS_STANDARD).toFixed(1);
  const ratioToWho = (selectedItem.pm25_pred / WHO_AIR_QUALITY_GUIDELINE).toFixed(1);

  const isDiwali = selectedItem.days_to_diwali === 0;
  const isPeak = selectedItem.date === peakItem.date;

  const dayWeather: DailyWeatherData | undefined = weatherMap?.[selectedItem.date];

  // Format relative days text
  const formatDaysRelative = (d: number) => {
    if (d === 0) return language === 'hi' ? 'दिवाली का दिन (D0)' : 'Diwali Day (D0)';
    const abs = Math.abs(d);
    if (d > 0) {
      return language === 'hi'
        ? `${d} दिन दिवाली से पहले (D-${d})`
        : `${d} ${d === 1 ? 'day' : 'days'} before Diwali (D-${d})`;
    }
    return language === 'hi'
      ? `${abs} दिन दिवाली के बाद (D+${abs})`
      : `${abs} ${abs === 1 ? 'day' : 'days'} after Diwali (D+${abs})`;
  };

  const formatLongDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const formatButtonDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${monthNamesEn[mIdx]} ${parseInt(parts[2], 10)}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const handleDownloadCsv = () => {
    exportPatialaCsv(predictionsData.predictions, backtestData?.series);
  };

  return (
    <div className="space-y-6">
      {/* 1. Day Picker (Nov 1-13, Diwali pre-selected, Peak marked) + CSV Download */}
      <div className="rounded-xl bg-white border border-stone-200 p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-stone-700">
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>{t.select_day}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-stone-400 font-mono hidden sm:inline">
              {`${predictionsData.predictions.length}-day horizon (D-${predictionsData.predictions[0].days_to_diwali} to D+${Math.abs(predictionsData.predictions[predictionsData.predictions.length - 1].days_to_diwali)})`}
            </span>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition cursor-pointer"
              title="Download forecast CSV"
            >
              <Download className="w-3 h-3 text-amber-700" />
              <span>{t.btn_download_csv}</span>
            </button>
          </div>
        </div>

        {/* Day Pills Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-13 sm:gap-1.5">
          {predictionsData.predictions.map((p) => {
            const isSelected = p.date === selectedDate;
            const isItemDiwali = p.days_to_diwali === 0;
            const isItemPeak = p.date === peakItem.date;

            return (
              <button
                key={p.date}
                onClick={() => setSelectedDate(p.date)}
                className={`relative flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-center transition cursor-pointer shrink-0 min-w-[65px] sm:min-w-0 ${
                  isSelected
                    ? 'bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white border-orange-500 day-glow'
                    : isItemDiwali
                    ? 'bg-amber-50/80 border-amber-300 text-stone-800 hover:bg-amber-100/70'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-sky-300 hover:bg-sky-50/70 hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                  {formatButtonDate(p.date)}
                </span>
                <span
                  className={`text-[9.5px] mt-0.5 font-mono ${
                    isSelected
                      ? 'text-amber-100 font-medium'
                      : isItemDiwali
                      ? 'text-amber-800 font-bold'
                      : isItemPeak
                      ? 'text-rose-700 font-bold'
                      : 'text-stone-400'
                  }`}
                >
                  {isItemDiwali ? 'Diwali' : isItemPeak ? '★ Peak' : p.days_to_diwali > 0 ? `D-${p.days_to_diwali}` : `D+${Math.abs(p.days_to_diwali)}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ONE Big Answer for the Selected Day with Dual Sub-Indices & Weather Context */}
      <div className="rounded-2xl bg-white border border-stone-200 p-6 sm:p-8 shadow-xs hero-card">
        {/* Day Context & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-stone-100">
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">
              STATION FORECAST · {formatDaysRelative(selectedItem.days_to_diwali)}
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
              {formatLongDate(selectedItem.date)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDiwali && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-500 text-amber-900 bg-amber-50 font-mono">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Diwali Festival Day
              </span>
            )}
            {isPeak && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-rose-400 text-rose-800 bg-rose-50 font-mono">
                Predicted Peak Day
              </span>
            )}
            {/* CPCB Band Badge */}
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border font-mono tracking-wide"
              style={{
                color: cpcbCategory.color,
                borderColor: `${cpcbCategory.color}60`,
                backgroundColor: `${cpcbCategory.color}15`,
              }}
              title="CPCB PM2.5 sub-index band"
            >
              CPCB: {selectedItem.cpcb_pm25_band || cpcbCategory.label}
            </span>

            {/* EPA Sub-index Badge */}
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border font-mono tracking-wide"
              style={{
                color: epaSubIndex.color,
                borderColor: epaSubIndex.borderColor,
                backgroundColor: epaSubIndex.bgColor,
              }}
              title="US EPA PM2.5 sub-index"
            >
              EPA: {epaSubIndex.aqi} ({epaSubIndex.category})
            </span>
          </div>
        </div>

        {/* Big Number & Dual Sub-Index Box */}
        <div className="py-6 sm:py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Big PM2.5 Numeral */}
          <div className="md:col-span-6 flex flex-col justify-center">
            <span className="text-xs text-stone-500 font-mono uppercase tracking-wider">
              {t.predicted_pm25}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-serif text-6xl sm:text-7xl font-bold text-stone-900 tracking-tight hero-numeral">
                {selectedItem.pm25_pred.toFixed(1)}
              </span>
              <span className="text-xl sm:text-2xl font-sans text-stone-500 font-normal">
                µg/m³
              </span>
            </div>
            <div className="text-xs text-stone-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
              <span>
                <strong className="text-amber-800 font-bold">{ratioToCpcb}x</strong> CPCB 24-hr standard (60 µg/m³)
              </span>
              <span>•</span>
              <span>
                <strong className="text-stone-700 font-bold">{ratioToWho}x</strong> WHO guideline (15 µg/m³)
              </span>
            </div>
          </div>

          {/* Dual Sub-Index & Advisory Context Box */}
          <div className="md:col-span-6 bg-stone-50/80 rounded-xl p-4 sm:p-5 border border-stone-200 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">
                  Official Health Advisory
                </span>
                <p className="text-sm text-stone-800 font-medium mt-1 leading-snug">
                  {cpcbCategory.healthAdvisory}
                </p>
              </div>
            </div>

            {/* Dual Sub-Index Comparison */}
            <div className="pt-2 border-t border-stone-200/70 text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">{CPCB_LABEL}:</span>
                <strong className="text-stone-900">{selectedItem.cpcb_pm25_band || cpcbCategory.label}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">{EPA_LABEL}:</span>
                <strong style={{ color: epaSubIndex.color }}>
                  {epaSubIndex.aqi} · {epaSubIndex.category}
                </strong>
              </div>
              <p className="text-[10px] text-stone-500 pt-1 leading-tight font-sans italic">
                * {EPA_NOTE}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Weather Context Strip (Feature 3) */}
        {weatherLoaded && weatherMap !== null && (
          <div className="pt-4 border-t border-stone-200/70">
            {dayWeather ? (
              <div className="bg-amber-50/40 rounded-lg p-3 border border-amber-200/60">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-700 font-mono uppercase text-[11px]">
                    <Compass className="w-3.5 h-3.5 text-amber-700" />
                    <span>Open-Meteo Weather Context:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-800">
                    {/* Temperature */}
                    <div className="flex items-center gap-1" title="Daily Mean Temperature">
                      <Thermometer className="w-3.5 h-3.5 text-stone-500" />
                      <span>{dayWeather.temperatureMean}°C</span>
                    </div>

                    {/* Relative Humidity */}
                    <div className="flex items-center gap-1" title="Daily Mean Relative Humidity">
                      <Droplets className="w-3.5 h-3.5 text-sky-600" />
                      <span>{dayWeather.relativeHumidity}% RH</span>
                    </div>

                    {/* Wind Speed and Direction Arrow */}
                    <div className="flex items-center gap-1.5" title={`Wind ${dayWeather.windDirection}° (${getWindCompass(dayWeather.windDirection)})`}>
                      <Wind className="w-3.5 h-3.5 text-teal-600" />
                      <span>{dayWeather.windSpeed} km/h</span>
                      <span
                        className="inline-block transform font-sans text-stone-600 text-sm font-bold"
                        style={{ transform: `rotate(${dayWeather.windDirection}deg)` }}
                        title={`${dayWeather.windDirection}°`}
                      >
                        ↓
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">
                        ({getWindCompass(dayWeather.windDirection)})
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10.5px] text-stone-500 font-sans mt-1.5 italic">
                  {t.weather_caption}
                </p>
              </div>
            ) : (
              <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200 text-stone-500 text-xs font-mono flex items-center justify-between">
                <span>{t.weather_unavailable}</span>
                <span className="text-[10px] text-stone-400">Patiala (30.34°N, 76.39°E)</span>
              </div>
            )}
          </div>
        )}

        {/* Station-Level Disclaimer Note */}
        <div className="pt-4 mt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2 font-mono">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-700" />
            <span>Model Town, Patiala (CPCB CAAQMS site_1437)</span>
          </div>
          <span>Station-level truth: single monitoring station, not neighbourhood-exact</span>
        </div>
      </div>

      {/* 4. Small 4-Stat Row Overview (Compact) */}
      <KpiSummary
        predictionsData={predictionsData}
        backtestData={backtestData}
      />
    </div>
  );
};
