// 교사용 API: 구성 만들기 · 불러오기 · 고치기 · 순위표 관리
// 구성 코드 + 편집 비밀번호로 본인 확인 (계정 없이)
import { randomInt, randomBytes } from 'node:crypto';
import { handler, rest, getOne, enc, HttpError, cleanCode, hashPassword, verifyPassword, newCode, isUuid, uploadImage } from './_lib.js';
import { validatePuzzles, cleanPuzzle, cleanCooldown } from '../js/game/answer.js';

const STORIES = ['seolhwa', 'hong', 'kimsatgat'];
const COUNT = 7;
const START_DELAY_MS = Number(process.env.ROOM_START_DELAY_MS ?? 5000); // 출발 전 카운트다운 (기본 5초)

function cleanConfig({ title, story, puzzles, cooldown }) {
  const t = String(title || '').trim().slice(0, 40);
  if (!t) throw new HttpError(400, '게임 제목을 입력해 주세요.');
  if (!STORIES.includes(story)) throw new HttpError(400, '이야기를 골라 주세요.');
  const errs = validatePuzzles(puzzles, COUNT);
  if (errs.length) throw new HttpError(400, errs.join('\n'));
  const ps = puzzles.map(cleanPuzzle);
  return { title: t, story, puzzles: ps, cooldown: cleanCooldown(cooldown) };
}

async function auth(code, password) {
  const c = await getOne('configs', `code=eq.${enc(cleanCode(code))}`);
  if (!c || !verifyPassword(password, c.edit_hash)) {
    await new Promise((r) => setTimeout(r, 600)); // 마구 대입 늦추기
    throw new HttpError(403, '구성 코드 또는 편집 비밀번호가 맞지 않아요.');
  }
  return c;
}
const finalSeq = () => Array.from({ length: COUNT }, () => 'NESW'[randomInt(4)]).join('');
// 편집 화면에서 올린 그림(data URL)은 Storage 에 저장하고 주소로 바꿈
async function storeImages(code, puzzles) {
  for (let i = 0; i < puzzles.length; i++) {
    const img = puzzles[i].image;
    if (img && img.startsWith('data:')) {
      puzzles[i].image = await uploadImage(`${code}/${i + 1}-${randomBytes(5).toString('hex')}`, img);
    }
  }
  return puzzles;
}
const publicFull = (c) => ({ code: c.code, title: c.title, story: c.story, puzzles: c.puzzles, cooldown: cleanCooldown(c.cooldown), updatedAt: c.updated_at });

export default handler({
  async create(body) {
    const cfg = cleanConfig(body);
    const pw = String(body.password || '');
    if (pw.length < 4) throw new HttpError(400, '편집 비밀번호는 4자 이상으로 정해 주세요.');
    for (let tries = 0; tries < 6; tries++) {
      const code = newCode(6);
      const exists = await getOne('configs', `code=eq.${code}`, 'code');
      if (exists) continue;
      await storeImages(code, cfg.puzzles);
      await rest('configs', { method: 'POST', body: { code, ...cfg, final_seq: finalSeq(), edit_hash: hashPassword(pw), status: 'waiting', round: 1 } });
      return { code };
    }
    throw new HttpError(500, '코드를 만들지 못했어요. 다시 시도해 주세요.');
  },

  async load({ code, password }) {
    return publicFull(await auth(code, password));
  },

  async update(body) {
    const c = await auth(body.code, body.password);
    const cfg = cleanConfig(body);
    await storeImages(c.code, cfg.puzzles);
    const rows = await rest(`configs?code=eq.${enc(c.code)}`, { method: 'PATCH', body: { ...cfg, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
    return publicFull(rows[0]);
  },

  async scores({ code, password }) {
    const c = await auth(code, password);
    const rows = await rest(`sessions?code=eq.${enc(c.code)}&round=eq.${c.round || 1}&select=id,nickname,started_at,finished_at,elapsed_ms,hints,score_ms,solved,hint_keys,wrong,last_seen&order=score_ms.asc.nullslast,started_at.desc&limit=500`);
    return {
      entries: rows.map((s) => ({
        id: s.id, nickname: s.nickname, startedAt: s.started_at, finishedAt: s.finished_at,
        elapsedMs: s.elapsed_ms == null ? null : Number(s.elapsed_ms), hints: s.finished_at ? s.hints : (s.hint_keys || []).length,
        scoreMs: s.score_ms == null ? null : Number(s.score_ms), solved: (s.solved || []).length, wrong: s.wrong || 0,
        online: !!s.last_seen && Date.now() - Date.parse(s.last_seen) < 25_000,
      })),
    };
  },

  async deleteScore({ code, password, session }) {
    const c = await auth(code, password);
    if (!isUuid(session)) throw new HttpError(400, '잘못된 기록이에요.');
    await rest(`sessions?id=eq.${session}&code=eq.${enc(c.code)}`, { method: 'DELETE' });
    return { ok: true };
  },

  async resetScores({ code, password }) {
    const c = await auth(code, password);
    await rest(`sessions?code=eq.${enc(c.code)}`, { method: 'DELETE' });
    return { ok: true };
  },

  // ---------------- 수업 진행 (대기실) ----------------
  async room({ code, password }) {
    const c = await auth(code, password);
    return roomInfo(c);
  },
  async roomStart({ code, password }) {
    const c = await auth(code, password);
    if ((c.status || 'playing') === 'playing') return roomInfo(c);
    // 모두 같은 순간에 출발하도록 5초 뒤를 시작 시각으로 잡음 (학생 화면은 그때까지 카운트다운)
    const startAt = c.status === 'ended' && c.room_started_at ? c.room_started_at : new Date(Date.now() + START_DELAY_MS).toISOString();
    const rows = await rest(`configs?code=eq.${enc(c.code)}`, { method: 'PATCH', body: { status: 'playing', room_started_at: startAt, room_ended_at: null }, prefer: 'return=representation' });
    return roomInfo(rows[0]);
  },
  async roomEnd({ code, password }) {
    const c = await auth(code, password);
    const rows = await rest(`configs?code=eq.${enc(c.code)}`, { method: 'PATCH', body: { status: 'ended', room_ended_at: new Date().toISOString() }, prefer: 'return=representation' });
    return roomInfo(rows[0]);
  },
  // 새 판: 다시 대기 상태로 (이전 판 학생은 처음부터 다시 들어와야 함)
  async roomReset({ code, password }) {
    const c = await auth(code, password);
    const rows = await rest(`configs?code=eq.${enc(c.code)}`, { method: 'PATCH', body: { status: 'waiting', round: (c.round || 1) + 1, room_started_at: null, room_ended_at: null }, prefer: 'return=representation' });
    return roomInfo(rows[0]);
  },
});

async function roomInfo(c) {
  const rows = await rest(`sessions?code=eq.${enc(c.code)}&round=eq.${c.round || 1}&select=finished_at,last_seen,solved&limit=1000`);
  const now = Date.now();
  const online = rows.filter((r) => r.last_seen && now - Date.parse(r.last_seen) < 25_000);
  return {
    status: c.status || 'playing', round: c.round || 1,
    startedAt: c.room_started_at ? Date.parse(c.room_started_at) : null,
    endedAt: c.room_ended_at ? Date.parse(c.room_ended_at) : null,
    now,
    counts: {
      total: rows.length,
      online: online.length,
      playing: online.filter((r) => !r.finished_at).length,
      finished: rows.filter((r) => r.finished_at).length,
    },
  };
}
