import data from '../public/data/predictions.json' with { type: 'json' };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  const { date, from, to } = req.query || {};
  let rows = data.predictions;
  if (date) {
    rows = rows.filter((r) => r.date === date);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'no prediction for this date', available_dates: data.predictions.map((r) => r.date) });
    }
  } else {
    if (from) rows = rows.filter((r) => r.date >= from);
    if (to) rows = rows.filter((r) => r.date <= to);
  }
  res.status(200).json({
    ...data,
    scope: 'station-level daily mean PM2.5 forecast (not full AQI, not neighbourhood-level)',
    count: rows.length,
    predictions: rows,
  });
}
