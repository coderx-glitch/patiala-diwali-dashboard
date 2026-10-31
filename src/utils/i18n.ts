import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  // Navigation Tabs
  tab_forecast: string;
  tab_special: string;
  tab_graph: string;
  tab_daily: string;
  tab_method: string;
  tab_map: string;

  // Header & Global
  title: string;
  station_name: string;
  station_truth_banner: string;
  btn_methodology: string;
  btn_print_report: string;
  btn_download_csv: string;

  // Forecast Hero
  select_day: string;
  diwali_day_badge: string;
  peak_day_badge: string;
  days_before: string;
  days_after: string;
  on_diwali: string;
  predicted_pm25: string;
  cpcb_band_label: string;
  epa_subindex_label: string;
  epa_note: string;
  weather_caption: string;
  weather_unavailable: string;
  wind_label: string;
  humidity_label: string;
  temp_label: string;

  // KPI Summary
  kpi_peak_title: string;
  kpi_diwali_title: string;
  kpi_cpcb_title: string;
  kpi_cpcb_exceedance: string;
  kpi_cpcb_subtext: string;
  kpi_mae_title: string;
  kpi_mae_subtext: string;
  kpi_mae_badge: string;

  // Table
  table_title: string;
  table_subtitle: string;
  table_col_date: string;
  table_col_timeline: string;
  table_col_pm25: string;
  table_col_cpcb: string;
  table_col_epa: string;

  // Notifications
  notif_optin_title: string;
  notif_optin_desc: string;
  notif_window_label: string;
  notif_threshold_label: string;
  notif_threshold_any: string;
  notif_active_status: string;
  notif_btn_disable: string;
  notif_btn_enable: string;

  // Day Comparison
  compare_title: string;
  compare_desc: string;
  compare_day_1: string;
  compare_day_2: string;
  compare_diff_higher: string;
  compare_diff_lower: string;
  compare_diff_equal: string;

  // Print Report
  print_report_title: string;
  generated_at: string;
  print_diwali_callout: string;
  print_model_summary_title: string;
  print_model_summary_body: string;
  print_sources_title: string;
}

const en: Translations = {
  tab_forecast: 'Forecast',
  tab_special: 'Diwali Special',
  tab_graph: 'Graph',
  tab_daily: 'Daily list',
  tab_method: 'Model & Method',
  tab_map: 'Map',

  title: 'Diwali Air Quality Prediction - Patiala',
  station_name: 'Model Town, Patiala - PPCB CAAQMS station site_1437 | Diwali 2026 (Nov 8) | PM2.5 µg/m³',
  station_truth_banner: 'Station-level truth: single CPCB monitoring station (Model Town, Patiala). Results are station-level, not neighbourhood-exact. CPCB 24-hr standard: 60 µg/m³ · WHO 24-hr guideline: 15 µg/m³',
  btn_methodology: 'Methodology',
  btn_print_report: 'Print report',
  btn_download_csv: 'Download CSV',

  select_day: 'Select forecast day:',
  diwali_day_badge: 'Diwali',
  peak_day_badge: 'Peak',
  days_before: 'days before Diwali',
  days_after: 'days after Diwali',
  on_diwali: 'Diwali Day (Nov 8)',
  predicted_pm25: 'Predicted 24-hr Mean PM2.5',
  cpcb_band_label: 'CPCB PM2.5 sub-index band',
  epa_subindex_label: 'US EPA PM2.5 sub-index',
  epa_note: 'PM2.5-only conversion of a single pollutant; not a measured multi-pollutant AQI.',
  weather_caption: 'Weather context (Open-Meteo). Calm winds and low temperatures often coincide with poor dispersion.',
  weather_unavailable: 'Weather data not available for this date',
  wind_label: 'Wind',
  humidity_label: 'RH',
  temp_label: 'Temp',

  kpi_peak_title: 'PEAK FORECAST PM2.5',
  kpi_diwali_title: 'DIWALI DAY FORECAST',
  kpi_cpcb_title: 'CPCB STANDARD',
  kpi_cpcb_exceedance: '2.4x the 24-hr limit at predicted peak (Nov 10)',
  kpi_cpcb_subtext: 'CPCB 24-hr standard: 60 µg/m³',
  kpi_mae_title: 'HELD-OUT TEST MAE',
  kpi_mae_subtext: 'µg/m³ at 1-day lead',
  kpi_mae_badge: 'vs naive 20.2',

  table_title: 'Daily Forecast Schedule',
  table_subtitle: '13 days · Nov 1 to Nov 13, 2026',
  table_col_date: 'DATE',
  table_col_timeline: 'TIMELINE',
  table_col_pm25: 'PM2.5 (µg/m³)',
  table_col_cpcb: 'CPCB BAND',
  table_col_epa: 'US EPA SUB-INDEX',

  notif_optin_title: 'Daily forecast notifications on karo',
  notif_optin_desc: 'Patiala station daily mean PM2.5 forecast subah phone ya browser par paayein.',
  notif_window_label: 'Delivery window:',
  notif_threshold_label: 'Alert threshold:',
  notif_threshold_any: 'Any level (default)',
  notif_active_status: 'Daily forecast notifications ACTIVE',
  notif_btn_disable: 'Turn off notifications',
  notif_btn_enable: 'Turn on notifications',

  compare_title: 'Compare Any Two Days',
  compare_desc: 'Compare station-measured history, satellite estimates, and model forecasts across any two dates.',
  compare_day_1: 'Day 1:',
  compare_day_2: 'Day 2:',
  compare_diff_higher: 'is {diff} µg/m³ higher than',
  compare_diff_lower: 'is {diff} µg/m³ lower than',
  compare_diff_equal: 'has identical PM2.5 to',

  print_report_title: 'Diwali Air Quality Forecast Report - Patiala',
  generated_at: 'Generated on',
  print_diwali_callout: 'Diwali 2026 Key Forecast Highlights',
  print_model_summary_title: 'Model & Evaluation Summary',
  print_model_summary_body: 'Output is daily mean PM2.5 concentration (µg/m³) for the Model Town, Patiala CPCB CAAQMS monitoring station (site_1437). Model is a LightGBM regressor trained on 38,150 hourly station readings (2021-Sep 2025) aggregated daily; the refit uses the 1,461 daily rows with complete features (2021-01-01 to 2024-12-31), with Open-Meteo weather, calendar and days-to-Diwali features. Skill was measured on three held-out Diwali windows (2022-2024); lead-matched scores exist for the 2024 window only: MAE 17.5 µg/m³ at 1-day lead (naive baseline 20.2). At 7-day lead the model does not beat the baseline, so longer-lead skill is unproven.',
  print_sources_title: 'Data Sources & Acknowledgements',
};

const hi: Translations = {
  tab_forecast: 'पूर्वानुमान',
  tab_special: 'दिवाली स्पेशल',
  tab_graph: 'ग्राफ़',
  tab_daily: 'दैनिक सूची',
  tab_method: 'मॉडल और विधि',
  tab_map: 'Map',

  title: 'दिवाली वायु गुणवत्ता पूर्वानुमान - पटियाला',
  station_name: 'मॉडल टाउन, पटियाला - PPCB CAAQMS स्टेशन site_1437 | दिवाली 2026 (8 नवंबर) | PM2.5 µg/m³',
  station_truth_banner: 'स्टेशन-स्तरीय सच: एकल CPCB निगरानी स्टेशन (मॉडल टाउन, पटियाला)। परिणाम स्टेशन-स्तर के हैं, मोहल्ला-सटीक नहीं। CPCB 24-घंटे मानक: 60 µg/m³ · WHO 24-घंटे दिशानिर्देश: 15 µg/m³',
  btn_methodology: 'कार्यप्रणाली',
  btn_print_report: 'रिपोर्ट प्रिंट करें',
  btn_download_csv: 'CSV डाउनलोड करें',

  select_day: 'पूर्वानुमान का दिन चुनें:',
  diwali_day_badge: 'दिवाली',
  peak_day_badge: 'पीक',
  days_before: 'दिन दिवाली से पहले',
  days_after: 'दिन दिवाली के बाद',
  on_diwali: 'दिवाली का दिन (8 नवंबर)',
  predicted_pm25: 'अनुमानित 24-घंटे औसत PM2.5',
  cpcb_band_label: 'CPCB PM2.5 उप-सूचकांक बैंड',
  epa_subindex_label: 'US EPA PM2.5 उप-सूचकांक',
  epa_note: 'एकल प्रदूषक का केवल PM2.5 रूपांतरण; मापा गया बहु-प्रदूषक AQI नहीं।',
  weather_caption: 'मौसम संदर्भ (Open-Meteo)। शांत हवा और कम तापमान अक्सर कमजोर फैलाव का कारण बनते हैं।',
  weather_unavailable: 'इस तारीख के लिए मौसम डेटा उपलब्ध नहीं है',
  wind_label: 'हवा',
  humidity_label: 'आर्द्रता',
  temp_label: 'तापमान',

  kpi_peak_title: 'अधिकतम पूर्वानुमान PM2.5',
  kpi_diwali_title: 'दिवाली दिवस पूर्वानुमान',
  kpi_cpcb_title: 'CPCB मानक',
  kpi_cpcb_exceedance: 'पूर्वानुमानित शिखर (10 नवंबर) पर 24-घंटे सीमा का 2.4 गुना',
  kpi_cpcb_subtext: 'CPCB 24-घंटे मानक: 60 µg/m³',
  kpi_mae_title: 'टेस्ट विंडो MAE',
  kpi_mae_subtext: 'µg/m³ (1-दिन की लीड पर)',
  kpi_mae_badge: 'बनाम सरल आधार 20.2',

  table_title: 'दैनिक पूर्वानुमान अनुसूची',
  table_subtitle: '13 दिन · 1 से 13 नवंबर 2026',
  table_col_date: 'तारीख',
  table_col_timeline: 'समयरेखा',
  table_col_pm25: 'PM2.5 (µg/m³)',
  table_col_cpcb: 'CPCB बैंड',
  table_col_epa: 'US EPA उप-सूचकांक',

  notif_optin_title: 'दैनिक पूर्वानुमान सूचनाएं चालू करें',
  notif_optin_desc: 'पटियाला स्टेशन दैनिक औसत PM2.5 पूर्वानुमान सुबह फ़ोन या ब्राउज़र पर पाएं।',
  notif_window_label: 'डिलीवरी समय:',
  notif_threshold_label: 'अलर्ट सीमा:',
  notif_threshold_any: 'कोई भी स्तर (डिफ़ॉल्ट)',
  notif_active_status: 'दैनिक पूर्वानुमान सूचनाएं सक्रिय हैं',
  notif_btn_disable: 'सूचनाएं बंद करें',
  notif_btn_enable: 'सूचनाएं चालू करें',

  compare_title: 'किन्हीं दो दिनों की तुलना करें',
  compare_desc: 'स्टेशन-मापे गए इतिहास, उपग्रह अनुमान और मॉडल पूर्वानुमान में से किन्हीं दो तारीखों की तुलना करें।',
  compare_day_1: 'पहला दिन:',
  compare_day_2: 'दूसरा दिन:',
  compare_diff_higher: '{other} से {diff} µg/m³ अधिक है',
  compare_diff_lower: '{other} से {diff} µg/m³ कम है',
  compare_diff_equal: '{other} के PM2.5 के बराबर है',

  print_report_title: 'दिवाली वायु गुणवत्ता पूर्वानुमान रिपोर्ट - पटियाला',
  generated_at: 'रिपोर्ट निर्माण तिथि',
  print_diwali_callout: 'दिवाली 2026 मुख्य पूर्वानुमान बिंदु',
  print_model_summary_title: 'मॉडल और मूल्यांकन सारांश',
  print_model_summary_body: 'आउटपुट मॉडल टाउन, पटियाला CPCB CAAQMS निगरानी स्टेशन (site_1437) के लिए दैनिक औसत PM2.5 सांद्रता (µg/m³) है। मॉडल LightGBM रिग्रेसर है जिसे 38,150 घंटेवार स्टेशन रीडिंग (2021-सितंबर 2025) के दैनिक औसत पर प्रशिक्षित किया गया है; रिफिट पूर्ण फ़ीचर वाली 1,461 दैनिक पंक्तियों (2021-01-01 से 2024-12-31) का उपयोग करता है, Open-Meteo मौसम, कैलेंडर और दिवाली-तक-दिन फ़ीचर के साथ। क्षमता तीन अलग रखी गई दिवाली अवधियों (2022-2024) पर मापी गई; लीड-मिलान स्कोर केवल 2024 अवधि के लिए हैं: 1-दिन की लीड पर MAE 17.5 µg/m³ (naive आधार 20.2)। 7-दिन की लीड पर मॉडल आधार से बेहतर नहीं है, इसलिए लंबी-लीड क्षमता अप्रमाणित है।',
  print_sources_title: 'डेटा स्रोत और आभार',
};

const dictionaries: Record<Language, Translations> = { en, hi };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: en,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('patiala_lang');
      return saved === 'hi' ? 'hi' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('patiala_lang', lang);
    } catch {
      /* ignore storage errors */
    }
  };

  const t = dictionaries[language] || en;

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
};

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext);
}
