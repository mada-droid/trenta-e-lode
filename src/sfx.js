// sfx.js — small interface sounds, synthesised with Web Audio (no audio files, works offline).
// Turned on/off with S.settings.uiSound. Every sound is short and quiet; the "reward" sounds get
// bigger the closer you are to a goal (today's plan, the daily Pomodoro goal, a whole phase).
const SFX = (() => {
  let ctx = null, out = null, lastHover = 0, hoverEl = null;
  const enabled = () => typeof S !== 'undefined' && S && S.settings && S.settings.uiSound !== false;
  function ac() {
    if (!ctx) {
      ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      out = ctx.createGain(); out.gain.value = 0.9; out.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // One enveloped oscillator note.
  function note(f, t0, dur, { type = 'sine', vol = 0.15, attack = 0.006, to = null, detune = 0 } = {}) {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // A soft "bell": fundamental + quiet octave, so it sounds warmer than a bare sine.
  function bell(f, t0, dur, vol) { note(f, t0, dur, { type: 'triangle', vol }); note(f * 2, t0, dur * 0.6, { vol: vol * 0.35 }); }
  // Filtered noise burst (marker swish, paper).
  function swish(t0, dur, vol, from = 3000, to = 800) {
    const c = ac(), n = Math.ceil(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(out); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  // Major pentatonic from C5: a tick climbs this ladder as the day fills up.
  const LADDER = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];
  const play = fn => { if (!enabled()) return; try { fn(ac().currentTime + 0.01); } catch (e) { console.warn(e); } };

  return {
    enabled,
    // Hovering a button / left tab: a very quiet, short tick (throttled, once per element).
    hover(el) {
      if (el === hoverEl) return; hoverEl = el;
      const now = performance.now(); if (now - lastHover < 45) return; lastHover = now;
      play(t => { note(el && el.closest('#menu') ? 1480 : 1760, t, 0.045, { vol: 0.028 }); });
    },
    hoverOut() { hoverEl = null; },
    // A task ticked: two rising notes whose pitch depends on how far along today is (0..1).
    tick(progress = 0) {
      const i = Math.max(0, Math.min(LADDER.length - 3, Math.round(progress * (LADDER.length - 3))));
      play(t => { bell(LADDER[i], t, 0.32, 0.12); bell(LADDER[i + 2], t + 0.075, 0.42, 0.12); });
    },
    // A task un-ticked: one low soft note going down.
    untick() { play(t => note(520, t, 0.18, { type: 'triangle', vol: 0.07, to: 330 })); },
    // Every task of today done: arpeggio + held chord + sparkles.
    dayDone() {
      play(t => {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + i * 0.09, 0.5, 0.11));
        const c = t + 0.4;
        [1046.5, 1318.51, 1567.98].forEach((f, i) => { note(f, c, 1.6, { type: 'triangle', vol: 0.07, attack: 0.03 }); note(f, c, 1.6, { vol: 0.04, attack: 0.03, detune: 7 + i }); });
        note(261.63, c, 1.4, { type: 'sine', vol: 0.12, attack: 0.02 });
        [2093, 2637, 3136, 2349, 2793].forEach((f, i) => note(f, c + 0.12 + i * 0.11, 0.25, { vol: 0.035 }));
      });
    },
    // The daily Pomodoro goal reached, all due flashcards reviewed, all overdue tasks recovered.
    goal() {
      play(t => {
        [587.33, 739.99, 880].forEach((f, i) => bell(f, t + i * 0.1, 0.4, 0.11));
        [1174.66, 1479.98].forEach(f => note(f, t + 0.32, 1.0, { type: 'triangle', vol: 0.07, attack: 0.02 }));
        note(293.66, t + 0.32, 0.9, { vol: 0.1, attack: 0.02 });
      });
    },
    // A whole phase of the plan completed: the biggest one.
    milestone() {
      play(t => {
        [392, 523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => bell(f, t + i * 0.08, 0.5, 0.1));
        const c = t + 0.55;
        [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((f, i) => { note(f, c, 2.2, { type: 'triangle', vol: 0.06, attack: 0.04 }); note(f, c, 2.2, { vol: 0.03, attack: 0.04, detune: -6 - i }); });
        note(130.81, c, 2, { vol: 0.13, attack: 0.03 });
        for (let i = 0; i < 9; i++) note(LADDER[(i * 3) % LADDER.length] * 2, c + 0.15 + i * 0.12, 0.22, { vol: 0.03 });
      });
    },
    // A day crossed out with an X: two marker strokes; un-crossing: a light eraser swish.
    cross(on) {
      play(t => {
        if (on) { swish(t, 0.13, 0.22, 2600, 900); swish(t + 0.16, 0.13, 0.22, 2800, 1000); note(180, t + 0.17, 0.12, { vol: 0.09, to: 90 }); }
        else swish(t, 0.16, 0.12, 1200, 3500);
      });
    },
  };
})();

// Hover sounds on buttons, left-menu tabs and anything clickable.
document.addEventListener('mouseover', e => {
  const el = e.target.closest('button, [data-go], [data-a], .act, .chip');
  if (el && !el.disabled) SFX.hover(el); else SFX.hoverOut();
});
