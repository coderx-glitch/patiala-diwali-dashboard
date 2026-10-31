import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { BacktestData } from '../types/airQuality';
import { CPCB_NAAQS_STANDARD } from '../utils/aqiColors';
import { Info } from 'lucide-react';

interface BacktestChartProps {
  data: BacktestData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const BacktestTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const actualItem = payload.find((p) => p.name.includes('Actual'));
  const predictedItem = payload.find((p) => p.name.includes('Retrospective') || p.name.includes('Predicted'));
  const naiveItem = payload.find((p) => p.name.includes('Naive'));

  const actual = actualItem?.value;
  const predicted = predictedItem?.value;
  const naive = naiveItem?.value;

  const modelError = actual !== undefined && predicted !== undefined ? Math.abs(predicted - actual) : null;
  const naiveError = actual !== undefined && naive !== undefined ? Math.abs(naive - actual) : null;

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg text-xs min-w-[230px] text-stone-800">
      <div className="font-semibold text-stone-900 pb-1.5 border-b border-stone-100 flex items-center justify-between font-mono">
        <span>{label}</span>
        <span className="text-[10px] text-amber-800 font-sans font-medium">Held-Out Test</span>
      </div>

      <div className="mt-2 space-y-1 font-mono">
        {actual !== undefined && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-800 font-sans">
              <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
              Actual Observed:
            </span>
            <span className="font-bold text-stone-900">{actual.toFixed(1)} µg/m³</span>
          </div>
        )}

        {predicted !== undefined && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-orange-800 font-sans">
              <span className="w-2 h-2 rounded-full bg-orange-600"></span>
              Retrospective Model:
            </span>
            <span className="font-bold text-stone-900">{predicted.toFixed(1)} µg/m³</span>
          </div>
        )}

        {naive !== undefined && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-stone-600 font-sans">
              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
              Naive Climatology:
            </span>
            <span className="font-medium text-stone-700">{naive.toFixed(1)} µg/m³</span>
          </div>
        )}
      </div>

      {(modelError !== null || naiveError !== null) && (
        <div className="mt-2 pt-1.5 border-t border-stone-100 text-[11px] space-y-0.5 font-mono">
          {modelError !== null && (
            <div className="flex items-center justify-between text-stone-500">
              <span className="font-sans">Retro Abs Error:</span>
              <span className="text-emerald-700 font-bold">{modelError.toFixed(1)} µg/m³</span>
            </div>
          )}
          {naiveError !== null && (
            <div className="flex items-center justify-between text-stone-500">
              <span className="font-sans">Naive Abs Error:</span>
              <span className="text-stone-600">{naiveError.toFixed(1)} µg/m³</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BacktestChart: React.FC<BacktestChartProps> = ({ data }) => {
  const [showActual, setShowActual] = useState(true);
  const [showPredicted, setShowPredicted] = useState(true);
  const [showNaive, setShowNaive] = useState(true);

  // Format short date for X axis (e.g. "2024-10-25" -> "Oct 25")
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(parts[1], 10) - 1;
        return `${monthNames[monthIndex]} ${parseInt(parts[2], 10)}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="rounded-xl bg-white border border-stone-200 p-5 shadow-xs">
      {/* Header */}
      <div className="pb-3 border-b border-stone-100">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Held-Out Backtest: Retrospective Reconstruction
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-amber-600/70 text-amber-800 bg-amber-50/70 font-mono">
              RETROSPECTIVE SERIES
            </span>
          </div>

          {data.fit?.train_daily_rows && (
            <div className="text-xs text-stone-500 font-mono">
              Fit: {data.fit.train_daily_rows} days ({data.fit.train_span})
            </div>
          )}
        </div>

        <p className="text-xs text-amber-800 mt-1 flex items-start sm:items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 text-amber-700 mt-0.5 sm:mt-0" />
          <span>
            <strong>Note:</strong> Chart series is the retrospective reconstruction (archived near-analysis weather inputs), NOT the 1-day or 3-day lead-matched rows. Test window: {data.test_window}.
          </span>
        </p>
      </div>

      {/* Interactive Series Filter Toggles */}
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
        <span className="text-stone-400 text-[11px] mr-1 font-mono uppercase">Filter:</span>
        <button
          onClick={() => setShowActual(!showActual)}
          className={`px-2.5 py-1 rounded-md font-medium border text-xs transition cursor-pointer flex items-center gap-1.5 ${
            showActual
              ? 'bg-cyan-50 border-cyan-400 text-cyan-900'
              : 'bg-stone-50 border-stone-200 text-stone-400 line-through'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
          Actual Observed PM2.5
        </button>

        <button
          onClick={() => setShowPredicted(!showPredicted)}
          className={`px-2.5 py-1 rounded-md font-medium border text-xs transition cursor-pointer flex items-center gap-1.5 ${
            showPredicted
              ? 'bg-amber-50 border-amber-400 text-amber-900'
              : 'bg-stone-50 border-stone-200 text-stone-400 line-through'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
          Retrospective Reconstruction
        </button>

        <button
          onClick={() => setShowNaive(!showNaive)}
          className={`px-2.5 py-1 rounded-md font-medium border text-xs transition cursor-pointer flex items-center gap-1.5 ${
            showNaive
              ? 'bg-stone-100 border-stone-300 text-stone-800'
              : 'bg-stone-50 border-stone-200 text-stone-400 line-through'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-stone-500"></span>
          Naive Climatology Baseline
        </button>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 sm:h-80 mt-3 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.series} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" />

            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              stroke="#78716c"
              fontSize={10}
              tickLine={false}
              dy={6}
            />

            <YAxis
              stroke="#78716c"
              fontSize={10}
              tickLine={false}
              domain={[0, (dataMax: number) => Math.ceil((dataMax + 20) / 20) * 20]}
              unit=" µg"
              dx={-2}
            />

            <Tooltip content={<BacktestTooltip />} />

            {/* Reference Line for CPCB Standard (60 µg/m³) */}
            <ReferenceLine
              y={CPCB_NAAQS_STANDARD}
              stroke="#b45309"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `CPCB 24-hr standard (60)`,
                position: 'insideBottomRight',
                fill: '#b45309',
                fontSize: 9.5,
                offset: 8
              }}
            />

            {showActual && (
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Observed PM2.5"
                stroke="#0891b2"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0891b2', stroke: '#0e7490' }}
                activeDot={{ r: 5, fill: '#0891b2', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {showPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                name="Retrospective Reconstruction"
                stroke="#c2410c"
                strokeWidth={2}
                dot={{ r: 3, fill: '#c2410c', stroke: '#9a3412' }}
                activeDot={{ r: 5, fill: '#c2410c', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {showNaive && (
              <Line
                type="monotone"
                dataKey="naive"
                name="Naive Climatology Baseline"
                stroke="#78716c"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#78716c' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Model Performance Comparison Cards */}
      <div className="mt-4 pt-3 border-t border-stone-100">
        <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 font-mono">
          Model Skill Summary on Held-Out Window (Oct 20 - Nov 10, 2024; 22 days)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.models.map((model) => {
            const isLead1 = model.name.includes('1 day ahead');
            const isRetro = model.name.includes('Retrospective');
            return (
              <div
                key={model.name}
                className={`p-3 rounded-lg border flex flex-col justify-between text-xs transition ${
                  isLead1
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : isRetro
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-stone-50/60 border-stone-200'
                }`}
              >
                <div>
                  <div className="font-medium text-xs leading-tight text-stone-900">
                    {model.name}
                  </div>
                  {isRetro && (
                    <span className="text-[10px] text-amber-800 font-mono block mt-0.5">
                      (Chart Series Source)
                    </span>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-end justify-between font-mono">
                  <div>
                    <div className="text-[10px] text-stone-500 font-sans">Window MAE</div>
                    <div className="text-base font-bold text-stone-900">
                      {model.mae.toFixed(1)} <span className="text-[10px] font-normal text-stone-500">µg/m³</span>
                    </div>
                  </div>
                  {model.mae_diwali_core !== undefined && (
                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 font-sans">Diwali Core</div>
                      <div className="text-xs font-semibold text-amber-900">
                        {model.mae_diwali_core.toFixed(1)} µg/m³
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
