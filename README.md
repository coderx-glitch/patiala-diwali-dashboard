# Diwali Air Quality Prediction - Patiala

Root Access Hackathon 2026 - Problem statement: AI-Powered Diwali Air Quality Prediction.
Predict air pollution before, during and after Diwali using historical air-quality
data, weather conditions and environmental indicators.

## What this project does

Forecasts daily PM2.5 concentration for the Model Town, Patiala CPCB government
monitoring station for Diwali 2026 week (Nov 1-13; Diwali = Nov 8), with official
CPCB PM2.5 band labels (Good / Satisfactory / Moderate / Poor / Very Poor / Severe).
Output is PM2.5 concentration (ug/m3) with band labels - not a full National AQI
(that needs min. 3 pollutants - one necessarily PM2.5 or PM10 - and 16+ hours of data, per official CPCB rules).

## Current status (initial experiments, reproducible)

- Data pipeline built and run: 38,150 hourly PM2.5 readings (2021 - Sep 2025)
  from the actual Patiala CPCB station, plus archived weather for the same period.
- Model trained (LightGBM, daily PM2.5, weather + calendar + days-to-Diwali
  features, no pollution lags).
- Held-out test on the Diwali 2024 window (training strictly before 2024-10-20,
  split asserted in code), including runs fed with weather forecasts genuinely
  issued 1 and 3 days ahead (Open-Meteo Previous Runs API).
- First predictions for the real Diwali 2026 week generated from the live
  16-day weather forecast: Poor band on Diwali day (Nov 8), Very Poor Nov 9-12.
- Dashboard app built (Vite + React) rendering these artifacts in a clean 4-tab layout;
  see Dashboard app section.

## Dashboard app (built, Vite + React)

The dashboard is structured into a streamlined 4-tab layout using the B "Editorial Light" aesthetic (warm ivory `#faf8f5` background, readable serif headings, white cards, restrained saffron accents):

- **"Forecast" (default):** A simple day picker (Nov 1-13, 2026; Diwali Nov 8 pre-selected; Nov 10 marked as the peak day) and ONE big answer for the selected day: predicted PM2.5 concentration, CPCB band pill, days-before/after Diwali, health advisory, and station-level truth footnote. Below it, the compact 4-stat row displays Peak Forecast, Diwali Day Forecast, CPCB Standard Exceedance (2.4x the 24-hr limit at predicted peak), and Held-Out Test MAE.
- **"Graph":** The full 13-day forecast curve chart with CPCB 24-hr standard (60 ug/m³), WHO guideline (15 ug/m³), and Diwali D0 reference line.
- **"Daily list":** The full daily 13-day forecast table with sortable columns, timeline offsets, and expandable health advisories.
- **"Model & Method":** The retrospective backtest chart, model skill summary cards, and comprehensive methodology, lineage, and limitations tabs.

The dashboard in this repo is a thin reader over the pipeline's JSON artifacts in `public/data/` (`predictions.json`, `backtest.json`, `content.json`) - no numbers are hardcoded in UI code. Includes interactive client-side JSON ingestion (`Ingest JSON`), a strict zero-fake-numbers pending state (`Test Pending`), and a persistent one-line station-level truth banner under the header across all tabs.

To run it:

    npm install
    npm run dev      # local dev server
    npm run build    # production build to dist/

## Backtest (one held-out window: Oct 20 - Nov 10, 2024; 22 days)

| Model | Window MAE (ug/m3) | Diwali core (Oct 28-Nov 3) |
| --- | --- | --- |
| This model, weather forecast issued 1 day ahead | 17.5 | 7.0 |
| This model, weather forecast issued 3 days ahead | 19.7 | 9.4 |
| Retrospective reconstruction (near-analysis weather, reference only) | 17.2 | 12.0 |
| Naive baseline (same-calendar-date historical mean) | 20.2 | - |

Fit: 1,388 daily training rows (2021-01-01 to 2024-10-19). Window actuals:
mean 84.4, max 121.6 ug/m3.
These are single-window initial measurements: the model's MAE is lower than the
naive baseline in this window at 1-day lead and close to it at 3-day lead. One
window is not proof of general forecast skill; more windows and 7-day leads are
planned before we make stronger claims.

## Validation

Held-out error (MAE, ug/m3, lower better) on three 22-day Diwali windows (training rows precede each window; baseline = day-of-year average from training rows):
- 2022 (Oct 13-Nov 3): model 11.6 (retrospective) vs baseline 27.1; core Diwali+-3d 15.2
- 2023 (Nov 1-22): model 18.8 (retrospective) vs baseline 24.7; core Diwali+-3d 26.9 (weakest)
- 2024 (Oct 20-Nov 10): model 17.2 (retrospective; core 12.0) vs baseline 20.2
Forecast-lead (2024 only): 1-day-ahead 17.5, 3-day-ahead 19.7 (baseline 20.2).
"Retrospective" = evaluated with archived near-analysis weather, not advance forecasts; retrospective error is not deploy-time forecast accuracy. Lead scores exist for 2024 only because the checked weather-forecast archive (Open-Meteo Previous Runs) does not provide the needed variables before 2024. These are error measurements on past data, not a guarantee for 2026.
Pipeline replication: same code rerun on Amritsar (beats baseline all 3 windows) and Ludhiana (mixed; loses to baseline in 2024) - accuracy varies by city.

## Known limitations

- One CPCB station in Patiala: predictions are station-level (Model Town),
  not neighbourhood-exact.
- PM2.5 only; full National AQI needs min. 3 pollutants (one necessarily PM2.5/PM10) and 16+ hrs of data.
- Daily values average whatever hourly readings exist that day (no minimum
  hourly coverage threshold); rows with missing values are dropped from training.
- Station data ends Sep 2025 in the open dataset; live comparison during Diwali
  week depends on the station still reporting.

## Data sources (all free, attribution required)

- CPCB CAAQMS monitor data via XKDR Forum India Air Quality Database (CC-BY 4.0)
  https://airquality.xkdr.org/ - station site_1437, Model Town, Patiala
- Open-Meteo Historical Forecast + Previous Runs + Forecast APIs (CC-BY 4.0)
  https://open-meteo.com/
- Official CPCB AQI breakpoints:
  https://airquality.cpcb.gov.in/ccr_docs/How_AQI_Calculated.pdf
- CREA 10-km satellite-estimated PM2.5 grid (Map tab), reimplementation of
  Kawano et al. 2025; Aug 2018 - May 2026 archive.
- 3D building footprints (Map tab): VIDA combined dataset (Google Open
  Buildings V3 CC-BY-4.0, Microsoft GlobalML CDLA-Permissive-2.0, OSM ODbL)
  via https://data.source.coop/vida/google-microsoft-osm-open-buildings/ -
  confidence >= 0.82, area >= 20 m2, city core. Uniform 8m height is
  illustrative, not measured.
- Satellite basemap (Map tab "Satellite" toggle): EOxCloudless
  Sentinel-2 cloudless 2024 by EOX IT Services GmbH (Contains modified
  Copernicus Sentinel data 2024), CC BY-NC-SA 4.0.
  Owning source / license: https://cloudless.eox.at/license-non-commercial
  ("free to use for non-commercial purposes, provided appropriate
  attribution is given"). Tiles: https://tiles.maps.eox.at/wmts/1.0.0/
  s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg (keyless public endpoint).
  SCOPE NOTE: non-commercial use only - any future commercial use of this
  site requires re-evaluation and likely a paid EOX license. Esri World
  Imagery was rejected: its ArcGIS Online TOU FAQ requires Esri software or
  a paid ArcGIS Online subscription for use in non-Esri apps.

## Roadmap

- Round 2: extend the built dashboard - live current-AQI comparison during
  Diwali week, more backtest windows, 7-day leads, PM10 + NO2 toward full AQI.
- Round 3: live demo - prediction vs actuals, judge Q&A on method and limitations.

## Reproduce

Needs Python 3.10+ and bash (on Windows: Git Bash).

    pip install pandas lightgbm scikit-learn
    bash pull_data.sh        # downloads all data (free, no paid keys)
    python train_pipeline.py # trains, backtests, writes the JSON artifacts

Outputs: predictions_2026.json, backtest.json, content.json. The pull script uses
the XKDR demo tier (10k rows/query); a free key from https://airquality.xkdr.org
removes the cap.

## Backend API (Round 2)

Serverless read API (Vercel Functions) serving the model-generated artifacts; the React UI is API-first with a static-JSON fallback. No on-request inference.

- `GET /api/forecast?date=2026-11-08` (or `?from=&to=`) - 13-day station forecast (Nov 1-13, 2026)
- `GET /api/backtest` - held-out validation metrics
- `GET /api/regional?date=2025-10-20` - CREA 10-km regional satellite grid, 2025 archive dates
- `GET /api/health` - liveness
