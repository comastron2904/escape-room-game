// 게임 진행 상태 (이 기기의 localStorage 에 자동 저장)
const KEY = 'hanok.save.v2';

export function freshState(extra = {}) {
  return {
    v: 2,
    code: null,         // 구성 코드
    session: null,      // 서버 세션 id
    mode: 'remote',     // remote | local | preview
    nickname: '',
    items: [],
    clues: [],          // 읽은 이야기·단서 (수첩)
    seen: [],
    flags: {},
    solved: [],         // 푼 퍼즐 번호
    fragments: {},      // { 퍼즐번호: 'N' }
    hintKeys: [],       // 본 힌트
    hintTexts: {},      // 교사 힌트 문장 (받아 온 것)
    hintsUsed: 0,
    area: 'village',
    pos: null,
    startedAt: 0,       // 서버 기준 시작 시각(ms)
    clockOffset: 0,     // 서버시각 - 내 시각
    finished: false,
    result: null,       // { elapsedMs, hints, scoreMs, rank }
    ...extra,
  };
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 2 && s.code) return { ...freshState(), ...s };
  } catch { /* 저장소 사용 불가 */ }
  return null;
}
export function saveState(s) {
  if (s.mode === 'preview') return; // 미리보기는 저장하지 않음
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 무시 */ }
}
export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
}

export const has = (s, item) => s.items.includes(item);
export function addItem(s, item) { if (!s.items.includes(item)) s.items.push(item); }
export function removeItem(s, item) { s.items = s.items.filter((x) => x !== item); }
export function addClue(s, id) {
  if (s.clues.includes(id)) return false;
  s.clues.push(id);
  return true;
}
export function markSeen(s, id) { if (!s.seen.includes(id)) s.seen.push(id); }

export function formatTime(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
}
