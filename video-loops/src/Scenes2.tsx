// Four 120 s seamless loops built on the user's own Gemini paintings (Lofi-References), 2560×1080 (≈21:9).
// Same method as Scenes.tsx: the painting is the base layer, every added motion is periodic over D frames.
import React from 'react';
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from 'remotion';

export const D = 3600;
export const SW = 2560, SH = 1080;
const TAU = Math.PI * 2;
const ph = (f: number, k: number, p = 0) => TAU * k * f / D + p;
const osc = (f: number, k: number, p = 0) => Math.sin(ph(f, k, p));
const R = (s: string) => random(s);
const fr = (x: number) => x - Math.floor(x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ── Shared layers ───────────────────────────────────────────────────────

// Slow periodic "breathing" camera.
const Camera: React.FC<{ f: number; amp?: number; children: React.ReactNode }> = ({ f, amp = 1, children }) => {
  const s = 1.035 + 0.014 * amp * (0.5 - 0.5 * Math.cos(ph(f, 1)));
  const x = 9 * amp * osc(f, 1, 0.6), y = 5 * amp * osc(f, 2, 1.3);
  return <AbsoluteFill style={{ transform: `translate(${x}px,${y}px) scale(${s})`, transformOrigin: '50% 52%' }}>{children}</AbsoluteFill>;
};

// Sakura petal (notched teardrop), drawn around 0,0, ~20px long.
const PETAL = 'M0,-10 C6,-9 9,-2 7,5 C5,10 1,11 0,8 C-1,11 -5,10 -7,5 C-9,-2 -6,-9 0,-10 Z';

type PetalCfg = { n: number; seed: string; wind: number; colors: string[]; size: [number, number]; blurNear?: boolean; minC?: number; maxC?: number };
const makePetals = (c: PetalCfg) => Array.from({ length: c.n }, (_, i) => {
  const k = (s: string) => R(c.seed + s + i);
  const depth = k('d');                                  // 0 far … 1 near
  return {
    cyc: (c.minC ?? 7) + Math.floor(k('c') * ((c.maxC ?? 15) - (c.minC ?? 7))), // falls per loop
    p: k('p'), x0: k('x') * 1.3 - 0.15, sway: 18 + k('s') * 40, sw: 2 + Math.floor(k('w') * 4),
    spin: (k('r') < 0.5 ? -1 : 1) * (1 + Math.floor(k('rr') * 3)), flip: 2 + Math.floor(k('f') * 5),
    size: c.size[0] + (c.size[1] - c.size[0]) * depth, depth, col: c.colors[Math.floor(k('col') * c.colors.length)],
    drift: c.wind * (0.6 + depth * 0.8),
  };
});
const Petals: React.FC<{ f: number; list: ReturnType<typeof makePetals>; opacity?: number; id: string; shape?: string; vein?: boolean }> = ({ f, list, opacity = 1, id, shape, vein = true }) => (
  <svg width={SW} height={SH} style={{ position: 'absolute', inset: 0, opacity }}>
    <defs><filter id={id + 'b'}><feGaussianBlur stdDeviation="2.2" /></filter></defs>
    {list.map((q, i) => {
      const u = fr(f * q.cyc / D + q.p);
      const y = -40 + u * (SH + 80);
      const x = ((q.x0 * SW + q.drift * u * SW * 0.35 + q.sway * Math.sin(TAU * (u * q.sw + q.p))) % (SW + 120) + SW + 120) % (SW + 120) - 60;
      const rot = 360 * u * q.spin + q.p * 360, sx = Math.cos(TAU * (u * q.flip + q.p));
      const a = Math.min(1, u * 12, (1 - u) * 12);
      return <g key={i} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(q.size / 20 * (0.35 + 0.65 * Math.abs(sx))).toFixed(3)},${(q.size / 20).toFixed(3)})`}
        opacity={(0.55 + 0.45 * q.depth) * a} filter={q.depth > 0.86 ? `url(#${id}b)` : undefined}>
        <path d={shape || PETAL} fill={q.col} />{vein && <path d="M0,-6 C2,-3 2,2 0,6" stroke="rgba(255,255,255,.45)" strokeWidth="1" fill="none" />}
      </g>;
    })}
  </svg>
);

// Soft glowing light (lantern, orb, moon), pulsing with integer frequencies.
const Glow: React.FC<{ f: number; x: number; y: number; r: number; color: string; k?: number; p?: number; base?: number; amp?: number; flicker?: boolean }> =
  ({ f, x, y, r, color, k = 6, p = 0, base = 0.55, amp = 0.3, flicker }) => {
    let a = base + amp * osc(f, k, p);
    if (flicker) a += 0.08 * osc(f, 173, p * 3) + 0.05 * osc(f, 311, p * 7);
    return <div style={{ position: 'absolute', left: x * SW - r, top: y * SH - r, width: 2 * r, height: 2 * r, borderRadius: '50%', opacity: clamp01(a), mixBlendMode: 'screen',
      background: `radial-gradient(circle, ${color} 0%, ${color}55 30%, transparent 70%)` }} />;
  };

// Twinkling stars inside a rectangle (fractions of the frame).
const Stars: React.FC<{ f: number; seed: string; n: number; box: [number, number, number, number]; avoid?: (x: number, y: number) => boolean; color?: string }> =
  ({ f, seed, n, box, avoid, color = '#e8fbff' }) => {
    const st = React.useMemo(() => Array.from({ length: n * 2 }, (_, i) => ({
      x: box[0] + R(seed + 'x' + i) * (box[2] - box[0]), y: box[1] + R(seed + 'y' + i) * (box[3] - box[1]),
      s: 0.7 + R(seed + 's' + i) * 1.9, k: 9 + Math.floor(R(seed + 'k' + i) * 50), p: R(seed + 'p' + i) * TAU,
    })).filter(s => !avoid || !avoid(s.x, s.y)).slice(0, n), [seed, n]);
    return <svg width={SW} height={SH} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
      {st.map((s, i) => { const a = clamp01(0.35 + 0.65 * Math.pow(0.5 + 0.5 * osc(f, s.k, s.p), 3));
        return <g key={i} opacity={a}><circle cx={s.x * SW} cy={s.y * SH} r={s.s} fill={color} />
          {s.s > 2.1 && <path d={`M${s.x * SW - s.s * 4},${s.y * SH} H${s.x * SW + s.s * 4} M${s.x * SW},${s.y * SH - s.s * 4} V${s.y * SH + s.s * 4}`} stroke={color} strokeWidth={0.6} opacity={0.7} />}</g>; })}
    </svg>;
  };

// Rising fireflies / sparkles that bob around a home position.
const Motes: React.FC<{ f: number; seed: string; n: number; box: [number, number, number, number]; color: string; size?: [number, number]; rise?: number }> =
  ({ f, seed, n, box, color, size = [2, 5], rise = 0 }) => {
    const ms = React.useMemo(() => Array.from({ length: n }, (_, i) => ({
      x: box[0] + R(seed + 'x' + i) * (box[2] - box[0]), y: box[1] + R(seed + 'y' + i) * (box[3] - box[1]),
      s: size[0] + R(seed + 's' + i) * (size[1] - size[0]), k1: 1 + Math.floor(R(seed + 'a' + i) * 4), k2: 2 + Math.floor(R(seed + 'b' + i) * 5),
      kb: 5 + Math.floor(R(seed + 'c' + i) * 20), p: R(seed + 'p' + i) * TAU, rc: 3 + Math.floor(R(seed + 'r' + i) * 6),
    })), [seed, n]);
    return <svg width={SW} height={SH} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
      <defs><radialGradient id={seed + 'g'}><stop offset="0" stopColor="#fff" /><stop offset="0.25" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient></defs>
      {ms.map((m, i) => {
        const u = rise ? fr(f * m.rc / D + m.p / TAU) : 0;
        const x = m.x * SW + 26 * Math.sin(ph(f, m.k1, m.p)) + 9 * Math.sin(ph(f, m.k2, m.p * 2));
        const y = m.y * SH + 18 * Math.cos(ph(f, m.k2, m.p)) - rise * u * SH;
        const a = clamp01(0.25 + 0.75 * (0.5 + 0.5 * osc(f, m.kb, m.p))) * (rise ? Math.min(1, u * 6, (1 - u) * 6) : 1);
        return <circle key={i} cx={x} cy={y} r={m.s * 3} fill={`url(#${seed}g)`} opacity={a} />;
      })}
    </svg>;
  };

// Ripple/wind: horizontal strips of the painting displaced by a travelling wave, limited by a CSS mask.
type Place = { x: number; y: number; w: number; h: number };
const Ripple: React.FC<{ f: number; src: string; img: Place; top: number; bottom?: number; strips: number; amp: number; mask?: string; k1?: number; k2?: number }> =
  ({ f, src, img, top, bottom = 1, strips, amp, mask, k1 = 30, k2 = 47 }) => {
    const y0 = top * SH, h = (bottom * SH - y0) / strips;
    return <AbsoluteFill style={{ WebkitMaskImage: mask || `linear-gradient(to bottom, transparent ${y0 - 10}px, #000 ${y0 + 40}px)` }}>
      {Array.from({ length: strips }, (_, i) => {
        const depth = i / strips, dx = amp * (0.35 + depth) * Math.sin(ph(f, k1, i * 0.9)) + amp * 0.5 * Math.sin(ph(f, k2, i * 1.7 + 1));
        return <div key={i} style={{ position: 'absolute', left: 0, top: y0 + i * h, width: SW, height: h + 1, overflow: 'hidden' }}>
          <Img src={src} style={{ position: 'absolute', left: img.x + dx, top: img.y - (y0 + i * h), width: img.w, height: img.h }} />
        </div>;
      })}
    </AbsoluteFill>;
  };
const cover = (w: number, h: number): Place => { const k = Math.max(SW / w, SH / h); return { w: w * k, h: h * k, x: (SW - w * k) / 2, y: (SH - h * k) / 2 }; };
const Base: React.FC<{ src: string; img: Place; style?: React.CSSProperties }> = ({ src, img, style }) =>
  <Img src={src} style={{ position: 'absolute', left: img.x, top: img.y, width: img.w, height: img.h, ...style }} />;

// Flowing water (waterfalls): moving vertical streaks, seamless (shifts whole pattern periods per loop).
const Falls: React.FC<{ f: number; x: number; y: number; w: number; h: number; laps?: number; opacity?: number }> = ({ f, x, y, w, h, laps = 90, opacity = 0.45 }) => {
  const P = 140, off = fr(f * laps / D) * P;
  return <div style={{ position: 'absolute', left: x * SW, top: y * SH, width: w * SW, height: h * SH, mixBlendMode: 'screen', opacity,
    WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 55%, transparent 100%)',
    backgroundImage: `repeating-linear-gradient(180deg, rgba(255,255,255,0) 0px, rgba(255,255,255,.75) 18px, rgba(255,255,255,0) 46px, rgba(220,245,255,.35) 80px, rgba(255,255,255,0) ${P}px), repeating-linear-gradient(90deg, rgba(255,255,255,.0) 0px, rgba(255,255,255,.5) 3px, rgba(255,255,255,0) 7px)`,
    backgroundPosition: `0px ${off}px, 0 0`, filter: 'blur(1.2px)' }} />;
};

// Rising smoke from a chimney.
const Smoke: React.FC<{ f: number; x: number; y: number; seed: string; n?: number; rise?: number; color?: string }> = ({ f, x, y, seed, n = 9, rise = 0.22, color = '220,230,245' }) => <>
  {Array.from({ length: n }, (_, i) => {
    const u = fr(f * 6 / D + i / n), sx = x * SW + 40 * u + 14 * Math.sin(TAU * (u * 2 + R(seed + i))), sy = y * SH - u * rise * SH, r = 10 + 46 * u;
    return <div key={i} style={{ position: 'absolute', left: sx - r, top: sy - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: `rgba(${color},${0.22 * Math.sin(Math.PI * u)})`, filter: `blur(${6 + 10 * u}px)` }} />;
  })}</>;

// Small fish crossing underwater.
const Fish: React.FC<{ f: number; seed: string; n: number; box: [number, number, number, number]; colors: string[] }> = ({ f, seed, n, box, colors }) =>
  <svg width={SW} height={SH} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: n }, (_, i) => {
      const dir = R(seed + 'd' + i) < 0.5 ? 1 : -1, laps = 1 + Math.floor(R(seed + 'l' + i) * 3), u = fr(f * laps / D + R(seed + 'p' + i));
      const x = (dir > 0 ? u : 1 - u) * (box[2] - box[0] + 0.2) * SW + (box[0] - 0.1) * SW;
      const y = (box[1] + R(seed + 'y' + i) * (box[3] - box[1])) * SH + 12 * Math.sin(ph(f, 7 + i, i));
      const s = 0.7 + R(seed + 's' + i) * 0.9, wag = 0.25 * Math.sin(ph(f, 600 + 40 * i, i));
      return <g key={i} transform={`translate(${x},${y}) scale(${dir * s},${s})`} opacity={0.85}>
        <ellipse cx={0} cy={0} rx={13} ry={4.6} fill={colors[i % colors.length]} />
        <path d={`M-11,0 L-21,${-6 + wag * 10} L-21,${6 + wag * 10} Z`} fill={colors[i % colors.length]} />
        <circle cx={8} cy={-1} r={1.2} fill="#0b2a2a" />
      </g>;
    })}
  </svg>;

// Rising bubbles that vanish at the water surface.
const Bubbles: React.FC<{ f: number; seed: string; n: number; x: [number, number]; from: number; surface: number }> = ({ f, seed, n, x, from, surface }) =>
  <svg width={SW} height={SH} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: n }, (_, i) => {
      const c = 5 + Math.floor(R(seed + 'c' + i) * 8), u = fr(f * c / D + R(seed + 'p' + i));
      const y0 = (from + R(seed + 'y' + i) * (1 - from)) * SH, y = y0 - u * (y0 - surface * SH);
      const xx = (x[0] + R(seed + 'x' + i) * (x[1] - x[0])) * SW + 6 * Math.sin(TAU * u * 3 + i), r = 1.5 + R(seed + 'r' + i) * 3.5;
      return <circle key={i} cx={xx} cy={y} r={r} fill="rgba(220,255,255,.18)" stroke="rgba(230,255,255,.6)" strokeWidth={0.8} opacity={Math.min(1, u * 8, (1 - u) * 8)} />;
    })}
  </svg>;

// Caustic light pattern (two drifting soft lattices).
const Caustics: React.FC<{ f: number; top: number; opacity?: number }> = ({ f, top, opacity = 0.22 }) => {
  const a = fr(f * 2 / D) * 220, b = fr(f * 3 / D) * 160;
  return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity, WebkitMaskImage: `linear-gradient(to bottom, transparent ${top * SH}px, #000 ${top * SH + 60}px, rgba(0,0,0,.4) ${SH}px)`, filter: 'blur(5px)',
    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(200,255,240,.9) 0 6%, transparent 22%), radial-gradient(circle at 50% 50%, rgba(180,255,250,.7) 0 5%, transparent 20%)',
    backgroundSize: '220px 110px, 160px 90px', backgroundPosition: `${a}px ${a / 4}px, ${-b}px ${b * 9 / 16}px` }} />;
};

// Light shafts.
const Shafts: React.FC<{ f: number; x: number; y: number; angle: number; color: string; opacity: number; spread?: number }> = ({ f, x, y, angle, color, opacity, spread = 1 }) =>
  <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: opacity * (0.8 + 0.2 * osc(f, 3, x * 7)) }}>
    <div style={{ position: 'absolute', left: x * SW - 1400, top: y * SH - 1400, width: 2800, height: 2800, transform: `rotate(${angle + 2.5 * osc(f, 1, y)}deg)`,
      background: `repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg ${5 * spread}deg, ${color} ${6 * spread}deg ${8 * spread}deg, transparent ${9 * spread}deg ${15 * spread}deg)`,
      WebkitMaskImage: 'radial-gradient(circle, #000 5%, transparent 55%)' }} />
  </AbsoluteFill>;

// Horizontal drifting soft fog / cloud band, seamlessly wrapping (moves exactly `laps` widths per loop).
const Drift: React.FC<{ f: number; seed: string; y: number; h: number; color: string; opacity: number; laps: number; blobs?: number; dir?: 1 | -1; blur?: number }> =
  ({ f, seed, y, h, color, opacity, laps, blobs = 9, dir = 1, blur = 30 }) => {
    const bl = React.useMemo(() => Array.from({ length: blobs }, (_, i) => ({ x: (i + R(seed + 'x' + i) * 0.6) / blobs, w: 0.14 + R(seed + 'w' + i) * 0.2, h: 0.5 + R(seed + 'h' + i) * 0.5, y: R(seed + 'y' + i) * 0.4 })), [seed, blobs]);
    const off = dir * fr(f * laps / D) * SW;
    const band = (k: number) => <div key={k} style={{ position: 'absolute', left: off - k * SW * dir, top: 0, width: SW, height: '100%' }}>
      {bl.map((b, i) => <div key={i} style={{ position: 'absolute', left: (b.x - b.w / 2) * SW, top: (b.y) * h, width: b.w * SW, height: b.h * h, borderRadius: '50%', background: color, filter: `blur(${blur}px)` }} />)}
    </div>;
    return <div style={{ position: 'absolute', left: 0, top: y * SH, width: SW, height: h, opacity, overflow: 'visible' }}>{band(0)}{band(1)}</div>;
  };

// Birds: small "v" silhouettes crossing the sky a whole number of times per loop.
const Birds: React.FC<{ f: number; seed: string; n: number; y: [number, number]; color: string; laps: number; opacity?: number }> = ({ f, seed, n, y, color, laps, opacity = 0.8 }) => {
  const u = fr(f * laps / D);
  const lead = { x: -0.15 + u * 1.3, y: y[0] + (y[1] - y[0]) * (0.5 + 0.5 * Math.sin(TAU * u)) };
  return <svg width={SW} height={SH} style={{ position: 'absolute', inset: 0, opacity }}>
    {Array.from({ length: n }, (_, i) => {
      const ox = -(i % 2 ? 1 : 0.6) * (Math.ceil(i / 2) * 34 + R(seed + i) * 14), oy = (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 16 + R(seed + 'y' + i) * 10;
      const flap = Math.sin(ph(f, 420 + i * 37, i)), s = 0.8 + R(seed + 's' + i) * 0.5;
      const x = lead.x * SW + ox, yy = lead.y * SH + oy + 4 * Math.sin(ph(f, 60, i));
      return <path key={i} transform={`translate(${x},${yy}) scale(${s})`} d={`M-9,${-3 * flap} Q-4,${-1 - 4 * flap} 0,1 Q4,${-1 - 4 * flap} 9,${-3 * flap}`} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />;
    })}
  </svg>;
};

const Vignette: React.FC<{ strength?: number; color?: string }> = ({ strength = 0.5, color = '0,0,0' }) =>
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, transparent 55%, rgba(${color},${strength}) 100%)` }} />;

const LEAF = 'M0,-11 C7,-6 7,5 0,11 C-7,5 -7,-6 0,-11 Z';
const DOT = 'M0,-6 A6,6 0 1 1 0,6 A6,6 0 1 1 0,-6 Z';

// ── A: "Collina al tramonto" ────────────────────────────────────────────
const A = staticFile('collina-tramonto.jpg'), AP = cover(3168, 1344);
const A_FLUFF = makePetals({ n: 40, seed: 'af', wind: 0.6, colors: ['#fff1cf', '#ffe2a8', '#ffffff'], size: [3, 8], minC: 3, maxC: 7 });
export const CollinaTramonto: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: '#2a1d2e' }}>
    <Camera f={f}>
      <Base src={A} img={AP} />
      <Stars f={f} seed="as1" n={40} box={[0, 0, 0.2, 0.22]} />
      <Stars f={f} seed="as2" n={40} box={[0.84, 0, 1, 0.26]} />
      <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 30%, transparent 45%)' }}>
        <Drift f={f} seed="ac" y={0.02} h={360} color="rgba(255,170,120,.55)" opacity={0.2} laps={1} blobs={9} blur={40} />
      </div>
      <Shafts f={f} x={0.633} y={0.4} angle={0} color="rgba(255,214,140,.35)" opacity={0.35} />
      <Glow f={f} x={0.633} y={0.40} r={300} color="#ffd890" k={2} base={0.55} amp={0.15} />
      <Stars f={f} seed="acity" n={60} box={[0.2, 0.46, 0.6, 0.6]} color="#ffe6b0" />
      <Ripple f={f} src={A} img={AP} top={0.6} strips={36} amp={3.2} k1={20} k2={33} />
      {/* the boy stays still over the moving grass */}
      <Base src={A} img={AP} style={{ WebkitMaskImage: 'radial-gradient(ellipse 4.6% 40% at 68.6% 60%, #000 70%, transparent 100%)' }} />
      <Birds f={f} seed="ab" n={6} y={[0.12, 0.24]} color="rgba(50,30,50,.75)" laps={2} />
      <Motes f={f} seed="apol" n={50} box={[0.3, 0.45, 1, 0.95]} color="#ffd27a" size={[1.2, 3]} rise={0.1} />
      <Petals f={f} list={A_FLUFF} id="af" shape={DOT} vein={false} opacity={0.7} />
    </Camera>
    <Vignette strength={0.45} color="30,15,30" />
  </AbsoluteFill>;
};

// ── B: "Fiume del villaggio" ────────────────────────────────────────────
const B = staticFile('fiume-villaggio.jpg'), BP = cover(3200, 1344);
const B_LEAVES = makePetals({ n: 34, seed: 'bl', wind: 0.4, colors: ['#7fbf4d', '#a8d45a', '#e8c547', '#5e9e3c'], size: [10, 22], minC: 4, maxC: 9 });
export const FiumeVillaggio: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: '#1d4a6e' }}>
    <Camera f={f}>
      <Base src={B} img={BP} />
      <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: 'radial-gradient(ellipse 22% 22% at 50% 20%, #000 40%, transparent 100%)' }}>
        <Drift f={f} seed="bc" y={0.05} h={330} color="rgba(255,255,255,.85)" opacity={0.25} laps={1} blobs={8} blur={34} dir={-1} />
      </div>
      <Shafts f={f} x={0.12} y={-0.05} angle={20} color="rgba(255,250,215,.35)" opacity={0.25} />
      <Ripple f={f} src={B} img={BP} top={0.665} bottom={0.86} strips={26} amp={3}
        mask="radial-gradient(ellipse 22% 13% at 69% 76%, #000 55%, transparent 100%), radial-gradient(ellipse 8% 5% at 31% 71.5%, #000 40%, transparent 100%)" />
      <Motes f={f} seed="bgl" n={46} box={[0.5, 0.69, 0.95, 0.84]} color="#ffffff" size={[0.8, 2]} />
      <Falls f={f} x={0.924} y={0.16} w={0.014} h={0.2} opacity={0.5} />
      <Falls f={f} x={0.953} y={0.24} w={0.01} h={0.13} opacity={0.45} />
      <Birds f={f} seed="bb" n={5} y={[0.06, 0.16]} color="rgba(30,40,60,.7)" laps={2} />
      <Motes f={f} seed="bdust" n={30} box={[0.0, 0.2, 0.5, 0.85]} color="#fff6c8" size={[1, 2.4]} />
      <Petals f={f} list={B_LEAVES} id="bl" shape={LEAF} />
    </Camera>
    <Vignette strength={0.3} color="10,30,40" />
  </AbsoluteFill>;
};

// ── C: "Villaggio d'inverno · aurora" ───────────────────────────────────
const C = staticFile('villaggio-aurora.jpg'), CP = cover(3200, 1344);
const C_SNOW = makePetals({ n: 140, seed: 'cs', wind: 0.12, colors: ['#ffffff', '#eef6ff', '#dbe9ff'], size: [3, 9], minC: 3, maxC: 8 });
const C_FLAMES: [number, number, string][] = [[0.10, 0.47, '#5fb8ff'], [0.176, 0.42, '#6dff9e'], [0.334, 0.55, '#7a8cff'], [0.379, 0.50, '#6dff9e'], [0.416, 0.53, '#5fb8ff'], [0.347, 0.625, '#5fe8ff'], [0.44, 0.62, '#6dff9e'], [0.476, 0.58, '#5fb8ff'], [0.52, 0.61, '#6dff9e'], [0.54, 0.59, '#5fe8ff'], [0.597, 0.57, '#5fb8ff']];
const C_LAMPS: [number, number][] = [[0.184, 0.72], [0.261, 0.72], [0.411, 0.72], [0.44, 0.72], [0.566, 0.735], [0.521, 0.70], [0.21, 0.74], [0.6, 0.72]];
export const VillaggioAurora: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: '#0b1630' }}>
    <Camera f={f}>
      <Base src={C} img={CP} />
      {/* aurora: same sky with a slowly shifting hue and sideways sway */}
      <Base src={C} img={{ ...CP, x: CP.x + 10 * osc(f, 3) }} style={{ filter: `hue-rotate(${35 * osc(f, 2, 1)}deg) saturate(1.35) brightness(1.1)`, opacity: 0.6,
        WebkitMaskImage: 'radial-gradient(ellipse 34% 30% at 44% 22%, #000 30%, transparent 100%)' }} />
      <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.2 + 0.1 * osc(f, 5), WebkitMaskImage: 'radial-gradient(ellipse 34% 30% at 44% 24%, #000 20%, transparent 100%)',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(120,255,190,0) 0px, rgba(120,255,190,.5) 6px, rgba(150,120,255,0) 22px, rgba(150,120,255,.35) 30px, rgba(120,255,190,0) 48px)',
        backgroundPosition: `${fr(f * 4 / D) * 48}px 0`, filter: 'blur(3px)' }} />
      <Stars f={f} seed="cst" n={120} box={[0.03, 0.0, 0.62, 0.38]} />
      <Smoke f={f} x={0.216} y={0.53} seed="s1" />
      <Smoke f={f} x={0.401} y={0.585} seed="s2" />
      <Smoke f={f} x={0.616} y={0.6} seed="s3" />
      {C_LAMPS.map(([x, y], i) => <Glow key={'l' + i} f={f} x={x} y={y} r={34} color="#ffb260" k={4 + i} p={i} base={0.5} amp={0.15} flicker />)}
      {C_FLAMES.map(([x, y, c], i) => <Glow key={'h' + i} f={f} x={x} y={y + 0.008 * osc(f, 5 + i, i)} r={48} color={c} k={7 + i} p={i * 2} base={0.55} amp={0.25} />)}
      <Petals f={f} list={C_SNOW.filter(p => p.depth < 0.7)} id="cs1" shape={DOT} vein={false} opacity={0.85} />
    </Camera>
    <Camera f={f} amp={1.6}><Petals f={f} list={C_SNOW.filter(p => p.depth >= 0.7)} id="cs2" shape={DOT} vein={false} /></Camera>
    <Vignette strength={0.45} color="5,10,25" />
  </AbsoluteFill>;
};

// ── D: "Foresta sommersa" ───────────────────────────────────────────────
const E = staticFile('foresta-sommersa.jpg'), EP = cover(3168, 1344);
export const ForestaSommersa: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: '#0d3b36' }}>
    <Camera f={f}>
      <Base src={E} img={EP} />
      <Shafts f={f} x={0.86} y={-0.08} angle={8} color="rgba(240,255,210,.4)" opacity={0.3} spread={0.8} />
      <Falls f={f} x={0.15} y={0.06} w={0.09} h={0.49} opacity={0.4} />
      <Falls f={f} x={0.26} y={0.17} w={0.04} h={0.36} opacity={0.4} />
      <Falls f={f} x={0.458} y={0.37} w={0.016} h={0.13} opacity={0.4} />
      <Falls f={f} x={0.603} y={0.36} w={0.02} h={0.17} opacity={0.4} />
      <Falls f={f} x={0.755} y={0.35} w={0.035} h={0.19} opacity={0.4} />
      <Falls f={f} x={0.84} y={0.21} w={0.015} h={0.24} opacity={0.4} />
      <Ripple f={f} src={E} img={EP} top={0.52} bottom={0.61} strips={18} amp={3.5}
        mask="linear-gradient(to bottom, transparent 51%, #000 53.5%, #000 59%, transparent 61.5%)" />
      <Caustics f={f} top={0.6} opacity={0.2} />
      <Fish f={f} seed="fi" n={18} box={[0.05, 0.63, 0.95, 0.9]} colors={['#ff9a3c', '#ffb35c', '#cfe6ea', '#f07a2a']} />
      <Bubbles f={f} seed="bu" n={30} x={[0.05, 0.95]} from={0.7} surface={0.585} />
      <Motes f={f} seed="fd" n={60} box={[0.3, 0.0, 0.98, 0.5]} color="#f2ffc8" size={[1, 2.6]} rise={0.08} />
      <Motes f={f} seed="ff2" n={22} box={[0.0, 0.1, 0.3, 0.5]} color="#d8ff8a" size={[1.5, 3]} />
    </Camera>
    <Vignette strength={0.35} color="0,20,18" />
  </AbsoluteFill>;
};
