// 효과음 (파일 없이 Web Audio 로 합성)
const MUTE_KEY = 'hanok.muted';

export function createSfx() {
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* 무시 */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, { dur = 0.2, type = 'sine', vol = 0.3, at = 0, slide = 0, attack = 0.005 } = {}) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.3, vol = 0.2, at = 0, freq = 1200, q = 0.8, type = 'bandpass' } = {}) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  // 가야금: 감쇠하는 배음
  function pluck(freq, at = 0) {
    tone(freq, { dur: 1.4, type: 'triangle', vol: 0.25, at });
    tone(freq * 2, { dur: 0.8, type: 'sine', vol: 0.08, at });
    tone(freq * 3.01, { dur: 0.4, type: 'sine', vol: 0.04, at });
  }

  const SOUNDS = {
    click: () => tone(900, { dur: 0.05, type: 'square', vol: 0.05 }),
    tap: () => tone(620, { dur: 0.12, type: 'triangle', vol: 0.18 }),
    place: () => { tone(300, { dur: 0.15, type: 'triangle', vol: 0.25 }); tone(450, { dur: 0.2, vol: 0.1, at: 0.05 }); },
    page: () => noise({ dur: 0.25, vol: 0.12, freq: 3000, q: 0.5 }),
    get: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 0.3, type: 'triangle', vol: 0.2, at: i * 0.08 })),
    unlock: () => { noise({ dur: 0.08, vol: 0.3, freq: 2500 }); tone(880, { dur: 0.25, type: 'triangle', vol: 0.2, at: 0.08 }); tone(1320, { dur: 0.35, type: 'triangle', vol: 0.15, at: 0.18 }); },
    wrong: () => { tone(220, { dur: 0.25, type: 'sawtooth', vol: 0.08 }); tone(180, { dur: 0.3, type: 'sawtooth', vol: 0.08, at: 0.12 }); },
    door: () => { noise({ dur: 0.35, vol: 0.18, freq: 400, q: 1.5 }); tone(110, { dur: 0.3, vol: 0.15, slide: 0.7 }); },
    rustle: () => { noise({ dur: 0.35, vol: 0.25, freq: 2200, q: 0.4 }); noise({ dur: 0.25, vol: 0.18, freq: 3500, q: 0.5, at: 0.12 }); },
    bucket: () => { noise({ dur: 0.6, vol: 0.12, freq: 800, q: 2 }); tone(500, { dur: 0.15, vol: 0.1, at: 0.6, type: 'triangle' }); },
    lid: () => { tone(260, { dur: 0.2, type: 'triangle', vol: 0.2 }); noise({ dur: 0.15, vol: 0.1, freq: 900 }); },
    rumble: () => { noise({ dur: 2.2, vol: 0.5, freq: 90, q: 0.7, type: 'lowpass' }); tone(55, { dur: 2.2, vol: 0.25, attack: 0.3 }); },
    gayageum: () => [392, 440, 523, 587, 659].forEach((f, i) => pluck(f, i * 0.22)),
    treasure: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, { dur: 0.6, type: 'triangle', vol: 0.18, at: i * 0.1 })); noise({ dur: 1.2, vol: 0.06, freq: 6000, q: 0.3, at: 0.4 }); },
  };

  return {
    get muted() { return muted; },
    unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    setMuted(v) {
      muted = !!v;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* 무시 */ }
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    play(name) {
      if (muted) return;
      try { ensure(); if (ctx?.state === 'suspended') ctx.resume(); SOUNDS[name]?.(); } catch { /* 무시 */ }
    },
  };
}
