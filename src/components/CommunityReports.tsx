import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
// @ts-ignore vite asset import
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
(maplibregl as any).setWorkerUrl(maplibreWorkerUrl);
import 'maplibre-gl/dist/maplibre-gl.css';
import { Flame, Trash2, Factory, CloudFog, Camera, MapPin, Send, ShieldAlert } from 'lucide-react';

const CATEGORIES = [
  { id: 'firecracker', label: 'Firecracker activity', color: '#dc2626', Icon: Flame },
  { id: 'open_burning', label: 'Open burning', color: '#ea580c', Icon: Flame },
  { id: 'garbage_burning', label: 'Garbage burning', color: '#a16207', Icon: Trash2 },
  { id: 'excessive_smoke', label: 'Excessive smoke', color: '#57534e', Icon: Factory },
  { id: 'dust', label: 'Dust-generating activity', color: '#0284c7', Icon: CloudFog },
] as const;
type CatId = (typeof CATEGORIES)[number]['id'];
const catOf = (id: string) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[3];

interface Report { id: string; type: CatId; lat: number; lon: number; note: string; photoUrl: string | null; ts: string; }

const CENTER: [number, number] = [76.3869, 30.3398]; // Patiala

function deviceId(): string {
  let id = localStorage.getItem('cr_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('cr_device_id', id); }
  return id;
}

// strip EXIF + downscale: draw to canvas, re-encode JPEG (removes all metadata)
async function cleanPhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

function km(a: Report, b: Report) {
  const dx = (a.lon - b.lon) * 96.4, dy = (a.lat - b.lat) * 111;
  return Math.sqrt(dx * dx + dy * dy);
}

export const CommunityReports: React.FC = () => {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'approval' | 'direct' | null>(null);
  const [type, setType] = useState<CatId>('firecracker');
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const refresh = () => {
    fetch('/api/reports').then((r) => r.json()).then((d) => { setReports(d.reports || []); if (d.mode) setMode(d.mode as 'approval' | 'direct'); }).catch(() => setLoadErr('Reports could not be loaded (the reports service runs on the live site).'));
  };
  useEffect(refresh, []);

  // incident mini-map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: mapEl.current, style: 'https://tiles.openfreemap.org/styles/positron', center: CENTER, zoom: 10.6, attributionControl: { compact: true } });
    } catch { return; }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      map.addSource('incidents', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'incident-dots', type: 'circle', source: 'incidents',
        paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-opacity': 0.85, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
      });
      map.on('click', 'incident-dots', (e: any) => {
        const f = e.features?.[0]; if (!f) return;
        const c = catOf(f.properties.type);
        new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:12px/1.45 system-ui;color:#1c1917"><strong>${c.label}</strong><br/>${(f.properties.note || '').replace(/[<>&]/g, '')}<br/><span style="color:#78716c">${new Date(f.properties.ts).toLocaleString('en-IN')} · unverified community report</span>${f.properties.photoUrl ? `<br/><img src="${f.properties.photoUrl}" style="margin-top:6px;border-radius:6px;max-width:200px"/>` : ''}</div>`)
          .addTo(map);
      });
    });
    map.on('click', (e) => { setPos([+e.lngLat.lng.toFixed(3), +e.lngLat.lat.toFixed(3)]); });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // reflect reports + draft pin on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !reports) return;
    const src = map.getSource('incidents') as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: 'FeatureCollection',
      features: reports.map((r) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lon, r.lat] }, properties: { type: r.type, note: r.note, ts: r.ts, photoUrl: r.photoUrl || '', color: catOf(r.type).color } } as any)),
    });
  }, [reports]);
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (!markerRef.current) markerRef.current = new maplibregl.Marker({ color: '#b45309' });
    if (pos) markerRef.current.setLngLat([pos[0], pos[1]]).addTo(map); else markerRef.current.remove();
  }, [pos]);

  const onPhoto = async (f: File | null) => {
    if (!f) { setPhoto(null); return; }
    try { setPhoto(await cleanPhoto(f)); } catch { setPhoto(null); }
  };

  const corroboration = useMemo(() => {
    const m: Record<string, number> = {};
    (reports || []).forEach((r) => {
      const n = (reports || []).filter((o) => o.id !== r.id && o.type === r.type && km(o, r) < 1 && Math.abs(new Date(o.ts).getTime() - new Date(r.ts).getTime()) < 3 * 3600e3).length;
      if (n > 0) m[r.id] = n + 1;
    });
    return m;
  }, [reports]);

  const submit = async () => {
    if (!pos) { setMsg('Pehle map par location tap karein ya "use my location" dabayein.'); return; }
    setSending(true); setMsg(null);
    try {
      const r = await fetch('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lat: pos[1], lon: pos[0], note, photoBase64: photo, deviceId: deviceId() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'submit failed');
      setMsg(d.queued
        ? 'Report submitted. It will appear publicly after review. No account was needed; it auto-expires in 72 hours.'
        : 'Report submitted. It is public now. No account was needed; it auto-expires in 72 hours.');
      setNote(''); setPhoto(null); setPos(null);
      refresh();
    } catch (e: any) { setMsg(`Submit failed: ${e.message}`); }
    setSending(false);
  };

  const removeMine = async (id: string) => {
    try {
      await fetch(`/api/reports?id=${id}&deviceId=${deviceId()}`, { method: 'DELETE' });
      refresh();
    } catch {}
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <div>
          <h2 className="font-serif font-bold text-stone-900 text-base">Community Pollution Reports - Patiala</h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Report firecrackers, open/garbage burning, smoke or dust near you. No account, name or phone number is collected. Location is rounded to ~110 m and photo file metadata is removed on your device before upload. Photos and notes can still identify people - avoid faces, number plates and personal details. Reports auto-expire after 72 hours.
          </p>
          {mode === 'approval' && <p className="text-[11px] text-amber-800 mt-1">Reports are reviewed before they appear publicly.</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(({ id, label, color, Icon }) => (
                <button key={id} onClick={() => setType(id)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium ${type === id ? 'text-white' : 'bg-white text-stone-600 border-stone-300'}`}
                  style={type === id ? { background: color, borderColor: color } : {}}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-600">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {pos ? <span className="font-mono">Pinned: {pos[1]}, {pos[0]} (tap map to change)</span> : <span>Tap the map to pin the location, or</span>}
              <button onClick={() => navigator.geolocation?.getCurrentPosition((g) => setPos([+g.coords.longitude.toFixed(3), +g.coords.latitude.toFixed(3)]), () => setMsg('Location permission denied - tap the map instead.'))}
                className="px-2 py-1 rounded-md bg-stone-800 text-white text-[10px] font-semibold">Use my location</button>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} rows={2} maxLength={280}
              placeholder="Short note (optional, 280 chars) - what did you see?"
              className="w-full rounded-lg border border-stone-300 p-2 text-xs" />
            <label className="flex items-center gap-2 text-[11px] text-stone-600 cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              <span>{photo ? 'Photo attached (metadata removed)' : 'Add photo evidence (optional)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0] || null)} />
            </label>
            {photo && (
              <img src={photo} alt="Report evidence preview" className="max-h-36 rounded-lg border border-stone-200" />
            )}
            <button onClick={submit} disabled={sending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-700 text-white text-xs font-semibold disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> {sending ? 'Submitting…' : 'Submit report'}
            </button>
            {msg && <p className="text-[11px] text-stone-600">{msg}</p>}
          </div>
          <div>
            <div ref={mapEl} className="w-full h-[300px] rounded-lg border border-stone-200 overflow-hidden" />
            <p className="text-[10px] text-stone-400 mt-1">Live incident map: unverified community reports only. Dots show rounded locations, never exact addresses.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="font-semibold text-stone-800 text-sm mb-2">Recent reports {reports ? `(${reports.length})` : ''}</h3>
        {loadErr && <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{loadErr}</p>}
        {reports && reports.length === 0 && !loadErr && <p className="text-[11px] text-stone-400">No active reports in the last 72 hours.</p>}
        <ul className="space-y-2">
          {(reports || []).slice(0, 30).map((r) => {
            const c = catOf(r.type);
            return (
              <li key={r.id} className="flex items-start gap-2 text-[11px] border border-stone-100 rounded-lg p-2">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: c.color }} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="text-stone-800">{c.label}</strong>
                    {corroboration[r.id] ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-700 text-[9px] font-semibold">Community-corroborated ×{corroboration[r.id]}</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-stone-50 border border-stone-300 text-stone-500 text-[9px] font-semibold">Unverified</span>
                    )}
                    <span className="text-stone-400">{new Date(r.ts).toLocaleString('en-IN')}</span>
                    <span className="font-mono text-stone-400">{r.lat}, {r.lon}</span>
                  </div>
                  {r.note && <p className="text-stone-600 mt-0.5">{r.note}</p>}
                  {r.photoUrl && <a href={r.photoUrl} target="_blank" rel="noopener"><img src={r.photoUrl} alt="Report evidence" className="mt-1 max-h-24 rounded border border-stone-200" /></a>}
                </div>
                <button onClick={() => removeMine(r.id)} title="Remove (only works on the device that submitted it)" className="text-stone-300 hover:text-red-600 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-600 leading-relaxed">
        <p className="flex items-start gap-1.5"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-stone-400" />
          <span><strong className="text-stone-800">Honesty box:</strong> every report is an <em>unverified community submission</em>. "Community-corroborated" only means 2+ reports of the same type within ~1 km and 3 hours - it is not authority verification. AI photo classification is NOT offered: a generic on-device model (MobileNet) tested on a real stubble-burning photo answered 'geyser/volcano' - useless for pollution. No auto-classification ships until a model that actually detects smoke/fire is validated. These reports supplement the single CPCB monitor; they are not measurements.</span>
        </p>
      </div>
    </div>
  );
};
