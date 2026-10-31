import type { BacktestData, ContentData, PredictionsData } from '../types/airQuality';

export interface DataLoadResult {
  predictions: PredictionsData | null;
  backtest: BacktestData | null;
  content: ContentData | null;
  predictionsError: string | null;
  backtestError: string | null;
  contentError: string | null;
  isPredictionsPending: boolean;
  isBacktestPending: boolean;
}

export function validatePredictions(data: unknown): { valid: boolean; data?: PredictionsData; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be a valid JSON object' };
  }
  const obj = data as Partial<PredictionsData>;
  if (!obj.station || typeof obj.station !== 'string') {
    return { valid: false, error: 'Missing or invalid "station" string property' };
  }
  if (!obj.generated_for || typeof obj.generated_for !== 'string') {
    return { valid: false, error: 'Missing or invalid "generated_for" string property' };
  }
  if (!Array.isArray(obj.predictions) || obj.predictions.length === 0) {
    return { valid: false, error: 'Predictions array must exist and contain at least one forecast entry' };
  }
  for (let i = 0; i < obj.predictions.length; i++) {
    const item = obj.predictions[i];
    if (!item.date || typeof item.date !== 'string') {
      return { valid: false, error: `Prediction entry [${i}] missing valid "date"` };
    }
    if (typeof item.pm25_pred !== 'number' || isNaN(item.pm25_pred)) {
      return { valid: false, error: `Prediction entry [${i}] missing numeric "pm25_pred"` };
    }
    if (typeof item.days_to_diwali !== 'number' || isNaN(item.days_to_diwali)) {
      return { valid: false, error: `Prediction entry [${i}] missing numeric "days_to_diwali"` };
    }
  }
  return { valid: true, data: obj as PredictionsData };
}

export function validateBacktest(data: unknown): { valid: boolean; data?: BacktestData; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be a valid JSON object' };
  }
  const obj = data as Partial<BacktestData>;
  if (!obj.station || typeof obj.station !== 'string') {
    return { valid: false, error: 'Missing or invalid "station" string property' };
  }
  if (!obj.test_window || typeof obj.test_window !== 'string') {
    return { valid: false, error: 'Missing or invalid "test_window" string property' };
  }
  if (!Array.isArray(obj.models) || obj.models.length === 0) {
    return { valid: false, error: 'Backtest "models" array must contain model evaluation metrics' };
  }
  for (let i = 0; i < obj.models.length; i++) {
    const m = obj.models[i];
    if (!m.name || typeof m.mae !== 'number' || isNaN(m.mae)) {
      return { valid: false, error: `Model [${i}] missing name or numeric MAE` };
    }
  }
  if (!Array.isArray(obj.series) || obj.series.length === 0) {
    return { valid: false, error: 'Backtest "series" array must contain evaluation timeline points' };
  }
  for (let i = 0; i < obj.series.length; i++) {
    const s = obj.series[i];
    if (!s.date || typeof s.actual !== 'number' || typeof s.predicted !== 'number' || typeof s.naive !== 'number') {
      return { valid: false, error: `Series point [${i}] missing date or valid numeric actual/predicted/naive values` };
    }
  }
  return { valid: true, data: obj as BacktestData };
}

export async function fetchLivePredictions(path = '/data/predictions.json'): Promise<{ data: PredictionsData | null; error: string | null; isPending: boolean }> {
  // Primary path: functional backend API. Falls back to the bundled static JSON on any failure.
  try {
    const apiRes = await fetch('/api/forecast');
    if (apiRes.ok) {
      const apiJson = await apiRes.json();
      const v = validatePredictions(apiJson);
      if (v.valid) return { data: v.data!, error: null, isPending: false };
    }
  } catch { /* fall through to static */ }
  try {
    const res = await fetch(`${path}?t=${Date.now()}`);
    if (res.status === 404) {
      return { data: null, error: 'File not found (HTTP 404). Awaiting predictions.json.', isPending: true };
    }
    if (!res.ok) {
      return { data: null, error: `Server returned HTTP ${res.status}: ${res.statusText}`, isPending: true };
    }
    const json = await res.json();
    const validation = validatePredictions(json);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid predictions JSON schema', isPending: true };
    }
    return { data: validation.data!, error: null, isPending: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg, isPending: true };
  }
}

export async function fetchLiveBacktest(path = '/data/backtest.json'): Promise<{ data: BacktestData | null; error: string | null; isPending: boolean }> {
  // Primary path: functional backend API. Falls back to the bundled static JSON on any failure.
  try {
    const apiRes = await fetch('/api/backtest');
    if (apiRes.ok) {
      const apiJson = await apiRes.json();
      const v = validateBacktest(apiJson);
      if (v.valid) return { data: v.data!, error: null, isPending: false };
    }
  } catch { /* fall through to static */ }
  try {
    const res = await fetch(`${path}?t=${Date.now()}`);
    if (res.status === 404) {
      return { data: null, error: 'File not found (HTTP 404). Awaiting backtest.json.', isPending: true };
    }
    if (!res.ok) {
      return { data: null, error: `Server returned HTTP ${res.status}: ${res.statusText}`, isPending: true };
    }
    const json = await res.json();
    const validation = validateBacktest(json);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid backtest JSON schema', isPending: true };
    }
    return { data: validation.data!, error: null, isPending: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg, isPending: true };
  }
}

export async function fetchLiveContent(path = '/data/content.json'): Promise<{ data: ContentData | null; error: string | null }> {
  try {
    const res = await fetch(`${path}?t=${Date.now()}`);
    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { data: json as ContentData, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}
