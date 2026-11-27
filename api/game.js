// 학생용 API: 구성 불러오기 · 시작(서버가 시간 기록) · 정답 확인 · 힌트 · 탈출 기록 · 순위표
import { handler, rest, getOne, enc, HttpError, cleanCode, cleanName, isUuid } from './_lib.js';
import { checkAnswer, publicPuzzle, normalizeDirection, cleanCooldown, registerWrong, lockedFor } from '../js/game/answer.js';

const HINT_PENALTY_MS = 60_000;
const HINT_KEY = /^(intro|p\d|final|treasure):\d$|^p\d:t$/;

async function loadConfig(code) {
  const c = await getOne('configs', `code=eq.${enc(cleanCode(code))}`);
  if (!c) throw new HttpError(404, '그런 구성 코드가 없어요. 선생님께 코드를 다시 확인해 주세요.');
  return c;
}
async function loadSession(id) {
  if (!isUuid(id)) throw new HttpError(404, '기록을 찾지 못했어요.');
  const s = await getOne('sessions', `id=eq.${id}`);
  if (!s) throw new HttpError(404, '기록을 찾지 못했어요.');
  return s;
}
const fragmentsOf = (s, seq) => (s.solved || []).map((i) => ({ puzzle: i, order: i + 1, dir: seq[i] }));
const resultOf = (s) => (s.finished_at ? { elapsedMs: Number(s.elapsed_ms), hints: s.hints, scoreMs: Number(s.score_ms) } : null);

async function rankOf(code, scoreMs) {
  const { count } = await rest(`sessions?code=eq.${enc(code)}&finished_at=not.is.null&score_ms=lt.${scoreMs}&select=id&limit=1`, { count: true });
  return count + 1;
}

export default handler({
  async ping() {
    await rest('configs?select=code&limit=1');
    return { ok: true };
  },

  async config({ code }) {
    const c = await loadConfig(code);
    return { code: c.code, title: c.title, story: c.story, puzzles: (c.puzzles || []).map(publicPuzzle), cooldown: cleanCooldown(c.cooldown) };
  },

  async start({ code, nickname }) {
    const c = await loadConfig(code);
    const name = cleanName(nickname);
    if (!name) throw new HttpError(400, '이름을 입력해 주세요.');
    const rows = await rest('sessions', { method: 'POST', body: { code: c.code, nickname: name }, prefer: 'return=representation' });
    const s = rows[0];
    return { session: s.id, startedAt: Date.parse(s.started_at), now: Date.now() };
  },

  async resume({ session }) {
    const s = await loadSession(session);
    const c = await loadConfig(s.code);
    const r = resultOf(s);
    if (r) r.rank = await rankOf(s.code, r.scoreMs);
    return {
      code: s.code, nickname: s.nickname, startedAt: Date.parse(s.started_at), now: Date.now(),
      solved: s.solved || [], hints: (s.hint_keys || []).length, hintKeys: s.hint_keys || [],
      finished: !!s.finished_at, result: r, fragments: fragmentsOf(s, c.final_seq),
      locks: Object.fromEntries(Object.keys(s.penalties || {}).map((k) => [k, lockedFor(s.penalties, k)]).filter(([, v]) => v > 0)),
    };
  },

  async check({ session, puzzle, answer }) {
    const s = await loadSession(session);
    const c = await loadConfig(s.code);
    const i = Number(puzzle);
    if (!Number.isInteger(i) || i < 0 || i >= c.puzzles.length) throw new HttpError(400, '잘못된 문제 번호예요.');
    const key = `p${i}`;
    const pen = s.penalties || {};
    // 대기 시간이 남아 있으면 채점하지 않음 (새로고침해도 유지)
    const left = lockedFor(pen, key);
    if (left > 0) return { ok: false, locked: true, waitMs: left };
    const ok = String(answer ?? '').length <= 40 && checkAnswer(c.puzzles[i], answer);
    if (!ok) {
      const w = registerWrong(pen, key, c.cooldown);
      await rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { wrong: (s.wrong || 0) + 1, penalties: w.pen } });
      return { ok: false, waitMs: w.waitMs, wrongCount: w.n };
    }
    if (!(s.solved || []).includes(i)) {
      await rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { solved: [...(s.solved || []), i].sort((a, b) => a - b) } });
    }
    return { ok: true, fragment: { puzzle: i, order: i + 1, dir: c.final_seq[i] } };
  },

  async hint({ session, key }) {
    const s = await loadSession(session);
    if (!HINT_KEY.test(String(key || ''))) throw new HttpError(400, '잘못된 힌트예요.');
    const keys = s.hint_keys || [];
    if (!keys.includes(key) && !s.finished_at) {
      keys.push(key);
      await rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { hint_keys: keys } });
    }
    let text = null;
    const m = /^p(\d):t$/.exec(key);
    if (m) {
      const c = await loadConfig(s.code);
      text = c.puzzles[+m[1]]?.hint || '';
    }
    return { hints: keys.length, text };
  },

  async final({ session, seq }) {
    const s = await loadSession(session);
    const c = await loadConfig(s.code);
    if ((s.solved || []).length < c.puzzles.length) throw new HttpError(400, '아직 풀지 않은 문제가 있어요.');
    const pen = s.penalties || {};
    const left = lockedFor(pen, 'final');
    if (left > 0) return { ok: false, locked: true, waitMs: left };
    if (normalizeDirection(seq) === c.final_seq) return { ok: true };
    const w = registerWrong(pen, 'final', c.cooldown);
    await rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { wrong: (s.wrong || 0) + 1, penalties: w.pen } });
    return { ok: false, waitMs: w.waitMs, wrongCount: w.n };
  },

  async finish({ session, seq }) {
    const s = await loadSession(session);
    const c = await loadConfig(s.code);
    if ((s.solved || []).length < c.puzzles.length) throw new HttpError(400, '아직 풀지 않은 문제가 있어요.');
    if (normalizeDirection(seq) !== c.final_seq) return { ok: false };
    let r = resultOf(s);
    if (!r) {
      const finished = Date.now();
      const elapsedMs = Math.max(0, finished - Date.parse(s.started_at));
      const hints = (s.hint_keys || []).length;
      r = { elapsedMs, hints, scoreMs: elapsedMs + hints * HINT_PENALTY_MS };
      await rest(`sessions?id=eq.${s.id}&finished_at=is.null`, {
        method: 'PATCH',
        body: { finished_at: new Date(finished).toISOString(), elapsed_ms: elapsedMs, hints, score_ms: r.scoreMs },
      });
    }
    r.rank = await rankOf(s.code, r.scoreMs);
    return { ok: true, ...r };
  },

  async leaderboard({ code, session }) {
    const cc = cleanCode(code);
    const { data, count } = await rest(
      `sessions?code=eq.${enc(cc)}&finished_at=not.is.null&select=id,nickname,elapsed_ms,hints,score_ms,finished_at&order=score_ms.asc,finished_at.asc&limit=50`,
      { count: true },
    );
    return {
      total: count,
      entries: (data || []).map((s) => ({
        nickname: s.nickname, elapsedMs: Number(s.elapsed_ms), hints: s.hints, scoreMs: Number(s.score_ms),
        finishedAt: s.finished_at, me: !!session && s.id === session,
      })),
    };
  },
});
