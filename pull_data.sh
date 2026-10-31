#!/bin/bash
# STEP 1 - CPCB hourly pollution via XKDR (CC-BY 4.0). Demo key works up to 10k rows/query;
# get a free key at https://airquality.xkdr.org for unlimited.
KEY="aqi_demo_wbf92Qx21zX-Wa_Tg8Dx1nXe"
for Y in 2021 2022 2023 2024 2025; do
  END="${Y}-12-31"; [ "$Y" = "2025" ] && END="2025-09-01"
  for P in "PM2.5" "PM10" "NO2"; do
    curl -s -H "Authorization: Bearer $KEY" \
      "https://airquality.xkdr.org/v1/measurements?station=site_1437&parameter=${P}&start=${Y}-01-01&end=${END}&agg=hourly&format=csv" -o "xkdr_site_1437_${P}_${Y}.csv" &
  done; wait
done
# STEP 2 - archived weather forecasts (Open-Meteo Historical Forecast API, CC-BY 4.0, no key)
curl -s "https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=30.3494&longitude=76.3666&start_date=2021-01-01&end_date=2025-09-01&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover&timezone=Asia%2FKolkata" -o wx_fcst_patiala.json
