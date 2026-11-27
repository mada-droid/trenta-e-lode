// Two 120 s seamless loops built on the user's reference paintings (Lofi-References).
// The paintings stay the base layer; every added motion is periodic over D frames
// (integer cycles), so frame D == frame 0 and the video loops like a long gif.
import React from 'react';
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from 'remotion';

export const D = 3600;           // 120 s @ 30 fps
export const SW = 2160, SH = 1080; // 2:1, like the references (fits 16:9 and 21:9 screens)
const TAU = Math.PI * 2;
const ph = (f: number, k: number, p = 0) => TAU * k * f / D + p;
const osc = (f: number, k: number, p = 0) => Math.sin(ph(f, k, p));
const R = (s: string) => random(s);
const fr = (x: number) => x - Math.floor(x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

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
const Petals: React.FC<{ f: number; list: ReturnType<typeof makePetals>; opacity?: number; id: string }> = ({ f, list, opacity = 1, id }) => (
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
        <path d={PETAL} fill={q.col} /><path d="M0,-6 C2,-3 2,2 0,6" stroke="rgba(255,255,255,.45)" strokeWidth="1" fill="none" />
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

// Water ripple: horizontal strips of the same painting, displaced by a travelling wave.
const Ripple: React.FC<{ f: number; src: string; top: number; strips: number; amp: number; style?: React.CSSProperties }> = ({ f, src, top, strips, amp, style }) => {
  const y0 = top * SH, h = (SH - y0) / strips;
  return <AbsoluteFill style={{ WebkitMaskImage: `linear-gradient(to bottom, transparent ${y0 - 10}px, #000 ${y0 + 40}px)` }}>
    {Array.from({ length: strips }, (_, i) => {
      const depth = i / strips, dx = amp * (0.35 + depth) * Math.sin(ph(f, 30, i * 0.9)) + amp * 0.5 * Math.sin(ph(f, 47, i * 1.7 + 1));
      return <div key={i} style={{ position: 'absolute', left: 0, top: y0 + i * h, width: SW, height: h + 1, overflow: 'hidden' }}>
        <Img src={src} style={{ position: 'absolute', left: dx - 6, top: -(y0 + i * h), width: SW + 12, height: SH, ...style }} />
      </div>;
    })}
  </AbsoluteFill>;
};

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

// ── Scene 1: "Giardino di sakura · notte" (reference 1) ─────────────────
const S1 = staticFile('sakura-notte.jpg');
const S1_PETALS = makePetals({ n: 90, seed: 'sk', wind: 0.25, colors: ['#ff8fc0', '#ffb3d4', '#f06aa5', '#ffd0e4', '#e95c9a'], size: [9, 26] });
const S1_ORBS: [number, number, number][] = [[0.115, 0.94, 60], [0.33, 0.885, 40], [0.078, 0.632, 26], [0.985, 0.635, 26], [0.94, 0.838, 40], [0.71, 0.878, 30], [0.495, 0.888, 26], [0.792, 0.66, 22], [0.62, 0.79, 18], [0.21, 0.83, 18]];
const S1_LAMPS: [number, number, number][] = [[0.455, 0.628, 26], [0.548, 0.628, 26], [0.462, 0.592, 18], [0.528, 0.585, 18], [0.47, 0.335, 30], [0.505, 0.345, 30], [0.468, 0.465, 34], [0.51, 0.468, 34], [0.49, 0.52, 40]];

export const SakuraNotte: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: '#0a1620' }}>
    <Camera f={f}>
      <Img src={S1} style={{ position: 'absolute', inset: 0, width: SW, height: SH }} />
      {/* slow cloud drift across the open sky behind the pagoda */}
      <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: 'radial-gradient(ellipse 22% 26% at 60% 22%, #000 40%, transparent 100%)' }}>
        <Drift f={f} seed="c1" y={0.08} h={300} color="rgba(150,215,225,.5)" opacity={0.35} laps={1} blobs={7} blur={40} />
      </div>
      <Stars f={f} seed="st" n={90} box={[0.31, 0.0, 0.7, 0.26]} avoid={(x, y) => (Math.abs(x - 0.49) < 0.035 && y > 0.04)} />
      <Glow f={f} x={0.534} y={0.013} r={120} color="#bff6ff" k={2} base={0.55} amp={0.15} />
      {S1_LAMPS.map(([x, y, r], i) => <Glow key={'l' + i} f={f} x={x} y={y} r={r * 1.5} color="#ffbf6a" k={3 + i} p={i} base={0.45} amp={0.12} flicker />)}
      <Ripple f={f} src={S1} top={0.73} strips={34} amp={3} />
      {/* moving light glints on the pond */}
      <Motes f={f} seed="gl" n={40} box={[0.2, 0.76, 0.85, 0.99]} color="#9fe8ff" size={[1, 2.2]} />
      {S1_ORBS.map(([x, y, r], i) => <Glow key={'o' + i} f={f} x={x} y={y + 0.006 * osc(f, 4 + i, i)} r={r * 1.7} color="#ff9fc8" k={5 + 2 * i} p={i * 1.3} base={0.5} amp={0.3} />)}
      <Drift f={f} seed="mist" y={0.66} h={260} color="rgba(120,190,210,.55)" opacity={0.16} laps={1} dir={-1} />
      <Motes f={f} seed="ff" n={34} box={[0.05, 0.45, 0.95, 0.9]} color="#ffd38a" size={[1.5, 3.5]} rise={0.12} />
      <Petals f={f} list={S1_PETALS.filter(p => p.depth < 0.6)} id="pf" opacity={0.85} />
    </Camera>
    <Camera f={f} amp={1.6}><Petals f={f} list={S1_PETALS.filter(p => p.depth >= 0.6)} id="pn" /></Camera>
    <Vignette strength={0.55} color="4,10,18" />
  </AbsoluteFill>;
};

// ── Scene 2: "Tempio di primavera → Castello tra le nuvole" (refs 2 + 3) ─
const T2 = staticFile('tempio-primavera.jpg'), C3 = staticFile('castello-nuvole.jpg');
const T_PETALS = makePetals({ n: 80, seed: 'tp', wind: -0.35, colors: ['#ffffff', '#ffe8ee', '#ffc9d6', '#f7a8b8', '#e86b6b'], size: [8, 24] });
// castle weight: temple 0–55 s, cloud transition 55–65 s, castle 65–115 s, back to temple across the loop point.
const castleW = (f: number) => { const g = (f + 150) % D; return g < 300 ? 1 - smooth(g / 300) : g < 1800 ? 0 : g < 2100 ? smooth((g - 1800) / 300) : 1; };
const transAmt = (f: number) => { const g = (f + 150) % D; const d = Math.min(Math.abs(g - 1950), Math.abs(g - 150), Math.abs(g + D - 1950)); return clamp01(1 - d / 210); };

const Temple: React.FC<{ f: number }> = ({ f }) => <Camera f={f}>
  {/* 16:9 painting covering the 2:1 frame */}
  <Img src={T2} style={{ position: 'absolute', left: 0, top: -68, width: SW, height: 1215 }} />
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 45% 55% at 34% 8%, rgba(255,246,225,${0.18 + 0.06 * osc(f, 2)}), transparent 70%)`, mixBlendMode: 'screen' }} />
  {/* sun shafts */}
  <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.16 + 0.05 * osc(f, 3, 1) }}>
    <div style={{ position: 'absolute', left: -400, top: -900, width: 1800, height: 1800, transform: `rotate(${18 + 3 * osc(f, 1)}deg)`, transformOrigin: '50% 50%',
      background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,240,210,.0) 0deg 6deg, rgba(255,240,210,.35) 7deg 9deg, rgba(255,240,210,0) 10deg 17deg)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 62%)' }} />
  </AbsoluteFill>
  <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 22%, transparent 42%)' }}>
    <Drift f={f} seed="tc" y={0.02} h={330} color="rgba(255,255,255,.8)" opacity={0.22} laps={1} blobs={8} blur={34} dir={-1} />
  </div>
  <Glow f={f} x={0.076} y={0.865} r={70} color="#ffb36b" k={5} base={0.5} amp={0.12} flicker />
  <Glow f={f} x={0.69} y={0.58} r={90} color="#ffffff" k={2} base={0.12} amp={0.08} />
  <Birds f={f} seed="b1" n={5} y={[0.1, 0.2]} color="rgba(40,45,60,.75)" laps={2} />
  <Motes f={f} seed="pol" n={26} box={[0.0, 0.3, 1.0, 0.95]} color="#fff4d6" size={[1, 2.4]} />
  <Petals f={f} list={T_PETALS} id="tp" />
</Camera>;

const Castle: React.FC<{ f: number }> = ({ f }) => {
  const sh = fr(f * 3 / D);                // three shooting stars per loop
  const shoot = sh < 0.03 ? sh / 0.03 : -1;
  return <Camera f={f}>
    <Img src={C3} style={{ position: 'absolute', inset: 0, width: SW, height: SH }} />
    {/* aurora shimmer: the same sky with shifting hue, masked to the upper sky */}
    <Img src={C3} style={{ position: 'absolute', inset: 0, width: SW, height: SH, filter: `hue-rotate(${40 * osc(f, 2)}deg) saturate(1.5)`, opacity: 0.55,
      WebkitMaskImage: `radial-gradient(ellipse 40% 45% at ${30 + 4 * osc(f, 1)}% 12%, #000 0%, transparent 100%)` }} />
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.35 + 0.15 * osc(f, 4, 2),
      background: `linear-gradient(${115 + 8 * osc(f, 1, 1)}deg, transparent 22%, rgba(255,90,200,.22) 30%, rgba(120,90,255,.18) 38%, rgba(80,220,255,.14) 46%, transparent 55%)`,
      WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 30%, transparent 55%)' }} />
    <Stars f={f} seed="cs" n={110} box={[0.55, 0.0, 1.0, 0.33]} />
    <Stars f={f} seed="cs2" n={50} box={[0.0, 0.0, 0.25, 0.28]} />
    <Glow f={f} x={0.0} y={0.4} r={420} color="#ffe2b0" k={2} base={0.4} amp={0.12} />
    {shoot >= 0 && <div style={{ position: 'absolute', left: (0.62 + 0.25 * shoot) * SW, top: (0.04 + 0.12 * shoot) * SH, width: 220, height: 2, opacity: Math.sin(Math.PI * shoot),
      transform: 'rotate(26deg)', transformOrigin: '100% 50%', background: 'linear-gradient(to left, #fff, rgba(255,255,255,0))', boxShadow: '0 0 8px #bfe9ff' }} />}
    <Birds f={f} seed="b2" n={7} y={[0.22, 0.36]} color="rgba(30,25,40,.8)" laps={3} />
    <Motes f={f} seed="sp" n={70} box={[0.28, 0.12, 0.8, 0.72]} color="#fff2c8" size={[1, 2.6]} rise={0.18} />
    {[0.25, 0.31, 0.57, 0.44].map((x, i) => <Glow key={i} f={f} x={x} y={[0.34, 0.37, 0.43, 0.6][i]} r={16} color="#ffd88a" k={7 + i} p={i} base={0.35} amp={0.2} flicker />)}
    {/* sea of clouds drifting around the mountain */}
    <Drift f={f} seed="cl1" y={0.62} h={330} color="rgba(255,250,245,.9)" opacity={0.42} laps={1} blobs={10} blur={26} />
    <Drift f={f} seed="cl2" y={0.8} h={260} color="rgba(255,240,235,.95)" opacity={0.55} laps={2} blobs={9} blur={22} dir={-1} />
  </Camera>;
};

// Cloud bank that sweeps through during the transitions.
const CloudWipe: React.FC<{ f: number }> = ({ f }) => {
  const a = transAmt(f);
  if (a <= 0) return null;
  return <AbsoluteFill style={{ opacity: a * 0.9 }}>
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(255,250,246,.85), rgba(255,236,240,.55) 60%, rgba(255,236,240,.2))' }} />
    {[0, 1, 2].map(i => <Drift key={i} f={f} seed={'w' + i} y={-0.1 + i * 0.32} h={520} color="rgba(255,255,255,.95)" opacity={0.85} laps={4 + i} blobs={8} blur={30} dir={i % 2 ? -1 : 1} />)}
  </AbsoluteFill>;
};

export const TempioCastello: React.FC = () => {
  const f = useCurrentFrame(), w = castleW(f);
  return <AbsoluteFill style={{ background: '#a9c3df' }}>
    {w < 1 && <AbsoluteFill><Temple f={f} /></AbsoluteFill>}
    {w > 0 && <AbsoluteFill style={{ opacity: w }}><Castle f={f} /></AbsoluteFill>}
    <CloudWipe f={f} />
    <Vignette strength={0.38} color="20,16,40" />
  </AbsoluteFill>;
};
