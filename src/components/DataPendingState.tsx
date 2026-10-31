import React, { useRef } from 'react';
import { Clock, AlertCircle, FileCheck, FileX, UploadCloud, RefreshCw, HelpCircle } from 'lucide-react';

interface DataPendingStateProps {
  isPredictionsPending: boolean;
  isBacktestPending: boolean;
  predictionsError: string | null;
  backtestError: string | null;
  onReload: () => void;
  onFileUpload: (file: File) => void;
}

export const DataPendingState: React.FC<DataPendingStateProps> = ({
  isPredictionsPending,
  isBacktestPending,
  predictionsError,
  backtestError,
  onReload,
  onFileUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        onFileUpload(e.dataTransfer.files[i]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {/* Hero Pending Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 p-6 sm:p-10 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0 mt-1">
              <Clock className="w-8 h-8 animate-pulse text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 font-mono">
                  Data Ingestion Pending
                </span>
                <span className="text-xs text-stone-500 font-mono">Model Town, Patiala (site_1437)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1.5 tracking-tight">
                Awaiting Official Model Forecast Ingestion
              </h2>
              <p className="text-sm sm:text-base text-stone-600 mt-2 max-w-2xl leading-relaxed">
                In strict adherence to scientific rigor,{' '}
                <strong className="text-amber-900 font-semibold">zero fake numbers or synthetic particulate estimates</strong> are
                displayed. Charts and analytics will automatically render once the station forecast and backtest files
                are placed in <code className="text-amber-800 font-mono bg-amber-50 px-1 rounded">public/data/</code> or ingested below.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={onReload}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Check / Reload Data
            </button>
            <p className="text-[11px] text-stone-400 text-center mt-1.5 font-mono">
              Re-checks predictions.json & backtest.json
            </p>
          </div>
        </div>
      </div>

      {/* File Ingestion Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* predictions.json Status Card */}
        <div className={`rounded-xl border p-5 bg-white shadow-xs transition ${
          isPredictionsPending ? 'border-amber-300' : 'border-emerald-300'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              {isPredictionsPending ? (
                <FileX className="w-5 h-5 text-amber-600" />
              ) : (
                <FileCheck className="w-5 h-5 text-emerald-600" />
              )}
              <span className="font-mono text-sm font-semibold text-stone-900">
                public/data/predictions.json
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${
              isPredictionsPending
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {isPredictionsPending ? 'Pending File' : 'Ready'}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs text-stone-600">
            <p className="text-stone-500">
              Supplies the Diwali festival forecast horizon and Diwali D-Day marker for Patiala.
            </p>
            <div className="bg-[#faf8f5] rounded-lg p-3 font-mono text-[11px] text-stone-700 border border-stone-200 overflow-x-auto">
              <span className="text-stone-400">// Expected Schema:</span>
              <pre>{`{
  "station": "Model Town, Patiala - PPCB (site_1437)",
  "generated_for": "Diwali 2026 (Nov 8)",
  "predictions": [
    {
      "date": "2026-11-08",
      "pm25_pred": 119.8,
      "days_to_diwali": 0,
      "cpcb_pm25_band": "Poor"
    }
  ]
}`}</pre>
            </div>
            {predictionsError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{predictionsError}</span>
              </div>
            )}
          </div>
        </div>

        {/* backtest.json Status Card */}
        <div className={`rounded-xl border p-5 bg-white shadow-xs transition ${
          isBacktestPending ? 'border-amber-300' : 'border-emerald-300'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              {isBacktestPending ? (
                <FileX className="w-5 h-5 text-amber-600" />
              ) : (
                <FileCheck className="w-5 h-5 text-emerald-600" />
              )}
              <span className="font-mono text-sm font-semibold text-stone-900">
                public/data/backtest.json
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${
              isBacktestPending
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {isBacktestPending ? 'Pending File' : 'Ready'}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs text-stone-600">
            <p className="text-stone-500">
              Supplies historical Actual vs Predicted vs Naive baseline and Mean Absolute Error (MAE).
            </p>
            <div className="bg-[#faf8f5] rounded-lg p-3 font-mono text-[11px] text-stone-700 border border-stone-200 overflow-x-auto">
              <span className="text-stone-400">// Expected Schema:</span>
              <pre>{`{
  "station": "Model Town, Patiala - PPCB (site_1437)",
  "test_window": "2024-10-20 to 2024-11-10",
  "series_model": "Retrospective reconstruction...",
  "models": [{ "name": "Model", "mae": 17.2 }],
  "series": [
    {
      "date": "2024-10-31",
      "actual": 114.0,
      "predicted": 108.9,
      "naive": 106.4
    }
  ]
}`}</pre>
            </div>
            {backtestError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{backtestError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag & Drop File Ingestion Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="mt-6 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-xl p-8 text-center cursor-pointer bg-white hover:bg-stone-50/70 transition group shadow-xs"
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              for (let i = 0; i < e.target.files.length; i++) {
                onFileUpload(e.target.files[i]);
              }
            }
          }}
        />
        <div className="flex flex-col items-center justify-center">
          <div className="p-3 rounded-full bg-stone-100 group-hover:bg-amber-50 text-stone-500 group-hover:text-amber-700 transition mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-stone-900 group-hover:text-amber-900 transition">
            Drag & Drop JSON files here or Click to Browse
          </h4>
          <p className="text-xs text-stone-500 mt-1 font-mono">
            Accepts <code className="text-amber-800">predictions.json</code> and{' '}
            <code className="text-cyan-800">backtest.json</code>
          </p>
        </div>
      </div>

      {/* Why no fake numbers section */}
      <div className="mt-8 p-5 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs text-stone-600 space-y-2">
        <div className="flex items-center gap-2 text-amber-950 font-semibold font-serif text-sm">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Why does this dashboard wait for real data without showing mock values?</span>
        </div>
        <p className="leading-relaxed">
          In Diwali air pollution modeling across Punjab, generating artificial or randomized micro-neighborhood
          predictions creates dangerous false precision for public health authorities. This hackathon dashboard
          respects scientific integrity by holding all charts and KPI panels in an explicit pending state until
          the verified station-level predictions are delivered.
        </p>
      </div>
    </div>
  );
};
