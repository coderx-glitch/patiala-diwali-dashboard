import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, Legend } from 'recharts';
import { Wind, CloudRain, Sparkles, Info } from 'lucide-react';
import { getCpcbCategory } from '../utils/aqiColors';

interface ScenariosFile {
  dates: string[];
  deployed_baseline: number[];
  refit_vs_deployed_max_abs_diff: number;
  grid: { wind_mults: number[]; rain_mm_nov8: number[]; festival: string[] };
  scenarios: Record<string, { delta: number[] }>;
  method: string;
}

const WIND_LABELS: Record<string, string> = {
  '0.5': 'Wind -50%', '0.75': 'Wind -25%', '1': 'Current forecast wind', '1.25': 'Wind +25%', '1.5': 'Wind +50%',
};
const FEST_LABELS: Record<string, string> = {
  full: 'Full festival effect (as learned from past Diwalis)',
  half: 'Half the learned Diwali effect',
  off: 'No Diwali effect (festival uplift removed)',
};

export const WhatIfSimulator: React.FC = () => {
  const [data, setData] = useState<ScenariosFile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const WIND_OPTS = ['0.5', '0.75', '1.0', '1.25', '1.5'];
  const [wind, setWind] = useState('1.0');
  const [rain, setRain] = useState(0);
  const [fest, setFest] = useState('full');

  useEffect(() => {
    fetch('data/scenarios.json').then((r) => r.json()).then(setData).catch(() => setErr('Scenario data could not be loaded.'));
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;
    const key = `w${wind}_r${rain}_f${fest}`;
    const sc = data.scenarios[key];
    if (!sc) return null;
    const rows = data.dates.map((d, i) => {
      const base = data.deployed_baseline[i];
      const val = Math.max(0, Math.round((base + sc.delta[i]) * 10) / 10);
      return { date: d.slice(5), base, scenario: val, delta: Math.round((val - base) * 10) / 10 };
    });
    const diwali = rows.find((r) => r.date === '11-08');
    const peakBase = Math.max(...rows.map((r) => r.base));
    const peakRow = rows.reduce((a, b) => (b.scenario > a.scenario ? b : a), rows[0]);
    return { rows, diwali, peakBase, peakRow };
  }, [data, wind, rain, fest]);

  if (err) return <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">{err}</div>;
  if (!data || !derived) return <div className="p-6 text-center text-stone-400 text-sm">Loading the model scenario grid…</div>;

  const diwaliCat = derived.diwali ? getCpcbCategory(derived.diwali.scenario) : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
        <div>
          <h2 className="font-serif font-bold text-stone-900 text-base">What-if Pollution Simulator - Model Sensitivity</h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Precomputed responses: the same trained model was re-run offline on ONE fixed weather baseline, changing one
            input at a time (each scenario paired against the same baseline run). Shown as live forecast + model delta.
            Model sensitivity, not a causal policy estimate.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700"><Wind className="w-3.5 h-3.5" /> Wind speed</div>
            <input type="range" min={0} max={4} step={1} value={WIND_OPTS.indexOf(wind)}
              onChange={(e) => setWind(WIND_OPTS[parseInt(e.target.value, 10)])}
              className="w-full accent-amber-700" aria-label="Wind speed change" />
            <div className="text-[11px] font-mono text-stone-600">{WIND_LABELS[wind]}</div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700"><CloudRain className="w-3.5 h-3.5" /> Rain on Diwali day (Nov 8)</div>
            <div className="flex flex-wrap gap-1">
              {[0, 5, 10, 20].map((mm) => (
                <button key={mm} onClick={() => setRain(mm)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono border ${rain === mm ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-300'}`}>
                  {mm === 0 ? 'None' : `${mm} mm`}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-stone-400">Nov rain is rare in training data (7 days in 4 years) - least reliable scenario.</div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700"><Sparkles className="w-3.5 h-3.5" /> Festival effect</div>
            <div className="flex flex-col gap-1">
              {(['full', 'half', 'off'] as const).map((f) => (
                <button key={f} onClick={() => setFest(f)}
                  className={`px-2 py-1 rounded-md text-[11px] text-left border ${fest === f ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-300'}`}>
                  {FEST_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-stone-200 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-stone-400 font-mono">Diwali day (Nov 8)</div>
            <div className="font-mono font-bold text-lg text-stone-900">{derived.diwali?.scenario.toFixed(1)} <span className="text-[10px] font-normal text-stone-400">µg/m³</span></div>
            {diwaliCat && <div className="text-[10px] font-semibold" style={{ color: diwaliCat.color }}>{diwaliCat.label}</div>}
            <div className={`text-[10px] font-mono ${derived.diwali && derived.diwali.delta <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {derived.diwali && (derived.diwali.delta > 0 ? '+' : '')}{derived.diwali?.delta.toFixed(1)} vs forecast
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-stone-400 font-mono">Scenario peak</div>
            <div className="font-mono font-bold text-lg text-stone-900">{derived.peakRow.scenario.toFixed(1)} <span className="text-[10px] font-normal text-stone-400">µg/m³</span></div>
            <div className="text-[10px] text-stone-500 font-mono">{derived.peakRow.date}</div>
            <div className={`text-[10px] font-mono ${(derived.peakRow.scenario - derived.peakBase) <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {(derived.peakRow.scenario - derived.peakBase) > 0 ? '+' : ''}{(derived.peakRow.scenario - derived.peakBase).toFixed(1)} vs {derived.peakBase.toFixed(1)}
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 p-2.5 col-span-2 flex items-center">
            <p className="text-[10px] text-stone-500 leading-snug">
              Current scenario: <strong>{WIND_LABELS[wind]}</strong> · <strong>{rain === 0 ? 'no extra rain' : `${rain} mm rain Nov 8`}</strong> · <strong>{FEST_LABELS[fest].toLowerCase()}</strong>.
            </p>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={derived.rows} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(1)} µg/m³`, name === 'base' ? 'Live forecast' : 'Scenario']} />
              <Legend formatter={(v) => (v === 'base' ? 'Live forecast (unchanged)' : 'Scenario')} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="base" stroke="#a8a29e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="scenario" stroke="#c2410c" strokeWidth={2.5} dot={{ r: 2 }} />
              {derived.diwali && <ReferenceDot x="11-08" y={derived.diwali.scenario} r={5} fill="#c2410c" stroke="#fff" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-600 leading-relaxed space-y-1.5">
        <p className="flex items-start gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-stone-400" />
          <span><strong className="text-stone-800">What this is:</strong> {data.method.split('. Traffic')[0]}.</span>
        </p>
        <p><strong className="text-stone-800">What it is not:</strong> traffic %, firecracker % and zone-restriction scenarios are <em>not adjustable</em> - the model was trained on 4 years of station + weather data and has no learned features for them, so any number would be invented. It predicts PM2.5 concentration at one station, not full AQI, and a model sensitivity is not proof a policy will work.</p>
        <p><strong className="text-stone-800">Method detail:</strong> scenarios are not run on request - they were generated once with the deployed model. The weather forecast has drifted since the site's forecast was issued (the re-run baseline differs from the live forecast by up to {data.refit_vs_deployed_max_abs_diff.toFixed(0)} µg/m³ on some days), so the site shows the <em>delta</em> each input change made within the same paired run, added to the live forecast - never the re-run's absolute values.</p>
      </div>
    </div>
  );
};
