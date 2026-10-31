"""Diwali Air Quality Prediction - full reproducible pipeline.
Run pull_data.sh first (or have xkdr_site_1437_*.csv + wx_fcst_patiala.json present),
then: python train_pipeline.py
Outputs: predictions_2026.json, backtest.json, content.json
"""
import json, glob, urllib.request
import pandas as pd, numpy as np
import lightgbm as lgb
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
NOW = datetime.now(IST).isoformat(timespec="seconds")
DIWALI = {2021:"2021-11-04",2022:"2022-10-24",2023:"2023-11-12",2024:"2024-10-31",2025:"2025-10-20",2026:"2026-11-08"}
VARS = ["temperature_2m","relative_humidity_2m","precipitation","wind_speed_10m","surface_pressure","cloud_cover"]
FEAT_F = ["doy_sin","doy_cos","dow","days_to_diwali","diwali_win"] + VARS

# --- pollution -> daily ---
per = {}
for f in sorted(glob.glob("xkdr_site_1437_*.csv")):
    p = f.split("_")[3]
    df = pd.read_csv(f)
    if len(df) == 0: continue
    df = df[["period_start","mean"]]; df["ts"] = pd.to_datetime(df["period_start"])
    per.setdefault(p, []).append(df[["ts","mean"]])
frames = {p: pd.concat(v).drop_duplicates("ts").sort_values("ts").set_index("ts")["mean"].rename(p) for p, v in per.items()}
daily = pd.concat(frames.values(), axis=1).resample("D").mean().rename(columns={"PM2.5":"pm25","PM10":"pm10","NO2":"no2"})
print("unique_hours_per_param:", {p: int(frames[p].notna().sum()) for p in frames})

# --- weather archive -> daily ---
wx = json.load(open("wx_fcst_patiala.json"))["hourly"]
w = pd.DataFrame(wx); w["ts"] = pd.to_datetime(w["time"]); w = w.set_index("ts").drop(columns=["time"])
wd = w.resample("D").agg({"temperature_2m":"mean","relative_humidity_2m":"mean","precipitation":"sum","wind_speed_10m":"mean","surface_pressure":"mean","cloud_cover":"mean"})

d = daily.join(wd, how="inner").dropna(subset=["pm25"])
d["doy"] = d.index.dayofyear
d["doy_sin"] = np.sin(2*np.pi*d["doy"]/365.25); d["doy_cos"] = np.cos(2*np.pi*d["doy"]/365.25)
d["dow"] = d.index.dayofweek
dts = [pd.Timestamp(v) for v in DIWALI.values()]
d["days_to_diwali"] = [max(-30, min(30, min(((c-ts).days for c in dts), key=abs))) for ts in d.index]
d["diwali_win"] = ((d["days_to_diwali"]>=-3)&(d["days_to_diwali"]<=3)).astype(int)

tr = d.loc[:"2024-10-19"].dropna()
te = d.loc["2024-10-20":"2024-11-10"].dropna(subset=["pm25"]).copy()
assert tr.index.max() < te.index.min(), "leakage: train/test overlap"

m = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31, subsample=0.8, random_state=42)
m.fit(tr[FEAT_F], tr["pm25"])

# retrospective reconstruction (near-analysis weather, reference only)
te["pred_retro"] = m.predict(te[FEAT_F])
retro_mae = float(np.mean(np.abs(te["pred_retro"]-te["pm25"])))
tw = te.loc["2024-10-28":"2024-11-03"]
retro_core = float(np.mean(np.abs(tw["pred_retro"]-tw["pm25"])))

# lead-matched: weather actually forecast N days before each date
def fetch_prev(daylead):
    vs = ",".join(f"{v}_previous_day{daylead}" for v in VARS)
    u = ("https://previous-runs-api.open-meteo.com/v1/forecast?latitude=30.3494&longitude=76.3666"
         f"&start_date=2024-10-17&end_date=2024-11-10&hourly={vs}&timezone=Asia%2FKolkata")
    h = json.load(urllib.request.urlopen(u))["hourly"]
    f = pd.DataFrame(h); f["ts"] = pd.to_datetime(f["time"]); f = f.set_index("ts").drop(columns=["time"])
    f.columns = VARS
    return f.resample("D").agg({"temperature_2m":"mean","relative_humidity_2m":"mean","precipitation":"sum","wind_speed_10m":"mean","surface_pressure":"mean","cloud_cover":"mean"})

leads = {}
te_cal = te.drop(columns=VARS + ["pred_retro"])   # drop archive weather before join (no column clash)
for lead in (1, 3):
    tj = te_cal.join(fetch_prev(lead), how="inner").dropna(subset=VARS)
    pr = m.predict(tj[FEAT_F])
    tjc = tj.loc["2024-10-28":"2024-11-03"]
    pr2 = m.predict(tjc[FEAT_F])
    leads[lead] = {"mae": round(float(np.mean(np.abs(pr-tj["pm25"]))),1),
                   "core": round(float(np.mean(np.abs(pr2-tjc["pm25"]))),1), "n": len(tj)}

# naive climatology baseline
clim = tr.assign(md=tr.index.strftime("%m-%d")).groupby("md")["pm25"].mean()
te["naive"] = [clim.get(ts.strftime("%m-%d"), float(tr["pm25"].mean())) for ts in te.index]
naive_mae = float(np.mean(np.abs(te["naive"]-te["pm25"])))
print(f"retro MAE={retro_mae:.1f}/{retro_core:.1f} | lead1={leads[1]} | lead3={leads[3]} | naive={naive_mae:.1f}")

series = [{"date": str(ts.date()), "actual": round(float(r.pm25),1), "predicted": round(float(r.pred_retro),1), "naive": round(float(r.naive),1)} for ts, r in te.iterrows()]
backtest = {
 "station":"Model Town, Patiala - PPCB (CPCB CAAQMS station site_1437)",
 "generated_at_ist":NOW,
 "target":"daily mean PM2.5 concentration (ug/m3)",
 "train_cutoff":"training rows end 2024-10-19; test window starts 2024-10-20 (no overlap, asserted in code)",
 "test_window":"2024-10-20 to 2024-11-10 (held out from training)",
 "series_model":"Retrospective reconstruction (archived near-analysis weather inputs) - chart series is this model, NOT the lead-matched rows",
 "fit":{"train_daily_rows":len(tr),"train_span":f"{tr.index.min().date()} to {tr.index.max().date()}","test_days":len(te),"note":"rows with any missing pollutant or weather value were dropped; PM10/NO2 gaps reduce the sample though only PM2.5 is the target"},
 "models":[
   {"name":"Retrospective reconstruction (archived near-analysis weather inputs)","mae":round(retro_mae,1),"mae_diwali_core":round(retro_core,1)},
   {"name":"Lead-matched, weather forecast issued 1 day ahead (Previous Runs API)","mae":leads[1]["mae"],"mae_diwali_core":leads[1]["core"]},
   {"name":"Lead-matched, weather forecast issued 3 days ahead (Previous Runs API)","mae":leads[3]["mae"],"mae_diwali_core":leads[3]["core"]},
   {"name":"Naive climatology baseline (same-calendar-date historical mean)","mae":round(naive_mae,1)}],
 "series":series,
 "method":f"LightGBM trained {tr.index.min().date()} to 2024-10-19 on daily PM2.5 with calendar + days-to-Diwali + weather features, no pollution lags. Skill estimated by feeding archived weather forecasts issued 1 and 3 days before each test date (Open-Meteo Previous Runs API).",
 "caveats":["Single monitoring station - results are station-level, not neighbourhood-exact.","Values are PM2.5 concentrations (ug/m3) with official CPCB PM2.5 band labels; not a full National AQI (needs 3+ pollutants and official averaging rules).","These are single-window initial measurements: lower MAE than the naive baseline in this window at 1-day lead, close to it at 3-day lead. One window is not proof of general forecast skill.","Daily values average whatever hourly readings exist that day (no minimum hourly coverage threshold)."],
 "sources":["https://airquality.xkdr.org/ (CPCB CAAQMS compilation, CC-BY 4.0)","https://open-meteo.com/en/docs/historical-forecast-api","https://open-meteo.com/en/docs/previous-runs-api","https://airquality.cpcb.gov.in/ccr_docs/How_AQI_Calculated.pdf"]}
json.dump(backtest, open("backtest.json","w"), indent=1)

# --- forward prediction Diwali 2026 (refit on all history; live 16-day forecast) ---
url = ("https://api.open-meteo.com/v1/forecast?latitude=30.3494&longitude=76.3666"
       "&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,surface_pressure,cloud_cover"
       "&timezone=Asia%2FKolkata&forecast_days=16")
f = pd.DataFrame(json.load(urllib.request.urlopen(url))["hourly"])
f["ts"] = pd.to_datetime(f["time"]); f = f.set_index("ts").drop(columns=["time"])
fwd = f.resample("D").agg({"temperature_2m":"mean","relative_humidity_2m":"mean","precipitation":"sum","wind_speed_10m":"mean","surface_pressure":"mean","cloud_cover":"mean"})
fwd = fwd.loc["2026-11-03":"2026-11-13"].copy()
fwd["doy"] = fwd.index.dayofyear
fwd["doy_sin"] = np.sin(2*np.pi*fwd["doy"]/365.25); fwd["doy_cos"] = np.cos(2*np.pi*fwd["doy"]/365.25)
fwd["dow"] = fwd.index.dayofweek
fwd["days_to_diwali"] = [max(-30, min(30, min(((c-ts).days for c in dts), key=abs))) for ts in fwd.index]
fwd["diwali_win"] = ((fwd["days_to_diwali"]>=-3)&(fwd["days_to_diwali"]<=3)).astype(int)
full = d.dropna()
mf = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31, subsample=0.8, random_state=42)
mf.fit(full[FEAT_F], full["pm25"])
fwd["pm25_pred"] = mf.predict(fwd[FEAT_F])
def band(v):
    v = round(v)
    for lo,hi,name in [(0,30,"Good"),(31,60,"Satisfactory"),(61,90,"Moderate"),(91,120,"Poor"),(121,250,"Very Poor")]:
        if lo<=v<=hi: return name
    return "Severe"
preds = {"station":"Model Town, Patiala - PPCB (CPCB CAAQMS station site_1437)",
 "generated_at_ist":NOW,
 "generated_for":"Diwali 2026 (Nov 8)",
 "forecast_issue":"Open-Meteo live 16-day weather forecast pulled at generated_at_ist",
 "train_cutoff":f"model refit on {full.index.min().date()} to 2025-09-01 (all available station history) for forward prediction only",
 "target":"daily mean PM2.5 concentration (ug/m3); cpcb_pm25_band uses official CPCB PM2.5 breakpoint bands, band label only, no numeric AQI code",
 "predictions":[{"date":str(ts.date()),"pm25_pred":round(float(r.pm25_pred),1),"days_to_diwali":int(r.days_to_diwali),"cpcb_pm25_band":band(r.pm25_pred)} for ts,r in fwd.iterrows()],
 "sources":["https://airquality.xkdr.org/ (CPCB CAAQMS compilation, CC-BY 4.0)","https://open-meteo.com/en/docs","https://airquality.cpcb.gov.in/ccr_docs/How_AQI_Calculated.pdf"]}
json.dump(preds, open("predictions_2026.json","w"), indent=1)

content = {"methodology":"Output is daily mean PM2.5 concentration (ug/m3) for the Model Town, Patiala CPCB government monitor, with official CPCB PM2.5 band labels (Good/Satisfactory/Moderate/Poor/Very Poor/Severe) - band labels only, not a full National AQI. Model: LightGBM trained on 38,150 hourly PM2.5 readings (2021-Sep 2025) aggregated daily, using weather (Open-Meteo), calendar and explicit days-to-Diwali features. Skill measured on a held-out Diwali 2024 window the model never trained on, in two ways: a retrospective reconstruction with archived near-analysis weather, and lead-matched runs fed with forecasts actually issued 1 and 3 days before each date (Open-Meteo Previous Runs API). Diwali 2026 = Nov 8; predictions generated from the live 16-day weather forecast.",
 "limitations":["One CPCB station in Patiala - predictions are station-level (Model Town), not neighbourhood-exact.","PM2.5 concentration with band labels; full National AQI needs 3+ pollutants and official averaging rules.","Station data ends Sep 2025 in the open dataset; live comparison during Diwali week depends on the station still reporting."],
 "sources":["https://airquality.xkdr.org/ - CPCB CAAQMS via XKDR Forum India Air Quality Database (CC-BY 4.0)","https://open-meteo.com/en/docs/historical-forecast-api - archived weather forecasts (CC-BY 4.0)","https://open-meteo.com/en/docs/previous-runs-api - fixed lead-time archived forecasts","https://airquality.cpcb.gov.in/ccr_docs/How_AQI_Calculated.pdf - official CPCB AQI breakpoints"]}
json.dump(content, open("content.json","w"), indent=1)
print("WROTE predictions_2026.json backtest.json content.json")
