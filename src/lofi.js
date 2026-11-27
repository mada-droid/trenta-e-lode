/* Lofi generativo (offline): Web Audio, nessun file audio. Accordi jazz (maj9, m9, 13) su un piano
   elettrico morbido, basso, batteria boom-bap con swing, crepitio del vinile e qualche nota di melodia.
   Ogni 8 battute cambiano progressione e titolo; ogni tanto la batteria si ferma per due battute. */
'use strict';
window.Lofi = (() => {
  const Q = { maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], '7': [0, 4, 7, 10], '9': [0, 4, 10, 14], '13': [0, 4, 10, 14, 21], '9sus': [0, 5, 10, 14], m11: [0, 3, 10, 14, 17] };
  const PROGS = [
    [[2, 'm9'], [7, '13'], [0, 'maj9'], [9, 'm7']],
    [[0, 'maj7'], [9, 'm9'], [2, 'm7'], [7, '9sus']],
    [[9, 'm9'], [5, 'maj7'], [0, 'maj9'], [7, '9']],
    [[5, 'maj9'], [4, 'm7'], [2, 'm9'], [0, 'maj7']],
    [[0, 'm9'], [5, 'm11'], [10, 'maj7'], [3, 'maj9']],
    [[4, 'm7'], [9, '9'], [2, 'm9'], [7, '13']],
  ];
  const KEYS = [0, 2, 3, 5, 8, 10]; // C D Eb F Ab Bb
  const NAMES = ['Tea and integrals', 'Snow on the window', 'Desk lamp on', 'Convergent series', 'Study night', 'Cat on the books', 'Round window', 'A notable limit', 'Slow rain', 'Last Pomodoro', 'Taylor by moonlight', 'Squared notebook'];
  let ctx, out, keysBus, drumBus, melBus, vinyl, timer = null, playing = false, vol = 0.6;
  let bpm = 76, step = 0, nextT = 0, bar = 0, prog = PROGS[0], key = 0, name = NAMES[0], drumsOff = false, onChange = null;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const rand = a => a[Math.floor(Math.random() * a.length)];

  function init() {
    ctx = new AudioContext();
    out = ctx.createGain(); out.gain.value = vol;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; lp.Q.value = 0.3;
    out.connect(lp).connect(comp).connect(ctx.destination);
    keysBus = ctx.createGain(); keysBus.gain.value = 0.9;
    const kLp = ctx.createBiquadFilter(); kLp.type = 'lowpass'; kLp.frequency.value = 1900;
    const trem = ctx.createGain(); trem.gain.value = 1;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 3.6; lfoG.gain.value = 0.12; lfo.connect(lfoG).connect(trem.gain); lfo.start();
    keysBus.connect(kLp).connect(trem).connect(out);
    drumBus = ctx.createGain(); drumBus.gain.value = 0.75;
    const dLp = ctx.createBiquadFilter(); dLp.type = 'lowpass'; dLp.frequency.value = 5200; drumBus.connect(dLp).connect(out);
    melBus = ctx.createGain(); melBus.gain.value = 0.32;
    const dl = ctx.createDelay(1), fb = ctx.createGain(), mLp = ctx.createBiquadFilter();
    dl.delayTime.value = 60 / bpm * 0.75; fb.gain.value = 0.35; mLp.type = 'lowpass'; mLp.frequency.value = 2400;
    melBus.connect(mLp); mLp.connect(out); mLp.connect(dl); dl.connect(fb).connect(dl); dl.connect(out);
    // vinyl: hiss + random clicks, looped 6 s
    const len = ctx.sampleRate * 6, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * 0.012; if (Math.random() < 0.00035) d[i] += (Math.random() * 2 - 1) * 0.5; }
    vinyl = ctx.createBufferSource(); vinyl.buffer = buf; vinyl.loop = true;
    const vf = ctx.createBiquadFilter(); vf.type = 'bandpass'; vf.frequency.value = 3000; vf.Q.value = 0.4;
    const vg = ctx.createGain(); vg.gain.value = 0.55; vinyl.connect(vf).connect(vg).connect(out); vinyl.start();
  }
  let noiseBuf;
  function noise() {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }

  function epiano(n, t, dur, v = 0.07) {
    const f = midi(n), g = ctx.createGain(); env(g, t, 0.015, v, dur);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f * 2; o2.detune.value = (Math.random() - 0.5) * 8; g2.gain.value = 0.18;
    o1.detune.value = (Math.random() - 0.5) * 6;
    o1.connect(g); o2.connect(g2).connect(g); g.connect(keysBus);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  function bass(n, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = midi(n); lp.type = 'lowpass'; lp.frequency.value = 420;
    env(g, t, 0.02, 0.28, dur); o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.1);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    env(g, t, 0.004, 0.9, 0.38); o.connect(g).connect(drumBus); o.start(t); o.stop(t + 0.45);
    keysBus.gain.cancelScheduledValues(t); keysBus.gain.setValueAtTime(0.62, t); keysBus.gain.linearRampToValueAtTime(0.9, t + 0.28); // soft side-chain
  }
  function snare(t, v = 0.32) {
    const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.7; env(g, t, 0.003, v, 0.17);
    n.connect(bp).connect(g).connect(drumBus); n.start(t); n.stop(t + 0.25);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 190; env(og, t, 0.003, v * 0.5, 0.08); o.connect(og).connect(drumBus); o.start(t); o.stop(t + 0.12);
  }
  function hat(t, v = 0.07) {
    const n = noise(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 7200; env(g, t, 0.002, v, 0.04);
    n.connect(hp).connect(g).connect(drumBus); n.start(t); n.stop(t + 0.08);
  }
  function chordNotes(c) { const [deg, q] = c; const root = 48 + ((key + deg) % 12); return Q[q].map(i => root + i + (root + i < 55 ? 12 : 0)); }

  function newSection() {
    prog = rand(PROGS); key = rand(KEYS); name = rand(NAMES); bpm = rand([70, 72, 74, 76, 78, 80]);
    drumsOff = false; if (onChange) onChange(name);
  }
  function schedule() {
    const s16 = 60 / bpm / 4;
    while (nextT < ctx.currentTime + 0.6) {
      const st = step % 16, sw = st % 2 ? s16 * 0.22 : 0, t = nextT + sw;
      const ch = prog[Math.floor(bar / 2) % 4], beatsBar = bar % 2;
      if (st === 0 && beatsBar === 0) { chordNotes(ch).forEach((n, i) => epiano(n, t + i * 0.012, s16 * 30, 0.06)); bass(36 + ((key + ch[0]) % 12), t, s16 * 6); }
      if (st === 8 && beatsBar === 0 && Math.random() < 0.5) bass(36 + ((key + ch[0]) % 12) + rand([0, 7, 12]), t, s16 * 3);
      if (st === 0 && beatsBar === 1) { chordNotes(ch).slice(1).forEach((n, i) => epiano(n, t + i * 0.015, s16 * 12, 0.035)); bass(36 + ((key + ch[0]) % 12) + 7, t, s16 * 4); }
      if (!drumsOff) {
        if (st === 0 || st === 10 || (st === 7 && Math.random() < 0.3)) kick(t);
        if (st === 4 || st === 12) snare(t);
        if (st % 2 === 0) hat(t, st % 4 === 0 ? 0.07 : 0.045); else if (Math.random() < 0.15) hat(t, 0.025);
      }
      if (st % 4 === 2 && Math.random() < 0.28) { const sc = chordNotes(ch); epiano(rand(sc) + 12, t, s16 * 3, 0.045); }
      nextT += s16; step++;
      if (step % 16 === 0) {
        bar++;
        if (bar % 16 === 0) newSection();
        else if (bar % 16 === 12 && Math.random() < 0.35) drumsOff = true;
        else if (bar % 16 === 14) drumsOff = false;
      }
    }
  }
  return {
    get playing() { return playing; }, get name() { return name; },
    onChange(cb) { onChange = cb; },
    play() {
      if (!ctx) init();
      if (ctx.state === 'suspended') ctx.resume();
      if (playing) return; playing = true;
      out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setValueAtTime(0.0001, ctx.currentTime); out.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 1.5);
      nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 120); schedule();
    },
    pause() {
      if (!playing) return; playing = false; clearInterval(timer);
      out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setValueAtTime(out.gain.value, ctx.currentTime); out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      setTimeout(() => { if (!playing) ctx.suspend(); }, 900);
    },
    next() { newSection(); bar = 0; },
    volume(v) { vol = v; if (out && playing) out.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
})();
