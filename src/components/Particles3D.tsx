import React, { useEffect, useRef } from 'react';

/**
 * Real-3D animated background layer (visual only).
 * A field of warm light particles ("diya sparks" + soft sky motes) in true 3D
 * space: each point has x/y/z, the cloud slowly rotates around the Y axis,
 * and every point is perspective-projected (screen = focal / z) so nearer
 * particles are larger, brighter and move faster. Canvas 2D with pre-tinted
 * sprites - no WebGL, no dependencies, cheap on phones.
 * Motion always runs (user preference); rAF pauses only when the tab is hidden.
 */

interface P { x: number; y: number; z: number; r: number; sp: number; ph: number; tint: number }

const TINTS: [string, string][] = [
  // [core, halo] - warm amber, saffron, soft sky blue
  ['rgba(255, 214, 130, 0.95)', 'rgba(251, 191, 36, 0.30)'],
  ['rgba(255, 176, 110, 0.95)', 'rgba(234, 88, 12, 0.26)'],
  ['rgba(214, 236, 252, 0.95)', 'rgba(125, 180, 220, 0.28)'],
];

function makeSprite(core: string, halo: string): HTMLCanvasElement {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, core);
  g.addColorStop(0.35, halo);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  return c;
}

const Particles3D: React.FC<{ density?: number; fixed?: boolean }> = ({ density = 1, fixed = true }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sprites = TINTS.map(([core, halo]) => makeSprite(core, halo));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const FOCAL = 340;
    let w = 0, h = 0, raf = 0, running = true;
    let parts: P[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(10, Math.round(Math.min(80, (w * h) / 20000) * density));
      parts = Array.from({ length: n }, () => ({
        x: (Math.random() - 0.5) * 1000,
        y: (Math.random() - 0.5) * 640,
        z: Math.random() * 900 + 60,
        r: Math.random() * 2.2 + 0.9,
        sp: Math.random() * 0.22 + 0.07,
        ph: Math.random() * Math.PI * 2,
        tint: Math.floor(Math.random() * TINTS.length),
      }));
    };

    let rot = 0;
    const frame = () => {
      if (!running) return;
      rot += 0.0011; // slow turntable of the whole 3D cloud
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      for (const p of parts) {
        p.y -= p.sp;             // gentle rise
        p.ph += 0.012;           // individual sway phase
        if (p.y < -340) p.y = 340;
        // rotate (x,z) around the vertical axis, then push back from camera
        const xr = p.x * cs - p.z * sn;
        const zr = p.x * sn + p.z * cs + 420;
        if (zr < 50) continue;   // behind the camera
        const s = FOCAL / zr;    // perspective divide: true depth cue
        const sx = cx + (xr + Math.sin(p.ph) * 10) * s;
        const sy = cy + p.y * s;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
        const size = Math.max(2, p.r * s * 20);
        ctx.globalAlpha = Math.min(0.8, Math.max(0.07, s * 0.55));
        ctx.drawImage(sprites[p.tint], sx - size / 2, sy - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`${fixed ? 'fixed' : 'absolute'} inset-0 w-full h-full pointer-events-none z-0`}
    />
  );
};

export default Particles3D;
