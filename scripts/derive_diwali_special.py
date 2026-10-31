"""Derive public/data/diwali_special.json from REAL data only.

Inputs:
  - Repo artifacts: predictions_2026.json, backtest.json, map_values/grid/meta.json, train_pipeline.py
  - Data pack (technical worker, 2026-11-01): xkdr_site_1437_PM2.5_2021..2025.csv (hourly, naive IST),
    holidays.json (pipeline Diwali dates + 2026 festival days)
Conventions (verified against production data, not docs):
  - days_to_diwali in shipped predictions: +N = N days BEFORE Diwali (Nov 1 2026 = 7). rel_day here flips: 0=Diwali, -=before, +=after.
  - Daily means: calendar-day (IST) mean of hourly 'mean' values, per production resample("D").mean(); no coverage threshold.
Counts: CSVs contain 38,150 data rows total (verified 2026-11-01); pack SCHEMA's "38,155" = data rows + 5 header lines. Site's existing "38,150" wording is correct; no new count published here.
"""
import csv, json, re, sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
PACK = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT.parent / "datapack"
REL_MIN, REL_MAX = -7, 5

HOL = json.loads((PACK / "holidays.json").read_text())
DIWALI = {int(y): date.fromisoformat(d) for y, d in HOL["diwali_dates"].items()}
assert DIWALI[2026] == date(2026, 11, 8)
rel = lambda d, y: (d - DIWALI[y]).days

# ---- hourly archive -> daily means + hourly pattern (2021-2024; 2025 has no Diwali in archive)
daily = {}            # date -> sum,count
diwali_hour = {}      # hour -> sum,count over the 4 Diwali DAYS
season_hour = {}      # hour -> sum,count over all Oct 15-Nov 15 days 2021-2024
rows_total = 0
for y in (2021, 2022, 2023, 2024):
    fp = PACK / f"xkdr_site_1437_PM2.5_{y}.csv"
    with open(fp) as f:
        for r in csv.DictReader(f):
            rows_total += 1
            ts = datetime.strptime(r["period_start"], "%Y-%m-%d %H:%M:%S")
            v = float(r["mean"])
            d, h = ts.date(), ts.hour
            s, c = daily.get(d, (0.0, 0)); daily[d] = (s + v, c + 1)
            if d == DIWALI[y]:
                s, c = diwali_hour.get(h, (0.0, 0)); diwali_hour[h] = (s + v, c + 1)
            if (d.month == 10 and d.day >= 15) or (d.month == 11 and d.day <= 15):
                s, c = season_hour.get(h, (0.0, 0)); season_hour[h] = (s + v, c + 1)
print("hourly data rows 2021-2024 used:", rows_total)
assert len(diwali_hour) == 24 and len(season_hour) == 24, "hour coverage incomplete"

def series_from_daily(y):
    pts = []
    for dd, (s, c) in sorted(daily.items()):
        r = rel(dd, y)
        if REL_MIN <= r <= REL_MAX and dd.year == y:
            pts.append({"rel_day": r, "pm25": round(s / c, 1), "n_hours": c})
    return pts

years = []
for y in (2021, 2022, 2023, 2024):
    pts = series_from_daily(y)
    assert any(p["rel_day"] == 0 for p in pts), f"{y} missing Diwali day"
    years.append({"year": y, "kind": "station_actual",
                  "label": f"{y} actual - Model Town station (CPCB)",
                  "note": "Measured station daily mean PM2.5 (IST calendar days, hourly archive).",
                  "points": pts})
    print(y, "window pts:", len(pts), "| Diwali day:", [p["pm25"] for p in pts if p["rel_day"] == 0][0])

# cross-check aggregation against the shipped 2024 backtest actuals
bt = json.loads((ROOT / "public/data/backtest.json").read_text())
mism = [(s["date"], s["actual"], round(sum(0 for _ in []) or 0, 1)) for s in []]  # placeholder
bad = []
for s in bt["series"]:
    d = date.fromisoformat(s["date"])
    if d in daily:
        mine = round(daily[d][0] / daily[d][1], 1)
        if abs(mine - s["actual"]) > 0.15:
            bad.append((s["date"], s["actual"], mine))
print("2024 cross-check vs backtest actuals: mismatches >0.15 ->", bad if bad else "NONE (aggregation matches production)")
assert not bad

# ---- 2025 CREA station-cell + 2026 forecast (unchanged logic)
meta = json.loads((ROOT / "public/data/map_meta.json").read_text())
vals = json.loads((ROOT / "public/data/map_values.json").read_text())
R = meta["R"]
s2025 = [{"rel_day": rel(date.fromisoformat(ds), 2025), "pm25": round(float(vals["values"][i][R][R]), 1)}
         for i, ds in enumerate(vals["dates"]) if REL_MIN <= rel(date.fromisoformat(ds), 2025) <= REL_MAX]
s2025.sort(key=lambda x: x["rel_day"])
years.append({"year": 2025, "kind": "regional_estimate",
              "label": "2025 satellite estimate - CREA 10-km cell",
              "note": "Satellite-modelled PM2.5 for the 10-km grid cell containing the station (CREA). NOT a station measurement; the cell is anchored to this monitor, so agreement with the station is not independent validation. Coverage starts D-5 (dataset begins Oct 15, 2025). Station archive ended Sep 1, 2025, so no measured 2025 Diwali values exist.",
              "points": s2025})

pred = json.loads((ROOT / "public/data/predictions_2026.json").read_text())
journey, s2026 = [], []
for p in pred["predictions"]:
    d = date.fromisoformat(p["date"])
    r = -p["days_to_diwali"]
    assert r == rel(d, 2026)
    journey.append({"date": p["date"], "weekday": d.strftime("%A"), "rel_day": r,
                    "pm25": p["pm25_pred"], "band": p.get("cpcb_pm25_band")})
    s2026.append({"rel_day": r, "pm25": p["pm25_pred"]})
assert len(journey) == 13 and journey[7]["pm25"] == 119.8 and journey[7]["band"] == "Poor"
years.append({"year": 2026, "kind": "forecast",
              "label": "2026 forecast - this dashboard's model",
              "note": "Model forecast, not measurements.",
              "points": s2026})

# ---- 2026 festival labels from pipeline pack (authoritative; Govardhan not included there)
FMAP = {"dhanteras": "Dhanteras", "choti_diwali": "Chhoti Diwali", "diwali": "Diwali", "bhai_dooj": "Bhai Dooj"}
FESTIVALS = []
for k, ds in HOL["festival_days_2026"].items():
    d = date.fromisoformat(ds)
    FESTIVALS.append({"date": ds, "rel_day": rel(d, 2026), "name": FMAP[k]})
FESTIVALS.sort(key=lambda x: x["rel_day"])
fest_by_rel = {f["rel_day"]: f["name"] for f in FESTIVALS}
for row in journey:
    row["festival"] = fest_by_rel.get(row["rel_day"])
print("festivals:", [(f["date"], f["name"], f["rel_day"]) for f in FESTIVALS])

hourly_pattern = {
    "years_used": [2021, 2022, 2023, 2024],
    "diwali_dates_used": [str(DIWALI[y]) for y in (2021, 2022, 2023, 2024)],
    "hour_axis": "IST hour of day (0-23), station local time",
    "diwali_days_avg": [{"hour": h, "pm25": round(diwali_hour[h][0] / diwali_hour[h][1], 1), "n_hours": diwali_hour[h][1]} for h in range(24)],
    "season_avg": [{"hour": h, "pm25": round(season_hour[h][0] / season_hour[h][1], 1), "n_hours": season_hour[h][1]} for h in range(24)],
    "season_definition": "all days Oct 15 - Nov 15, 2021-2024",
    "note": "Historical pattern only - NOT an hourly forecast for 2026. Past evening spikes coincided with Diwali nights; this is co-occurrence in past data, not proof of cause. 2025 excluded: station archive ends Sep 1, 2025.",
}

out = {
    "station": pred["station"],
    "generated_at_ist": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(timespec="seconds"),
    "generated_by": "scripts/derive_diwali_special.py from repo artifacts + hourly data pack only",
    "diwali_dates_used": HOL["diwali_dates"],
    "festivals_2026": FESTIVALS,
    "journey_2026": journey,
    "comparison": {"rel_window": [REL_MIN, REL_MAX],
                   "rel_day_meaning": "0 = Diwali day, negative = days before, positive = days after",
                   "years": years},
    "hourly_pattern": hourly_pattern,
    "evidence_note": "2026 values are model forecasts. Skill was measured on three held-out Diwali windows (2022-2024). A separate 7-day-lead test exists for the 2024 window only, and there the model did NOT beat the naive baseline - so longer-lead skill is unproven. Past errors are not a guarantee for 2026. Full validation tables: Model & Method tab.",
    "caveats": [
        "Station-level only (Model Town, Patiala CPCB site_1437) - not neighbourhood-exact.",
        "PM2.5 concentration (ug/m3) with CPCB band labels; not a full National AQI.",
        "2025 comparison series is a satellite-modelled regional estimate (CREA 10-km cell), not a station measurement.",
        "Daily values average whatever hourly readings exist that day (no minimum hourly coverage threshold).",
        "Past-year festival labels show the main Diwali day only; sub-festival dates for 2021-2025 are not verified.",
    ],
    "sources": pred.get("sources", []) + [
        "https://ncap.energyandcleanair.org/ (CREA satellite estimates)",
        "https://www.ndtvprofit.com/india/november-2026-festival-calendar-check-dhanteras-diwali-bhai-dooj-dates-12262703 (festival calendar 2026, fetched 2026-11-01)",
    ],
}
dest = ROOT / "public/data/diwali_special.json"
dest.write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
print("wrote", dest, f"({dest.stat().st_size} bytes)")
pk = max(hourly_pattern["diwali_days_avg"], key=lambda x: x["pm25"])
print("Diwali-day avg peak hour:", pk, "| seasonal avg same hour:", [x["pm25"] for x in hourly_pattern["season_avg"] if x["hour"] == pk["hour"]][0])
