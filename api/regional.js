import vals from '../public/data/map_values.json' with { type: 'json' };
import meta from '../public/data/map_meta.json' with { type: 'json' };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  const { date } = req.query || {};
  const i = date ? vals.dates.indexOf(date) : vals.dates.indexOf('2025-10-20');
  if (i < 0) {
    return res.status(404).json({ error: 'no regional estimates for this date', available_dates: vals.dates });
  }
  res.status(200).json({
    source: 'CREA South Asia PM2.5 map: India (reimplementation of Kawano et al. 2025), Zenodo 10.5281/zenodo.21486735',
    scope: 'satellite-estimated daily PM2.5 on a 10-km grid, historical archive Aug 2018 - May 2026; regional, not neighbourhood-level, not a 2026 forecast',
    unit: 'ug/m3',
    date: vals.dates[i],
    grid: { rows: 15, cols: 15, cell_km: 10, center_cell: [meta.R, meta.R], station_lon: meta.station.lon, station_lat: meta.station.lat },
    available_dates: vals.dates,
    values: vals.values[i].map((row) => row.map((v) => Math.round(v * 10) / 10)),
  });
}
