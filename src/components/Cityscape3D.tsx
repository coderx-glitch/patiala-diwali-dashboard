import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
// @ts-ignore vite asset import
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
(maplibregl as any).setWorkerUrl(maplibreWorkerUrl);
import 'maplibre-gl/dist/maplibre-gl.css';

// Model Town station area, Patiala
const CENTER: [number, number] = [76.3869, 30.3398];

// Slowly rotating 3D skyline built from REAL Patiala building footprints
// (OpenStreetMap data, public/data/cityscape.json). Extrusion heights are
// stylized (OSM carries no heights here) - decorative, not surveyed geometry.
// Renders with no tile server: one local GeoJSON source on a cream sky.
const Cityscape3D: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let dead = false;
    let raf = 0;
    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'sky', type: 'background', paint: { 'background-color': '#fdf1de' } }],
      } as any,
      center: CENTER,
      zoom: 15.1,
      pitch: 62,
      bearing: -20,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });
    map.on('load', async () => {
      try {
        const data = await fetch('/data/cityscape.json').then((r) => r.json());
        if (dead) return;
        map.addSource('bld', { type: 'geojson', data });
        map.addLayer({
          id: 'bld-3d',
          type: 'fill-extrusion',
          source: 'bld',
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'h'],
              6, '#f2c384', 14, '#e59a4b', 22, '#c96f1e', 28, '#9a4a0e'],
            'fill-extrusion-height': ['get', 'h'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.94,
            'fill-extrusion-vertical-gradient': true,
          },
        });
        const t0 = performance.now();
        const spin = (now: number) => {
          if (dead) return;
          const s = (now - t0) / 1000;
          map.setBearing(-20 + s * 3.4);          // continuous slow turntable
          map.setPitch(60 + Math.sin(s / 5) * 4); // gentle breathing pitch
          raf = requestAnimationFrame(spin);
        };
        raf = requestAnimationFrame(spin);
      } catch (e) { console.error('cityscape data error', e); }
    });
    return () => { dead = true; cancelAnimationFrame(raf); try { map.remove(); } catch {} };
  }, []);
  return <div ref={ref} className="absolute inset-0" />;
};

export default Cityscape3D;
