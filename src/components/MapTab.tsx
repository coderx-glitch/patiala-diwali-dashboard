import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
// @ts-ignore vite asset import
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
(maplibregl as any).setWorkerUrl(maplibreWorkerUrl);
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, AlertTriangle } from 'lucide-react';
import { CPCB_CATEGORIES, getCpcbCategory } from '../utils/aqiColors';

interface MapValues { dates: string[]; values: number[][][]; }
interface MapMeta { station: { lon: number; lat: number; cell_lon: number; cell_lat: number }; R: number; dates0: string; dates1: string; }

const BAND_STOPS: [number, string][] = [
  [30, CPCB_CATEGORIES.Good.color],
  [60, CPCB_CATEGORIES.Satisfactory.color],
  [90, CPCB_CATEGORIES.Moderate.color],
  [120, CPCB_CATEGORIES.Poor.color],
  [250, CPCB_CATEGORIES['Very Poor'].color],
];
const colorExpr: any = ['step', ['get', 'pm25'], CPCB_CATEGORIES.Good.color,
  30, CPCB_CATEGORIES.Satisfactory.color, 60, CPCB_CATEGORIES.Moderate.color,
  90, CPCB_CATEGORIES.Poor.color, 120, CPCB_CATEGORIES['Very Poor'].color, 250, CPCB_CATEGORIES.Severe.color];

const DEFAULT_DATE = '2025-10-20'; // Diwali day 2025

export const MapTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const dateIdxRef = useRef(0);
  const [grid, setGrid] = useState<any>(null);
  const [vals, setVals] = useState<MapValues | null>(null);
  const [meta, setMeta] = useState<MapMeta | null>(null);
  const [dateIdx, setDateIdx] = useState<number>(0);
  const [mapFailed, setMapFailed] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { dateIdxRef.current = dateIdx; document.querySelectorAll('.maplibregl-popup').forEach((el) => el.remove()); }, [dateIdx]);

  useEffect(() => {
    Promise.all([
      fetch('data/map_grid.json').then((r) => r.json()),
      fetch('data/map_values.json').then((r) => r.json()),
      fetch('data/map_meta.json').then((r) => r.json()),
    ]).then(([g, v, m]) => {
      setGrid(g); setVals(v); setMeta(m);
      const di = v.dates.indexOf(DEFAULT_DATE);
      setDateIdx(di >= 0 ? di : 0);
    }).catch(() => setLoadError('Map data files could not be loaded.'));
  }, []);

  // create map once data is ready
  useEffect(() => {
    if (!grid || !vals || !meta || !containerRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [meta.station.lon, meta.station.lat - 0.12],
        zoom: 8.6,
        pitch: 55,
        bearing: -18,
        attributionControl: { compact: true },
      });
    } catch (e) {
      setMapFailed('WebGL / interactive map is not available in this browser.');
      return;
    }
    mapRef.current = map;
    (window as any).__map = map; // test/automation handle (read-only view control)
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('error', (ev: any) => {
      const src = (ev as any)?.sourceId;
      if (src === 'base' || src === 'labels') setMapFailed('Map background tiles failed to load (network needed for the map base).');
    });

    map.on('load', () => {
      // insert 3D layers below the first label/symbol layer so labels stay on top
      const layers = map.getStyle().layers || [];
      const firstSymbol = layers.find((l: any) => l.type === 'symbol' && l.layout && l.layout['text-field']);
      const beforeId = firstSymbol ? firstSymbol.id : undefined;
      map.addSource('crea', { type: 'geojson', data: withValues(grid, vals, dateIdx) });
      // heatmap needs point geometry - derive cell centroids from the same grid
      map.addSource('crea-pts', { type: 'geojson', data: withValues(toPoints(grid), vals, dateIdx) });
      // Heatmap = smoothed DISPLAY of the same 10-km cell values (no finer resolution added).
      map.addLayer({
        id: 'crea-extrusion', type: 'fill-extrusion', source: 'crea',
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': colorExpr,
          'fill-extrusion-height': ['*', ['get', 'pm25'], 18],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.82, 12, 0.35, 13, 0.15],
        },
      }, beforeId);
      // Heatmap view: fully-blurred circles keyed to the ABSOLUTE pm25 value
      // (same CPCB ramp as columns). Max blur smooths between the 10-km cells
      // without inventing finer resolution; color never depends on density.
      map.addLayer({
        id: 'crea-heat', type: 'circle', source: 'crea-pts', maxzoom: 13,
        paint: {
          'circle-color': colorExpr,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 38, 10, 64, 13, 110],
          'circle-blur': 1,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.58, 12.5, 0.38, 13, 0],
        },
      }, 'crea-extrusion');
      // Satellite imagery basemap (EOxCloudless Sentinel-2 2024, keyless public endpoint).
      // Verified license: CC BY-NC-SA 4.0 - free for NON-COMMERCIAL use with attribution
      // (cloudless.eox.at/license-non-commercial). Esri/Google imagery is NOT licensed for
      // non-Esri software without a paid subscription - do not substitute.
      map.addSource('sat', {
        type: 'raster',
        tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg'],
        tileSize: 256,
        maxzoom: 18,
        attribution: '<a href="https://cloudless.eox.at" target="_blank" rel="noopener">EOxCloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024), CC BY-NC-SA 4.0',
      } as any);
      map.addLayer({
        id: 'sat-imagery', type: 'raster', source: 'sat', layout: { visibility: 'none' },
        // gentle grade: deepen shadows, mild contrast so 3D overlays read clearly on top
        paint: { 'raster-opacity': 1, 'raster-contrast': 0.18, 'raster-saturation': 0.08, 'raster-brightness-max': 0.94 },
      }, 'crea-extrusion');

      // station marker ring on top of its cell
      map.addSource('station-pt', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [meta.station.lon, meta.station.lat] }, properties: {} } as any });
      map.addLayer({ id: 'station-ring', type: 'circle', source: 'station-pt', paint: { 'circle-radius': 9, 'circle-color': '#0e7490', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } }, beforeId);

      // exact 10-km cell value on click (heat colors are smoothed for display only)
      map.on('click', 'crea-heat', (e: any) => {
        const f = e.features && e.features[0];
        if (!f) return;
        const v = Number(f.properties.pm25);
        if (!isFinite(v)) return;
        const cat = getCpcbCategory(v);
        const d = vals.dates[dateIdxRef.current] || '';
        new maplibregl.Popup({ closeButton: true, maxWidth: '250px' })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:12px/1.45 system-ui,sans-serif;color:#1c1917"><strong>${v.toFixed(1)} µg/m³ PM2.5</strong> · ${cat.label}<br/>10-km cell value · ${d} (CREA archive)<br/><span style="color:#78716c">Exact cell reading. Heat colors around it are smoothed between cells for display.</span></div>`)
          .addTo(map);
      });
      map.on('mouseenter', 'crea-heat', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'crea-heat', () => { map.getCanvas().style.cursor = ''; });

    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, vals, meta]);

  // update extrusion data when date changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !grid || !vals) return;
    const src = map.getSource('crea') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(withValues(grid, vals, dateIdx));
    const ptsSrc = map.getSource('crea-pts') as maplibregl.GeoJSONSource | undefined;
    if (ptsSrc) ptsSrc.setData(withValues(toPoints(grid), vals, dateIdx));
  }, [dateIdx, grid, vals]);

  function toPoints(g: any) {
    return { type: 'FeatureCollection', features: (g.features || []).map((f: any) => {
      const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
      let sx = 0, sy = 0;
      for (const c of ring) { sx += c[0]; sy += c[1]; }
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [sx / ring.length, sy / ring.length] }, properties: { gy: f.properties.gy, gx: f.properties.gx, pm25: 0 } };
    })};
  }

  function withValues(g: any, v: MapValues, t: number) {
    const fc = JSON.parse(JSON.stringify(g));
    for (const f of fc.features) {
      f.properties.pm25 = v.values[t]?.[f.properties.gy]?.[f.properties.gx] ?? 0;
    }
    return fc;
  }

  const curDate = vals?.dates[dateIdx] ?? '';
  const stationCellVal = vals && meta ? vals.values[dateIdx]?.[meta.R]?.[meta.R] : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif font-bold text-stone-900 text-base">Regional PM2.5 Heatmap - Patiala Area</h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Satellite-estimated PM2.5, 10-km cells (CREA, historical - not a forecast). Drag to pan, right-drag to tilt/rotate, scroll to zoom.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-stone-400 font-mono">Showing date (2025 archive)</div>
            <div className="font-mono font-bold text-stone-900 text-sm">{curDate}{curDate === DEFAULT_DATE ? ' - Diwali 2025' : ''}</div>
          </div>
        </div>

        {loadError && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
          </div>
        )}

        {mapFailed ? (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {mapFailed} Showing the static version instead.
            </div>
            <img src="data/map_fallback.png" alt="Static 3D map of Patiala area PM2.5" className="w-full rounded-lg border border-stone-200" />
          </div>
        ) : (
          <div className="relative">
            <div ref={containerRef} className="w-full h-[420px] rounded-lg border border-stone-200 overflow-hidden" />
                      </div>
        )}

        {vals && !mapFailed && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-stone-400 whitespace-nowrap">{vals.dates[0]}</span>
            <input type="range" min={0} max={vals.dates.length - 1} value={dateIdx} onChange={(e) => setDateIdx(parseInt(e.target.value, 10))} className="flex-1 accent-amber-700" aria-label="Select date" />
            <span className="text-[10px] font-mono text-stone-400 whitespace-nowrap">{vals.dates[vals.dates.length - 1]}</span>
          </div>
        )}

        <p className="text-[10px] text-stone-400">
          Heatmap smooths between the 10-km cells for display - it does not add finer resolution or a 2026 forecast.
        </p>

        {/* legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-stone-600">
          <span className="font-semibold text-stone-500 uppercase tracking-wide">PM2.5 (CPCB bands):</span>
          {BAND_STOPS.map(([hi, c], i) => (
            <span key={hi} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              {i === 0 ? `0-${hi}` : `${BAND_STOPS[i - 1][0] + 1}-${hi}`}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: CPCB_CATEGORIES.Severe.color }} />
            &gt;250
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-cyan-700" /> monitoring station location
          </span>
        </div>
      </div>

      {/* coverage vs measurement note */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-600 leading-relaxed space-y-1.5">
        <p>
          <strong className="text-stone-800">What the heatmap is:</strong> satellite-based daily PM2.5 estimates on a 10-km grid (CREA, reimplementation of Kawano et al. 2025; Aug 2018 - May 2026 archive; cross-validation RMSE ~27 ug/m3), shown for a chosen 2025 date. They are regional estimates, not neighbourhood measurements, and not a 2026 forecast.
        </p>
        <p>
          <strong className="text-stone-800">What the marker is:</strong> the Model Town CPCB monitoring station (site_1437) - the single measured point behind everything on this site. Our model forecast applies to this station location only (Diwali 2026, Nov 8: 119.8 ug/m3, Poor). The satellite cell containing the station is anchored to this same monitor, so its agreement with the station is not independent validation.
          {stationCellVal != null && curDate && (
            <span> Station-cell satellite estimate on {curDate}: <strong>{stationCellVal.toFixed(1)} ug/m3</strong>.</span>
          )}
        </p>
      </div>
    </div>
  );
};
