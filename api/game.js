// 학생용 API: 구성 불러오기 · 대기실 입장 · 상태 확인 · 정답 확인 · 힌트 · 탈출 기록 · 순위표
// 방 상태(configs.status): waiting 대기 → playing 진행 → ended 종료 (교사가 바꿈)
// 시간은 "교사가 시작을 누른 시각"(늦게 들어온 학생은 들어온 시각)부터 서버가 잽니다.
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
// 세션 + 구성 + 같은 판인지 확인
async function load(session) {
  const s = await loadSession(session);
  const c = await loadConfig(s.code);
  if ((s.round || 1) !== (c.round || 1)) throw new HttpError(410, '선생님이 새 판을 열었어요. 처음 화면에서 다시 들어와 주세요.');
  return { s, c };
}
const statusOf = (c) => c.status || 'playing';
// 이 학생의 실제 시작 시각 (ms) — 방이 시작되기 전이면 null
function effectiveStart(s, c) {
  if (statusOf(c) === 'waiting') return null;
  const joined = Date.parse(s.started_at);
  const room = c.room_started_at ? Date.parse(c.room_started_at) : joined;
  return Math.max(joined, room);
}
function mustPlay(c) {
  const st = statusOf(c);
  if (st === 'playing' && c.room_started_at && Date.now() < Date.parse(c.room_started_at)) throw new HttpError(409, '곧 시작해요! 카운트다운이 끝나면 출발해요.');
  if (st === 'waiting') throw new HttpError(409, '아직 시작 전이에요. 선생님이 시작하면 함께 출발해요.');
  if (st === 'ended') throw new HttpError(409, '선생님이 게임을 종료했어요.');
}
const fragmentsOf = (s, seq) => (s.solved || []).map((i) => ({ puzzle: i, order: i + 1, dir: seq[i] }));
const resultOf = (s) => (s.finished_at ? { elapsedMs: Number(s.elapsed_ms), hints: s.hints, scoreMs: Number(s.score_ms) } : null);
const roundOf = (c) => c.round || 1;

async function rankOf(c, scoreMs) {
  const { count } = await rest(`sessions?code=eq.${enc(c.code)}&round=eq.${roundOf(c)}&finished_at=not.is.null&score_ms=lt.${scoreMs}&select=id&limit=1`, { count: true });
  return count + 1;
}
// 최근 접속 중인 인원 (대기실 표시용)
async function roomCounts(c) {
  const rows = await rest(`sessions?code=eq.${enc(c.code)}&round=eq.${roundOf(c)}&select=finished_at,last_seen&limit=1000`);
  const now = Date.now();
  const active = rows.filter((r) => r.last_seen && now - Date.parse(r.last_seen) < 25_000);
  return { online: active.length, finished: rows.filter((r) => r.finished_at).length, total: rows.length };
}
const touch = (s) => rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { last_seen: new Date().toISOString() } });

export default handler({
  async ping() {
    await rest('configs?select=code&limit=1');
    return { ok: true };
  },

  async config({ code }) {
    const c = await loadConfig(code);
    return { code: c.code, title: c.title, story: c.story, puzzles: (c.puzzles || []).map(publicPuzzle), cooldown: cleanCooldown(c.cooldown), status: statusOf(c) };
  },

  // 대기실 입장 (방이 진행 중이면 바로 시작)
  async start({ code, nickname }) {
    const c = await loadConfig(code);
    if (statusOf(c) === 'ended') throw new HttpError(409, '이 방은 선생님이 종료했어요. 선생님께 다시 열어 달라고 해 주세요.');
    const name = cleanName(nickname);
    if (!name) throw new HttpError(400, '이름을 입력해 주세요.');
    const rows = await rest('sessions', { method: 'POST', body: { code: c.code, nickname: name, round: roundOf(c), last_seen: new Date().toISOString() }, prefer: 'return=representation' });
    const s = rows[0];
    return { session: s.id, status: statusOf(c), startedAt: effectiveStart(s, c), now: Date.now() };
  },

  // 대기실·게임 중 주기적으로 확인 (접속 표시 겸)
  async status({ session }) {
    const { s, c } = await load(session);
    await touch(s);
    const counts = await roomCounts(c);
    return { status: statusOf(c), startedAt: effectiveStart(s, c), now: Date.now(), finished: !!s.finished_at, ...counts };
  },

  async resume({ session }) {
    const { s, c } = await load(session);
    const r = resultOf(s);
    if (r) r.rank = await rankOf(c, r.scoreMs);
    await touch(s);
    return {
      code: s.code, nickname: s.nickname, status: statusOf(c), startedAt: effectiveStart(s, c), now: Date.now(),
      solved: s.solved || [], hints: (s.hint_keys || []).length, hintKeys: s.hint_keys || [],
      finished: !!s.finished_at, result: r, fragments: fragmentsOf(s, c.final_seq),
      locks: Object.fromEntries(Object.keys(s.penalties || {}).map((k) => [k, lockedFor(s.penalties, k)]).filter(([, v]) => v > 0)),
    };
  },

  async check({ session, puzzle, answer }) {
    const { s, c } = await load(session);
    mustPlay(c);
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
      await rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { wrong: (s.wrong || 0) + 1, penalties: w.pen, last_seen: new Date().toISOString() } });
      return { ok: false, waitMs: w.waitMs, wrongCount: w.n };
    }
    if (!(s.solved || []).includes(i)) {
      await rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { solved: [...(s.solved || []), i].sort((a, b) => a - b), last_seen: new Date().toISOString() } });
    }
    return { ok: true, fragment: { puzzle: i, order: i + 1, dir: c.final_seq[i] } };
  },

  async hint({ session, key }) {
    const { s, c } = await load(session);
    mustPlay(c);
    if (!HINT_KEY.test(String(key || ''))) throw new HttpError(400, '잘못된 힌트예요.');
    const keys = s.hint_keys || [];
    if (!keys.includes(key) && !s.finished_at) {
      keys.push(key);
      await rest(`sessions?id=eq.${s.id}`, { method: 'PATCH', body: { hint_keys: keys } });
    }
    let text = null;
    const m = /^p(\d):t$/.exec(key);
    if (m) text = c.puzzles[+m[1]]?.hint || '';
    return { hints: keys.length, text };
  },

  async final({ session, seq }) {
    const { s, c } = await load(session);
    mustPlay(c);
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
    const { s, c } = await load(session);
    let r = resultOf(s);
    if (!r) {
      mustPlay(c);
      if ((s.solved || []).length < c.puzzles.length) throw new HttpError(400, '아직 풀지 않은 문제가 있어요.');
      if (normalizeDirection(seq) !== c.final_seq) return { ok: false };
      const finished = Date.now();
      const elapsedMs = Math.max(0, finished - effectiveStart(s, c));
      const hints = (s.hint_keys || []).length;
      r = { elapsedMs, hints, scoreMs: elapsedMs + hints * HINT_PENALTY_MS };
      await rest(`sessions?id=eq.${s.id}&finished_at=is.null`, {
        method: 'PATCH',
        body: { finished_at: new Date(finished).toISOString(), elapsed_ms: elapsedMs, hints, score_ms: r.scoreMs },
      });
    }
    r.rank = await rankOf(c, r.scoreMs);
    return { ok: true, ...r };
  },

  async leaderboard({ code, session }) {
    const c = await loadConfig(code);
    const { data, count } = await rest(
      `sessions?code=eq.${enc(c.code)}&round=eq.${roundOf(c)}&finished_at=not.is.null&select=id,nickname,elapsed_ms,hints,score_ms,finished_at&order=score_ms.asc,finished_at.asc&limit=50`,
      { count: true },
    );
    return {
      total: count,
      status: statusOf(c),
      entries: (data || []).map((s) => ({
        nickname: s.nickname, elapsedMs: Number(s.elapsed_ms), hints: s.hints, scoreMs: Number(s.score_ms),
        finishedAt: s.finished_at, me: !!session && s.id === session,
      })),
    };
  },
});
