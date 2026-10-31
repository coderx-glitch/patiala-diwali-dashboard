import { list, get, put, del } from '@vercel/blob';
import webpush from 'web-push';
import data from '../public/data/predictions.json' with { type: 'json' };

const BANDS = { Good: 'Good', Satisfactory: 'Satisfactory', Moderate: 'Moderate', Poor: 'Poor', 'Very Poor': 'Very Poor', Severe: 'Severe' };
const SITE = 'https://patiala-diwali-dashboard.vercel.app';

export default async function handler(req, res) {
  // Auth: Vercel Cron sends Authorization: Bearer $CRON_SECRET when the env var is set.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
  }

  const nowIST = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = nowIST.slice(0, 10); // YYYY-MM-DD in IST
  const row = (data.predictions || []).find((p) => p.date === today);
  if (!row) {
    return res.status(200).json({ sent: 0, reason: `no forecast for ${today} (window ${data.predictions[0].date} to ${data.predictions[data.predictions.length - 1].date}); nothing sent` });
  }

  webpush.setVapidDetails(
    SITE,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const band = BANDS[row.cpcb_pm25_band] || row.cpcb_pm25_band;
  const dd = new Date(row.date + 'T00:00:00+05:30');
  const dayLabel = dd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const baseBody = `Aaj ka station forecast: ${row.pm25_pred} µg/m³ (${band}). Model Town CPCB station, Diwali week.`;
  const defaultPayload = JSON.stringify({
    title: `Patiala PM2.5 forecast - ${dayLabel}`,
    body: baseBody,
    url: SITE,
  });

  // Per-device preferred UTC hour. Vercel cron (Hobby) fires within the scheduled UTC hour,
  // so the invocation's current UTC hour identifies which subscribers to notify.
  // ?hour=N override allowed only for secret-authenticated manual tests.
  const qHour = req.query && req.query.hour !== undefined ? parseInt(req.query.hour, 10) : NaN;
  const currentHourUtc = Number.isInteger(qHour) && qHour >= 0 && qHour <= 23 ? qHour : new Date().getUTCHours();

  const { blobs } = await list({ prefix: 'subs/', token: process.env.PUSH_READ_WRITE_TOKEN });
  let sent = 0, gone = 0, failed = 0, skippedNoPref = 0, skippedOtherHour = 0, skippedAlreadySent = 0, skippedBelowThreshold = 0;
  for (const b of blobs) {
    try {
      const r = await get(b.pathname, { access: 'private', token: process.env.PUSH_READ_WRITE_TOKEN });
      const sub = JSON.parse(await new Response(r.stream).text());
      if (sub.alert_hour_utc === undefined || sub.alert_hour_utc === null) { skippedNoPref++; continue; }
      if (sub.alert_hour_utc !== currentHourUtc) { skippedOtherHour++; continue; }
      if (typeof sub.pm25_threshold === 'number' && row.pm25_pred < sub.pm25_threshold) {
        skippedBelowThreshold++;
        continue;
      }
      const dedupKey = `${today}:${sub.alert_hour_utc}`;
      if (sub.last_sent === dedupKey) { skippedAlreadySent++; continue; }
      const payload = typeof sub.pm25_threshold === 'number'
        ? JSON.stringify({
            title: `Patiala PM2.5 forecast - ${dayLabel}`,
            body: `${baseBody} (Threshold alert: ≥ ${sub.pm25_threshold} µg/m³)`,
            url: SITE,
          })
        : defaultPayload;
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
      // mark sent only after the push service accepted
      sent++;
      try {
        sub.last_sent = dedupKey;
        await put(b.pathname, JSON.stringify(sub), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, token: process.env.PUSH_READ_WRITE_TOKEN });
      } catch { /* dedup persist best-effort; push already accepted */ }
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        gone++;
        try { await del(b.pathname, { token: process.env.PUSH_READ_WRITE_TOKEN }); } catch { /* cleanup best-effort */ }
      }
      else { failed++; }
    }
  }
  return res.status(200).json({ sent, gone, failed, skippedNoPref, skippedOtherHour, skippedAlreadySent, skippedBelowThreshold, hourUtc: currentHourUtc, date: today, value: row.pm25_pred, band });
}