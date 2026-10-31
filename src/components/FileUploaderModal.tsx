import React, { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import type { BacktestData, PredictionsData } from '../types/airQuality';
import { validateBacktest, validatePredictions } from '../utils/dataLoader';

interface FileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (predictions: PredictionsData | null, backtest: BacktestData | null) => void;
  currentPredictions: PredictionsData | null;
  currentBacktest: BacktestData | null;
}

export const FileUploaderModal: React.FC<FileUploaderModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  currentPredictions,
  currentBacktest,
}) => {
  const [predState, setPredState] = useState<PredictionsData | null>(currentPredictions);
  const [backtestState, setBacktestState] = useState<BacktestData | null>(currentBacktest);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Check if it matches predictions schema
      const predVal = validatePredictions(json);
      if (predVal.valid && predVal.data) {
        setPredState(predVal.data);
        setSuccessMsg(`Successfully validated and loaded predictions for station: "${predVal.data.station}" (${predVal.data.predictions.length} points)`);
        return;
      }

      // Check if it matches backtest schema
      const backtestVal = validateBacktest(json);
      if (backtestVal.valid && backtestVal.data) {
        setBacktestState(backtestVal.data);
        setSuccessMsg(`Successfully validated and loaded backtest for station: "${backtestVal.data.station}" (${backtestVal.data.series.length} points, ${backtestVal.data.models.length} models)`);
        return;
      }

      setErrorMsg(`File "${file.name}" does not match predictions.json or backtest.json schema.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to parse "${file.name}": ${msg}`);
    }
  };

  const handleApply = () => {
    onApplyData(predState, backtestState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif font-bold text-stone-900 text-lg">Ingest Hackathon Model Outputs</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-stone-600">
            Select or drag and drop <code className="text-amber-800 font-mono bg-amber-50 px-1 rounded">predictions.json</code> and/or{' '}
            <code className="text-cyan-800 font-mono bg-cyan-50 px-1 rounded">backtest.json</code>. The app validates JSON schema on-the-fly.
          </p>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer bg-stone-50/60 hover:bg-amber-50/20 transition group"
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
                    handleFileProcess(e.target.files[i]);
                  }
                }
              }}
            />
            <div className="flex flex-col items-center">
              <UploadCloud className="w-8 h-8 text-stone-400 group-hover:text-amber-700 transition mb-2" />
              <span className="text-xs font-semibold text-stone-800">
                Click to browse or drop JSON files here
              </span>
              <span className="text-[11px] text-stone-400 mt-1">
                Both files can be selected together
              </span>
            </div>
          </div>

          {/* Status indicators */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700" />
                <span className="text-stone-800 font-mono">predictions.json</span>
              </div>
              {predState ? (
                <span className="text-emerald-700 flex items-center gap-1 font-semibold font-mono text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Loaded ({predState.predictions.length} days)
                </span>
              ) : (
                <span className="text-amber-700 font-mono text-[11px]">Awaiting file</span>
              )}
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-700" />
                <span className="text-stone-800 font-mono">backtest.json</span>
              </div>
              {backtestState ? (
                <span className="text-emerald-700 flex items-center gap-1 font-semibold font-mono text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Loaded ({backtestState.series.length} points)
                </span>
              ) : (
                <span className="text-amber-700 font-mono text-[11px]">Awaiting file</span>
              )}
            </div>
          </div>

          {/* Feedback banners */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!predState && !backtestState}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
          >
            <span>Apply to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
