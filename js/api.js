// 서버와 주고받기 — 서버(Vercel /api/game)가 있으면 서버로, 없으면(체험판·미리보기) 이 기기 안에서 처리
import { checkAnswer, publicPuzzle, randomFinalSeq, normalizeDirection, cleanCooldown, registerWrong, lockedFor } from './game/answer.js';
import { HINT_PENALTY_MS } from './game/content.js';

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

async function post(url, body) {
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.', 0);
  }
  let data = null;
  try { data = await r.json(); } catch { /* 빈 응답 */ }
  if (!r.ok) throw new ApiError(data?.error || `서버 오류 (${r.status})`, r.status);
  return data;
}

export function createRemoteBackend(url = '/api/game') {
  const call = (action, body = {}) => post(url, { action, ...body });
  return {
    mode: 'remote',
    async available() {
      try { const d = await call('ping'); return !!d?.ok; } catch { return false; }
    },
    config: (code) => call('config', { code }),
    start: (code, nickname) => call('start', { code, nickname }),
    resume: (session) => call('resume', { session }),
    check: (session, puzzle, answer) => call('check', { session, puzzle, answer }),
    hint: (session, key) => call('hint', { session, key }),
    final: (session, seq) => call('final', { session, seq }),
    finish: (session, seq) => call('finish', { session, seq }),
    leaderboard: (code, session) => call('leaderboard', { code, session }),
  };
}

// 이 기기 안에서만 동작 (체험판 / 교사 미리보기). 순위표도 이 기기에만 저장
export function createLocalBackend(fullConfig, { persist = true } = {}) {
  const KEY = `hanok.local.${fullConfig.code}`;
  const load = () => {
    if (!persist) return mem;
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { sessions: {} }; } catch { return { sessions: {} }; }
  };
  let mem = { sessions: {} };
  const store = (db) => { mem = db; if (persist) try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* 무시 */ } };
  const db0 = load();
  if (!db0.finalSeq) { db0.finalSeq = randomFinalSeq(fullConfig.puzzles.length); store(db0); }
  const seq = () => load().finalSeq;
  const cd = cleanCooldown(fullConfig.cooldown);
  const pub = () => ({ code: fullConfig.code, title: fullConfig.title, story: fullConfig.story, puzzles: fullConfig.puzzles.map(publicPuzzle), cooldown: cd, local: true });
  const sess = (id) => {
    const s = load().sessions[id];
    if (!s) throw new ApiError('기록을 찾지 못했어요. 처음부터 다시 시작해 주세요.', 404);
    return s;
  };
  const put = (s) => { const db = load(); db.sessions[s.id] = s; store(db); };
  const fragments = (s) => s.solved.map((i) => ({ puzzle: i, order: i + 1, dir: seq()[i] }));
  return {
    mode: 'local',
    available: async () => true,
    config: async () => pub(),
    async start(code, nickname) {
      const s = { id: `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nickname, startedAt: Date.now(), solved: [], hintKeys: [], finishedAt: null };
      put(s);
      return { session: s.id, startedAt: s.startedAt, now: Date.now() };
    },
    async resume(id) {
      const s = sess(id);
      const pen = s.penalties || {};
      const locks = Object.fromEntries(Object.keys(pen).map((k) => [k, lockedFor(pen, k)]).filter(([, v]) => v > 0));
      return { code: fullConfig.code, nickname: s.nickname, startedAt: s.startedAt, now: Date.now(), solved: s.solved, hints: s.hintKeys.length, hintKeys: s.hintKeys, finished: !!s.finishedAt, result: s.result || null, fragments: fragments(s), locks };
    },
    async check(id, i, answer) {
      const s = sess(id);
      const key = `p${i}`;
      const left = lockedFor(s.penalties, key);
      if (left > 0) return { ok: false, locked: true, waitMs: left };
      const ok = checkAnswer(fullConfig.puzzles[i], answer);
      if (!ok) {
        const w = registerWrong(s.penalties || {}, key, cd);
        s.penalties = w.pen;
        put(s);
        return { ok: false, waitMs: w.waitMs, wrongCount: w.n };
      }
      if (!s.solved.includes(i)) { s.solved.push(i); put(s); }
      return { ok: true, fragment: { puzzle: i, order: i + 1, dir: seq()[i] } };
    },
    async hint(id, key) {
      const s = sess(id);
      if (!s.hintKeys.includes(key)) { s.hintKeys.push(key); put(s); }
      const m = /^p(\d+):t$/.exec(key);
      return { hints: s.hintKeys.length, text: m ? (fullConfig.puzzles[+m[1]]?.hint || '') : null };
    },
    async final(id, given) {
      const s = sess(id);
      if (s.solved.length < fullConfig.puzzles.length) throw new ApiError('아직 풀지 않은 문제가 있어요.', 400);
      const left = lockedFor(s.penalties, 'final');
      if (left > 0) return { ok: false, locked: true, waitMs: left };
      if (normalizeDirection(given) === seq()) return { ok: true };
      const w = registerWrong(s.penalties || {}, 'final', cd);
      s.penalties = w.pen;
      put(s);
      return { ok: false, waitMs: w.waitMs, wrongCount: w.n };
    },
    async finish(id, given) {
      const s = sess(id);
      if (s.solved.length < fullConfig.puzzles.length) throw new ApiError('아직 풀지 않은 문제가 있어요.', 400);
      if (normalizeDirection(given) !== seq()) return { ok: false };
      if (!s.finishedAt) {
        s.finishedAt = Date.now();
        const elapsedMs = s.finishedAt - s.startedAt;
        const hints = s.hintKeys.length;
        s.result = { elapsedMs, hints, scoreMs: elapsedMs + hints * HINT_PENALTY_MS };
        put(s);
      }
      const board = await this.leaderboard();
      s.result.rank = board.entries.findIndex((e) => e.id === s.id) + 1;
      return { ok: true, ...s.result };
    },
    async leaderboard() {
      const all = Object.values(load().sessions).filter((s) => s.finishedAt && s.result);
      all.sort((a, b) => a.result.scoreMs - b.result.scoreMs || a.finishedAt - b.finishedAt);
      return { entries: all.slice(0, 50).map((s) => ({ id: s.id, nickname: s.nickname, ...s.result, finishedAt: s.finishedAt })), total: all.length, local: true };
    },
  };
}
