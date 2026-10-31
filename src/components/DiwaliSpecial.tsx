import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { CalendarDays, Clock3, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { getCpcbCategory } from '../utils/aqiColors';

// ---------------------------------------------------------------------------
// Types (local to this additive component - shared types file is untouched)
// ---------------------------------------------------------------------------
interface JourneyDay {
  date: string;
  weekday: string;
  rel_day: number;
  pm25: number;
  band?: string;
  festival: string | null;
}
interface ComparePoint { rel_day: number; pm25: number; n_hours?: number }
interface CompareYear {
  year: number;
  kind: 'station_actual' | 'regional_estimate' | 'forecast';
  label: string;
  note: string;
  points: ComparePoint[];
}
interface HourPoint { hour: number; pm25: number; n_hours?: number }
interface DiwaliSpecialData {
  station: string;
  generated_at_ist: string;
  festivals_2026: { date: string; rel_day: number; name: string }[];
  journey_2026: JourneyDay[];
  comparison: { rel_window: [number, number]; rel_day_meaning: string; years: CompareYear[] };
  hourly_pattern: {
    years_used: number[];
    diwali_dates_used: string[];
    diwali_days_avg: HourPoint[];
    season_avg: HourPoint[];
    season_definition: string;
    note: string;
  };
  evidence_note: string;
  caveats: string[];
  sources: string[];
}

// ---------------------------------------------------------------------------
// Data loading with honest states (mirrors the site's fetch-then-validate style)
// ---------------------------------------------------------------------------
function validate(data: unknown): data is DiwaliSpecialData {
  const d = data as Partial<DiwaliSpecialData>;
  return !!(
    d &&
    Array.isArray(d.journey_2026) && d.journey_2026.length > 0 &&
    d.comparison && Array.isArray(d.comparison.years) && d.comparison.years.length > 0 &&
    d.hourly_pattern && Array.isArray(d.hourly_pattern.diwali_days_avg)
  );
}

function useDiwaliSpecial(dataUrl: string) {
  const [data, setData] = useState<DiwaliSpecialData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${dataUrl}?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (validate(json)) { setData(json); setError(null); }
        else setError('diwali_special.json failed schema validation');
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [dataUrl]);
  return { data, error, loading };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const relLabel = (rel: number) => (rel === 0 ? 'Diwali' : rel < 0 ? `D${rel}` : `D+${rel}`);
const relTick = (rel: number) => (rel === 0 ? 'D0' : rel < 0 ? `D${rel}` : `D+${rel}`);
const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
};

// Muted stone shades for past measured years; saffron family for the current story.
const YEAR_STYLES: Record<number, { stroke: string; dash?: string; width: number }> = {
  2021: { stroke: '#d6d3d1', width: 1.5 },
  2022: { stroke: '#a8a29e', width: 1.5 },
  2023: { stroke: '#78716c', width: 1.5 },
  2024: { stroke: '#44403c', width: 2 },
  2025: { stroke: '#b45309', dash: '5 4', width: 2 },
  2026: { stroke: '#c2410c', width: 3 },
};

const cardCls = 'bg-white border border-[#e8e4dc] rounded-xl shadow-xs';

interface TipEntry { name?: unknown; value?: unknown; payload?: Record<string, number> }
interface TipProps { active?: boolean; payload?: TipEntry[]; label?: unknown }

const CompareTooltip: React.FC<TipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-lg text-[11px] text-stone-800 max-w-[240px]">
      <div className="font-semibold text-stone-900 pb-1 border-b border-stone-100">{relLabel(Number(label))}</div>
      <div className="mt-1 space-y-0.5">
        {payload.filter((e) => e.value != null).map((e, i) => {
          const yr = String(e.name).slice(0, 4);
          const n = e.payload ? e.payload[`y${yr}__n`] : undefined;
          const measured = String(e.name).includes('actual');
          return (
            <div key={i} className="flex items-center justify-between gap-3 font-mono">
              <span className="font-sans text-stone-600">{String(e.name)}</span>
              <span>
                <strong>{Number(e.value).toFixed(1)}</strong> µg/m³
                {measured && n ? <span className="text-stone-400 font-sans"> ({n}h avg)</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HourTooltip: React.FC<TipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-lg text-[11px] text-stone-800">
      <div className="font-semibold text-stone-900 pb-1 border-b border-stone-100">{String(label)}:00 IST</div>
      <div className="mt-1 space-y-0.5">
        {payload.filter((e) => e.value != null).map((e, i) => {
          const isDiwali = String(e.name).startsWith('Past Diwali');
          const n = isDiwali ? 4 : undefined;
          return (
            <div key={i} className="flex items-center justify-between gap-3 font-mono">
              <span className="font-sans text-stone-600">{String(e.name)}</span>
              <span>
                <strong>{Number(e.value).toFixed(1)}</strong> µg/m³
                {n ? <span className="text-stone-400 font-sans"> (avg of {n} days)</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const DiwaliSpecial: React.FC<{ dataUrl?: string }> = ({ dataUrl = '/data/diwali_special.json' }) => {
  const { data, error, loading } = useDiwaliSpecial(dataUrl);

  const compareRows = useMemo(() => {
    if (!data) return [];
    const [lo, hi] = data.comparison.rel_window;
    const rows: Record<string, number>[] = [];
    for (let r = lo; r <= hi; r++) {
      const row: Record<string, number> = { rel_day: r };
      for (const y of data.comparison.years) {
        const p = y.points.find((pt) => pt.rel_day === r);
        if (p) {
          row[`y${y.year}`] = p.pm25;
          if (p.n_hours) row[`y${y.year}__n`] = p.n_hours;
        }
      }
      rows.push(row);
    }
    return rows;
  }, [data]);

  const hourRows = useMemo(() => {
    if (!data) return [];
    return data.hourly_pattern.diwali_days_avg.map((d, i) => ({
      hour: d.hour,
      diwali: d.pm25,
      season: data.hourly_pattern.season_avg[i]?.pm25,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <RefreshCw className="w-7 h-7 text-amber-600 animate-spin mb-3" />
        <p className="text-xs text-stone-500">Loading Diwali special data...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className={`${cardCls} p-5 text-center`}>
        <p className="text-sm font-semibold text-stone-900 font-serif">Diwali special data unavailable</p>
        <p className="text-xs text-stone-500 mt-1">{error || 'Unknown error'}. Other tabs are unaffected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Section 1: Festival journey */}
      <section className={`${cardCls} p-4 sm:p-5 min-w-0`}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#c2410c]" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">Diwali 2026 Festival Journey</h2>
        </div>
        <p className="text-[11px] text-stone-500 mb-3">
          Station-level daily PM2.5 forecast for the festival window (Model Town, Patiala). Festival names are calendar context.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Festival days, scroll horizontally">
          {data.journey_2026.map((d) => {
            const cat = getCpcbCategory(d.pm25);
            const isDiwali = d.rel_day === 0;
            return (
              <div
                key={d.date}
                className={`shrink-0 w-[86px] rounded-lg border p-2.5 text-center ${
                  isDiwali ? 'border-[#c2410c] bg-[#fff7ed] ring-1 ring-[#c2410c]/30' : 'border-stone-200 bg-stone-50/60'
                }`}
              >
                <div className="text-[10px] font-medium text-stone-500">{d.weekday.slice(0, 3)}</div>
                <div className="text-xs font-semibold text-stone-900">{shortDate(d.date)}</div>
                <div className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${isDiwali ? 'text-[#c2410c]' : 'text-amber-700'}`}>
                  {d.festival || relTick(d.rel_day)}
                </div>
                <div className="mt-1.5 text-base font-bold font-mono text-stone-900">{d.pm25.toFixed(1)}</div>
                <span className={`mt-1 inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${cat.bgColor} ${cat.borderColor} ${cat.textColor}`}>
                  {d.band || cat.label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-stone-400">
          D-2 = 2 days before Diwali, D+3 = 3 days after. Values are forecasts, not measurements.
          <span className="sm:hidden"> Swipe sideways for all 13 days.</span>
        </p>
      </section>

      {/* Section 2: This year vs past Diwalis */}
      <section className={`${cardCls} p-4 sm:p-5 min-w-0`}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-4 h-4 text-[#c2410c]" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">This Year vs Past Diwalis</h2>
        </div>
        <p className="text-[11px] text-stone-500 mb-3">
          Each year aligned to its own Diwali day (D0). 2021-2024 are measured station values; 2025 is a satellite-modelled
          regional estimate (no station data after Sep 1, 2025); 2026 is this dashboard&apos;s forecast.
        </p>
        <div className="h-64 sm:h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compareRows} margin={{ top: 8, right: 12, bottom: 4, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="rel_day" tickFormatter={relTick} tick={{ fontSize: 10, fill: '#78716c' }} stroke="#d6d3d1" />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} stroke="#d6d3d1" domain={[0, 'dataMax + 20']}
                     label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#a8a29e' } }} />
              <Tooltip content={<CompareTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={10} />
              <ReferenceLine x={0} stroke="#c2410c" strokeDasharray="4 3" label={{ value: 'Diwali', position: 'insideTopLeft', fontSize: 10, fill: '#c2410c' }} />
              {data.comparison.years.map((y) => {
                const st = YEAR_STYLES[y.year] || { stroke: '#78716c', width: 1.5 };
                const name = y.kind === 'forecast' ? '2026 forecast'
                  : y.kind === 'regional_estimate' ? '2025 satellite est.'
                  : `${y.year} actual`;
                return (
                  <Line key={y.year} type="monotone" dataKey={`y${y.year}`} name={name}
                        stroke={st.stroke} strokeWidth={st.width}
                        strokeDasharray={st.dash} dot={false} connectNulls={false} isAnimationActive={false} />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[10px] text-stone-400">
          Past years had different weather and conditions - this is historical context, not proof the 2026 forecast is right.
        </p>
      </section>

      {/* Section 3: Past Diwali hourly pattern */}
      <section className={`${cardCls} p-4 sm:p-5 min-w-0`}>
        <div className="flex items-center gap-2 mb-1">
          <Clock3 className="w-4 h-4 text-[#c2410c]" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">Past Diwali Days, Hour by Hour</h2>
        </div>
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] text-amber-900 font-medium">
            Historical pattern from Diwali days 2021-2024 only. This is NOT an hourly forecast for 2026, and past evening
            spikes are co-occurrence in past data, not proof of cause.
          </p>
        </div>
        <div className="h-56 sm:h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourRows} margin={{ top: 8, right: 12, bottom: 4, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10, fill: '#78716c' }} stroke="#d6d3d1" />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} stroke="#d6d3d1"
                     label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#a8a29e' } }} />
              <Tooltip content={<HourTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={10} />
              <Line type="monotone" dataKey="diwali" name="Past Diwali days avg (2021-2024)" stroke="#c2410c" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="season" name="Season avg (Oct 15-Nov 15, 2021-2024)" stroke="#78716c" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[10px] text-stone-400">
          Station local time (IST). 2025 excluded - the station archive ends September 1, 2025.
        </p>
      </section>

      {/* Section 4: honesty / evidence */}
      <section className={`${cardCls} p-4 sm:p-5 min-w-0`}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">How Much To Trust This</h2>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">{data.evidence_note}</p>
        <ul className="mt-3 space-y-1.5">
          {data.caveats.map((c, i) => (
            <li key={i} className="text-[11px] text-stone-500 leading-relaxed flex gap-1.5">
              <span className="text-stone-300 select-none">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] text-stone-400">
          Artifact generated {data.generated_at_ist} from the repository&apos;s own data files. Sources listed under Model &amp; Method.
        </p>
      </section>
    </div>
  );
};

export default DiwaliSpecial;
