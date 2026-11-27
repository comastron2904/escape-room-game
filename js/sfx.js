// 효과음 (파일 없이 Web Audio 로 합성)
const MUTE_KEY = 'hanok.muted';
const MUSIC_KEY = 'hanok.music';
const MUSIC_VOL = 0.11; // 배경음악 크기 (은은하게)

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
    crack: () => { noise({ dur: 0.18, vol: 0.35, freq: 4200, q: 0.6 }); noise({ dur: 0.4, vol: 0.2, freq: 2500, q: 1.2, at: 0.12 }); tone(1800, { dur: 0.3, type: 'triangle', vol: 0.06, at: 0.1, slide: 0.5 }); },
    zap: () => { noise({ dur: 0.25, vol: 0.3, freq: 3000, q: 0.5 }); tone(140, { dur: 0.4, type: 'sawtooth', vol: 0.06, slide: 2.5 }); },
    thunder: () => { noise({ dur: 0.25, vol: 0.45, freq: 1800, q: 0.4 }); noise({ dur: 3.2, vol: 0.55, freq: 120, q: 0.6, type: 'lowpass', at: 0.08 }); tone(45, { dur: 2.6, vol: 0.18, attack: 0.2, at: 0.1 }); },
    thunderFar: () => { noise({ dur: 3.0, vol: 0.32, freq: 90, q: 0.6, type: 'lowpass' }); tone(40, { dur: 2.4, vol: 0.1, attack: 0.5 }); },
    gayageum: () => [392, 440, 523, 587, 659].forEach((f, i) => pluck(f, i * 0.22)),
    treasure: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, { dur: 0.6, type: 'triangle', vol: 0.18, at: i * 0.1 })); noise({ dur: 1.2, vol: 0.06, freq: 6000, q: 0.3, at: 0.4 }); },
  };

  // =========================================================
  // 배경음악: 국악 5음계(평조 느낌)로 가야금 같은 음을 느리게 뜯고, 아래에 잔잔한 지속음을 깜
  // 파일 없이 실시간으로 만들어 매번 조금씩 다르게 흘러감
  // =========================================================
  let musicOn = true;
  try { musicOn = localStorage.getItem(MUSIC_KEY) !== '0'; } catch { /* 무시 */ }
  let music = null;
  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SCALE = [0, 2, 4, 7, 9];             // 5음계 (도 레 미 솔 라)
  const ROOT = 55;                            // G3
  const CHORDS = [[0, 7], [-3, 4], [-5, 2], [2, 9]]; // 지속음 (근음 + 5도)
  const BEAT = 60 / 62;                       // 느린 박자

  function buildMusic() {
    const c = ensure();
    if (!c || music) return music;
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(c.destination);
    // 간단한 울림(리버브): 서로 다른 길이의 지연 두 개를 되먹임
    const wet = c.createGain(); wet.gain.value = 0.35;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const d1 = c.createDelay(2), d2 = c.createDelay(2);
    d1.delayTime.value = 0.37; d2.delayTime.value = 0.53;
    const fb1 = c.createGain(), fb2 = c.createGain();
    fb1.gain.value = 0.42; fb2.gain.value = 0.38;
    const dry = c.createGain(); dry.gain.value = 1;
    dry.connect(out);
    dry.connect(d1); dry.connect(d2);
    d1.connect(fb1).connect(lp); d2.connect(fb2).connect(lp);
    lp.connect(d1); lp.connect(d2);
    lp.connect(wet).connect(out);
    music = { out, dry, nextT: 0, beat: 0, deg: 7, chord: 0, timer: 0, padNodes: [] };
    return music;
  }

  function mPluck(freq, t, vol = 0.22) {
    const c = ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 6, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 1.2);
    for (const [mul, type, v] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3.01, 'sine', 0.12]]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq * mul, t);
      // 농현(살짝 떠는 소리)
      o.frequency.linearRampToValueAtTime(freq * mul * 1.004, t + 0.6);
      o.frequency.linearRampToValueAtTime(freq * mul, t + 1.2);
      const og = c.createGain(); og.gain.value = v;
      o.connect(og).connect(f);
      o.start(t); o.stop(t + 2.7);
    }
    f.connect(g).connect(music.dry);
  }

  function mPad(chord, t, dur) {
    const c = ctx;
    for (const iv of chord) {
      for (const det of [-4, 4]) {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = NOTE(ROOT - 12 + iv);
        o.detune.value = det;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
        o.connect(g).connect(music.dry);
        o.start(t); o.stop(t + dur + 0.6);
      }
    }
  }

  function degToMidi(deg) {
    const oct = Math.floor(deg / 5), k = ((deg % 5) + 5) % 5;
    return ROOT + oct * 12 + SCALE[k];
  }

  // 0.5초 앞까지 미리 음을 예약 (탭이 잠깐 느려져도 끊기지 않게)
  function schedule() {
    if (!music || !ctx) return;
    const ahead = ctx.currentTime + 0.6;
    while (music.nextT < ahead) {
      const t = music.nextT;
      const b = music.beat;
      if (b % 16 === 0) {
        music.chord = (music.chord + (Math.random() < 0.7 ? 1 : 2)) % CHORDS.length;
        mPad(CHORDS[music.chord], t, BEAT * 16);
      }
      const phraseEnd = b % 8 === 7;
      if (phraseEnd) {
        // 악구 끝: 쉬거나 으뜸음으로 마무리
        if (Math.random() < 0.6) mPluck(NOTE(degToMidi(Math.round(music.deg / 5) * 5)), t, 0.16);
      } else if (Math.random() < (b % 2 === 0 ? 0.72 : 0.32)) {
        const step = [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)];
        music.deg = Math.max(3, Math.min(12, music.deg + step));
        mPluck(NOTE(degToMidi(music.deg)), t, 0.14 + Math.random() * 0.08);
        // 가끔 꾸밈음
        if (Math.random() < 0.15) mPluck(NOTE(degToMidi(music.deg + 1)), t + BEAT * 0.33, 0.08);
      }
      music.beat++;
      music.nextT += BEAT * (Math.random() < 0.1 ? 1.5 : 1);
    }
  }

  function applyMusicGain(fade = 2.5) {
    if (!music) return;
    const g = music.out.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(musicOn && !document.hidden ? MUSIC_VOL : 0, now + fade);
  }

  function startMusic() {
    if (!buildMusic()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!music.timer) {
      music.nextT = ctx.currentTime + 0.3;
      music.timer = setInterval(schedule, 200);
      document.addEventListener('visibilitychange', () => applyMusicGain(0.5));
    }
    applyMusicGain(3);
  }

  return {
    get muted() { return muted; },
    get musicOn() { return musicOn; },
    startMusic,
    setMusic(v) {
      musicOn = !!v;
      try { localStorage.setItem(MUSIC_KEY, musicOn ? '1' : '0'); } catch { /* 무시 */ }
      if (musicOn) startMusic(); else applyMusicGain(0.6);
    },
    // 장소에 따라 음악 크기 조절 (지하·별당은 더 조용히)
    setMusicLevel(k) {
      if (!music) return;
      const g = music.out.gain, now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(musicOn && !document.hidden ? MUSIC_VOL * k : 0, now + 1.5);
    },
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
