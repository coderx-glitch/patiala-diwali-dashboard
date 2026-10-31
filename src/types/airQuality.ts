export interface PredictionItem {
  date: string;
  pm25_pred: number;
  days_to_diwali: number;
  cpcb_pm25_band?: string;
}

export interface PredictionsData {
  station: string;
  generated_at_ist?: string;
  generated_for: string;
  forecast_issue?: string;
  train_cutoff?: string;
  target?: string;
  predictions: PredictionItem[];
  sources?: string[];
}

export interface ModelMetric {
  name: string;
  mae: number;
  mae_diwali_core?: number;
}

export interface SeriesItem {
  date: string;
  actual: number;
  predicted: number;
  naive: number;
}

export interface BacktestFit {
  train_daily_rows?: number;
  train_span?: string;
  test_days?: number;
  note?: string;
}

export interface BacktestData {
  station: string;
  generated_at_ist?: string;
  target?: string;
  train_cutoff?: string;
  test_window: string;
  series_model?: string;
  fit?: BacktestFit;
  models: ModelMetric[];
  series: SeriesItem[];
  method?: string;
  caveats?: string[];
  sources?: string[];
}

export interface ContentData {
  methodology: string;
  limitations: string[];
  sources: string[];
}

export type CpcbCategory = 
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export interface CategoryInfo {
  label: CpcbCategory;
  range: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  healthAdvisory: string;
}
