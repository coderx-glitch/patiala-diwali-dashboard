import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Layers, MapPin, BookOpen, Clock, X, ExternalLink } from 'lucide-react';

interface MethodologySectionProps {
  isOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const MethodologySection: React.FC<MethodologySectionProps> = ({ isOpenModal, onCloseModal }) => {
  const [activeTab, setActiveTab] = useState<'station' | 'methodology' | 'dates' | 'limitations'>('station');

  const content = (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex border-b border-stone-200 text-xs font-medium space-x-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('station')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'station'
              ? 'border-amber-600 text-amber-900 font-semibold bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Station Truth (site_1437)
        </button>

        <button
          onClick={() => setActiveTab('methodology')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'methodology'
              ? 'border-amber-600 text-amber-900 font-semibold bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          LightGBM Pipeline & Skill
        </button>

        <button
          onClick={() => setActiveTab('dates')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'dates'
              ? 'border-amber-600 text-amber-900 font-semibold bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Data Windows & Sources
        </button>

        <button
          onClick={() => setActiveTab('limitations')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'limitations'
              ? 'border-amber-600 text-amber-900 font-semibold bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Limitations & Caveats
        </button>
      </div>

      {/* Tab 1: Station Truth */}
      {activeTab === 'station' && (
        <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-serif font-bold text-amber-950 text-sm">Station-Level Forecasting (No Invented Neighbourhood Precision)</h3>
              <p className="mt-1 text-stone-700">
                Forecasts daily mean PM2.5 concentration for the single CPCB government monitoring station in Patiala. Predictions are station-level (Model Town), not neighbourhood-exact.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">CAAQMS Station Identity</span>
              <ul className="mt-2 space-y-1.5 text-stone-700 font-mono text-[11px]">
                <li><strong className="text-stone-900 font-sans">Station:</strong> Model Town, Patiala - PPCB</li>
                <li><strong className="text-stone-900 font-sans">Station ID:</strong> site_1437 (CPCB CAAQMS compilation)</li>
                <li><strong className="text-stone-900 font-sans">Compilation Source:</strong> XKDR Forum India Air Quality Database</li>
                <li><strong className="text-stone-900 font-sans">License:</strong> Creative Commons CC-BY 4.0</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">Output Target & Units</span>
              <p className="mt-2 text-stone-700 text-[11px]">
                Output is daily mean PM2.5 concentration (<strong className="text-amber-800">µg/m³</strong>) with official CPCB breakpoint band labels (Good / Satisfactory / Moderate / Poor / Very Poor / Severe).
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-stone-600 text-[11px]">
                <li>Band label only; not a full National AQI code.</li>
                <li>Full National AQI requires min. 3 pollutants (one necessarily PM2.5/PM10) + 16-hr data minimum, per CPCB rules.</li>
                <li>Eliminates arbitrary synthetic code truncation.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Methodology */}
      {activeTab === 'methodology' && (
        <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
          <p>
            Model: LightGBM regressor trained on 38,150 hourly PM2.5 readings (2021 to Sep 2025) aggregated daily; the refit uses the 1,461 daily rows with complete features (2021-01-01 to 2024-12-31).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <h3 className="font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                Weather Features
              </h3>
              <p className="text-[11px] text-stone-600 font-mono">
                Open-Meteo Historical Forecast & Previous Runs: temperature_2m, relative_humidity_2m, precipitation, wind_speed_10m, surface_pressure, cloud_cover.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <h3 className="font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                Calendar & Festival Lag
              </h3>
              <p className="text-[11px] text-stone-600 font-mono">
                Day-of-year cyclic encoding (doy_sin, doy_cos), day-of-week (dow), explicit days_to_diwali (-30 to +30), and diwali_win flag (±3 days).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <h3 className="font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                No Pollution Lags
              </h3>
              <p className="text-[11px] text-stone-600">
                Multi-day forward prediction does not depend on auto-regressive pollution lags (avoids compounding error when generating multi-day forecasts).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-700 space-y-1">
            <div className="font-semibold text-stone-900 font-serif">Measured Skill on Held-Out Window (Oct 20 - Nov 10, 2024; 22 days):</div>
            <ul className="list-disc list-inside text-stone-600 space-y-0.5 font-mono">
              <li>Lead 1-day weather forecast: <strong>17.5 µg/m³ MAE</strong> (Diwali core Oct 28-Nov 3: 7.0 µg/m³)</li>
              <li>Lead 3-day weather forecast: <strong>19.7 µg/m³ MAE</strong> (Diwali core: 9.4 µg/m³)</li>
              <li>Retrospective reconstruction: <strong>17.2 µg/m³ MAE</strong> (Diwali core: 12.0 µg/m³)</li>
              <li>Naive climatology baseline: <strong>20.2 µg/m³ MAE</strong></li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-700 space-y-1.5">
            <div className="font-semibold text-stone-900 font-serif">Multi-Window Validation (3 held-out Diwali windows, 2022-2024):</div>
            <div className="text-stone-600">For each 22-day window, training rows precede the window and the baseline is computed from training rows only (the exact property checked). Baseline = day-of-year average (naive climatology). MAE in &micro;g/m&sup3;, lower is better.</div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[10.5px] border-collapse mt-1">
                <thead>
                  <tr className="text-stone-500 border-b border-stone-200">
                    <th className="text-left py-1 pr-2 font-semibold">Window</th>
                    <th className="text-right py-1 pr-2 font-semibold">Model (retro*)</th>
                    <th className="text-right py-1 pr-2 font-semibold">Baseline</th>
                    <th className="text-right py-1 font-semibold">Core Diwali&plusmn;3d (retro*)</th>
                  </tr>
                </thead>
                <tbody className="text-stone-700">
                  <tr className="border-b border-stone-100"><td className="py-1 pr-2">2022 (Oct 13 - Nov 3)</td><td className="text-right py-1 pr-2"><strong>11.6</strong></td><td className="text-right py-1 pr-2">27.1</td><td className="text-right py-1">15.2</td></tr>
                  <tr className="border-b border-stone-100"><td className="py-1 pr-2">2023 (Nov 1 - 22)</td><td className="text-right py-1 pr-2"><strong>18.8</strong></td><td className="text-right py-1 pr-2">24.7</td><td className="text-right py-1">26.9</td></tr>
                  <tr><td className="py-1 pr-2">2024 (Oct 20 - Nov 10)</td><td className="text-right py-1 pr-2"><strong>17.2</strong></td><td className="text-right py-1 pr-2">20.2</td><td className="text-right py-1">12.0</td></tr>
                </tbody>
              </table>
            </div>
            <div className="text-stone-500 text-[10px]">* retro = retrospective: weather inputs for those past dates come from a near-analysis archive, not forecasts issued in advance. Retrospective error is not deploy-time forecast accuracy.</div>
            <ul className="list-disc list-inside text-stone-600 space-y-0.5 pt-0.5">
              <li>Forecast-lead test (2024 window only): 1-day-ahead weather <strong>17.5</strong>, 3-day-ahead <strong>19.7</strong> (baseline 20.2). For 2022/2023 the archive checked (Open-Meteo Previous Runs) does not provide the needed weather variables before 2024.</li>
              <li>Tested weakness: the 2023 core Diwali window (26.9 retrospective) - the model underestimated that spike period.</li>
              <li>Same pipeline rerun on Amritsar (beats baseline all 3 windows) and Ludhiana (mixed; loses to baseline in 2024): accuracy varies by city.</li>
              <li>Three windows is broader evidence than one, but still limited; these are error measurements on past data, not a guarantee for 2026.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Source Dates */}
      {activeTab === 'dates' && (
        <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200">
            <h3 className="font-serif font-bold text-stone-900 text-sm mb-2.5">Model Lineage & Temporal Fit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 rounded-md bg-white border border-stone-200 font-mono text-[11px]">
                <div className="text-amber-800 font-sans font-semibold mb-1">Training Fit & Cutoff</div>
                <div><strong className="text-stone-900">Fit Days:</strong> 1,388 daily training rows</div>
                <div><strong className="text-stone-900">Span:</strong> 2021-01-01 to 2024-10-19</div>
                <div><strong className="text-stone-900">Asserted Split:</strong> train.index.max &lt; test.index.min</div>
                <div className="text-stone-500 text-[10px] mt-1 font-sans">Refit for 2026: complete daily rows 2021-01-01 to 2024-12-31 (station history runs to Sep 2025; rows with missing covariates are dropped)</div>
              </div>

              <div className="p-3 rounded-md bg-white border border-stone-200 font-mono text-[11px]">
                <div className="text-cyan-800 font-sans font-semibold mb-1">Held-Out Test Window</div>
                <div><strong className="text-stone-900">Window:</strong> 2024-10-20 to 2024-11-10</div>
                <div><strong className="text-stone-900">Test Days:</strong> 22 held-out days</div>
                <div><strong className="text-stone-900">Diwali 2024:</strong> 2024-10-31</div>
                <div><strong className="text-stone-900">Window Actuals:</strong> mean 84.4, max 121.6 µg/m³</div>
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-stone-200">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono mb-1.5">Primary Data Sources:</div>
              <ul className="space-y-1 text-[11px] text-stone-600">
                <li className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-amber-700" />
                  <a href="https://airquality.xkdr.org/" target="_blank" rel="noreferrer" className="text-amber-800 hover:underline">
                    https://airquality.xkdr.org/
                  </a>
                  <span>— CPCB CAAQMS via XKDR Forum India Air Quality Database (site_1437, CC-BY 4.0)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-amber-700" />
                  <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer" className="text-amber-800 hover:underline">
                    https://open-meteo.com/
                  </a>
                  <span>— Historical Forecast, Previous Runs & Live Forecast APIs (CC-BY 4.0)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-amber-700" />
                  <a href="https://airquality.cpcb.gov.in/ccr_docs/How_AQI_Calculated.pdf" target="_blank" rel="noreferrer" className="text-amber-800 hover:underline">
                    https://airquality.cpcb.gov.in/ccr_docs/How_AQI_Calculated.pdf
                  </a>
                  <span>— Official CPCB AQI Breakpoints</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Limitations */}
      {activeTab === 'limitations' && (
        <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
            <h3 className="font-bold text-stone-900 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              1. Single Monitoring Station
            </h3>
            <p className="text-[11px] text-stone-600">
              One CPCB station in Patiala (Model Town, site_1437). Predictions are station-level, not neighbourhood-exact.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
            <h3 className="font-bold text-stone-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
              2. Validation Scope
            </h3>
            <p className="text-[11px] text-stone-600">
              Skill is measured on three held-out Diwali windows (2022-2024); lead-matched scores exist for the 2024 window only. At 1-day lead the model beats the naive baseline there (17.5 vs 20.2), at 3-day it is close (19.7), and at 7-day lead it does NOT beat the baseline (21.5 vs 20.2): longer-lead skill is unproven. Errors measured on past data are not a guarantee for 2026.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
            <h3 className="font-bold text-stone-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              3. PM2.5 Focus vs Full AQI
            </h3>
            <p className="text-[11px] text-stone-600">
              PM2.5 concentration with official CPCB breakpoint band labels only. The official CPCB rule computes AQI only with data for minimum 3 pollutants, one necessarily PM2.5 or PM10, and 16+ hours of data; this app outputs PM2.5 only, so it does not compute an AQI.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
            <h3 className="font-bold text-stone-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              4. Open Dataset Temporal Horizon
            </h3>
            <p className="text-[11px] text-stone-600">
              Station data in the open dataset ends Sep 2025, while the refit uses the complete daily rows through 2024-12-31 (2025 rows lack PM10/NO2 covariates and are dropped; those are not model features). Live comparison during Diwali week depends on the station still reporting.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (isOpenModal !== undefined) {
    if (!isOpenModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
        <div className="bg-white border border-stone-200 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-[#faf8f5]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-700" />
              <h2 className="font-serif font-bold text-stone-900 text-base">Methodology, Data Lineage & Limitations</h2>
            </div>
            <button
              onClick={onCloseModal}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-stone-200 p-5 shadow-xs">
      <div className="pb-3 mb-3 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-700" />
            Methodology, Lineage & Limitations
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            LightGBM training on CPCB CAAQMS site_1437 history + Open-Meteo weather features.
          </p>
        </div>
      </div>
      {content}
    </div>
  );
};
