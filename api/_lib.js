// 서버 공용 도구 (Vercel 서버리스 함수)
// Supabase 는 서버에서만 service_role 키로 접근합니다. (브라우저에는 키가 나가지 않음)
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function env() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!url || !key) throw new HttpError(500, '서버 설정이 끝나지 않았어요. (Vercel 환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 확인)');
  return { url, key };
}

// Supabase 오류를 선생님이 고칠 수 있는 말로 바꿈
function explainDbError(status, text) {
  let e = {};
  try { e = JSON.parse(text); } catch { /* 무시 */ }
  const msg = `${e.code || ''} ${e.message || text || ''}`;
  if (status === 401 || status === 403 || /JWT|Invalid API key|permission denied/i.test(msg)) {
    return '데이터베이스 요청에 실패했어요: Supabase 키가 맞지 않아요. Vercel 환경변수 SUPABASE_SERVICE_ROLE_KEY 에 service_role(또는 secret) 키를 넣고 Redeploy 해 주세요.';
  }
  if (/PGRST204|PGRST205|42703|42P01|column|schema cache|does not exist/i.test(msg)) {
    return `데이터베이스 요청에 실패했어요: 테이블이 최신 상태가 아니에요. Supabase SQL Editor 에서 supabase/schema.sql 을 다시 실행해 주세요. (${(e.message || '').slice(0, 120)})`;
  }
  return `데이터베이스 요청에 실패했어요. (${status} ${(e.message || text || '').slice(0, 120)})`;
}

// PostgREST 호출
export async function rest(path, { method = 'GET', body, prefer, count = false } = {}) {
  const { url, key } = env();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const pref = [prefer, count ? 'count=exact' : null].filter(Boolean).join(',');
  if (pref) headers.Prefer = pref;
  const r = await fetch(`${url}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) {
    console.error('[supabase]', r.status, text);
    throw new HttpError(502, explainDbError(r.status, text));
  }
  const data = text ? JSON.parse(text) : null;
  if (count) {
    const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
    return { data, count: m ? Number(m[1]) : 0 };
  }
  return data;
}
export const enc = encodeURIComponent;

// 그림 올리기 (Supabase Storage 공개 버킷 'quiz-images')
export const IMAGE_BUCKET = 'quiz-images';
export async function uploadImage(path, dataUrl) {
  const { url, key } = env();
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, '그림 파일 형식을 읽지 못했어요.');
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 520_000) throw new HttpError(400, '그림이 너무 큽니다.');
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  const full = `${path}.${ext}`;
  const r = await fetch(`${url}/storage/v1/object/${IMAGE_BUCKET}/${full}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': m[1], 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
    body: buf,
  });
  if (!r.ok) {
    console.error('[storage]', r.status, await r.text());
    throw new HttpError(502, '그림을 저장하지 못했어요. (Supabase 에 quiz-images 버킷이 있는지 확인: schema.sql 다시 실행)');
  }
  return `${url}/storage/v1/object/public/${IMAGE_BUCKET}/${full}`;
}

export async function getOne(table, filter, select = '*') {
  const rows = await rest(`${table}?${filter}&select=${select}&limit=1`);
  return rows?.[0] || null;
}

// 비밀번호 (scrypt)
export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(pw), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(String(pw), salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode(len = 6) {
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return s;
}
export const cleanCode = (c) => String(c || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
export const cleanName = (n) => String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

// 공통 처리기: POST JSON { action, ... }
export function handler(actions) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST 로 요청해 주세요.' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};
    const fn = actions[body.action];
    if (!fn) return res.status(400).json({ error: '알 수 없는 요청이에요.' });
    try {
      const out = await fn(body, req);
      return res.status(200).json(out ?? { ok: true });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status >= 500) console.error(e);
      return res.status(status).json({ error: e.message || '서버 오류' });
    }
  };
}
