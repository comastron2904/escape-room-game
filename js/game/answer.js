// 정답 비교 (브라우저 체험판과 서버가 함께 씁니다)
// 정답 종류: number 숫자 · direction 방향 · text 단답형 · choice 객관식 · ox O/X

export const ANSWER_TYPES = {
  number: { name: '숫자', icon: '🔢', lock: '숫자 자물쇠' },
  direction: { name: '방향', icon: '🧭', lock: '방향 자물쇠' },
  text: { name: '단답형', icon: '✏️', lock: '글자 자물쇠' },
  choice: { name: '객관식', icon: '☑️', lock: '선택 자물쇠' },
  ox: { name: 'O / X', icon: '⭕', lock: 'OX 자물쇠' },
};
export const typeOf = (p) => (p && ANSWER_TYPES[p.type] ? p.type : 'number');

// 숫자 답: 공백·쉼표 무시, 1/2 같은 분수, 0.50 = 0.5, 007 = 7
function toNumber(s) {
  const m = /^([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)$/.exec(s);
  if (m) { const b = Number(m[2]); return b === 0 ? NaN : Number(m[1]) / b; }
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
  return NaN;
}
export function normalizeNumber(v) {
  return String(v ?? '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[－−]/g, '-').replace(/[．]/g, '.').replace(/[／]/g, '/')
    .replace(/[\s,]/g, '');
}
export function normalizeDirection(v) {
  const map = { 북: 'N', 동: 'E', 남: 'S', 서: 'W', '北': 'N', '東': 'E', '南': 'S', '西': 'W', '↑': 'N', '→': 'E', '↓': 'S', '←': 'W' };
  return [...String(v ?? '').toUpperCase()].map((c) => map[c] || c).filter((c) => 'NESW'.includes(c)).join('');
}
// 단답형: 띄어쓰기·대소문자·끝 문장부호 무시
export function normalizeText(v) {
  return String(v ?? '').normalize('NFC').toLowerCase()
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s.,!?~·'"`()[\]{}]/g, '');
}
// 단답형 정답 목록 (쉼표로 여러 개 허용)
export const textAnswers = (a) => String(a ?? '').split(/[,，\n]/).map(normalizeText).filter(Boolean);
export const normalizeOX = (v) => {
  const s = String(v ?? '').trim().toUpperCase();
  return s === 'O' || s === '○' || s === '0' ? 'O' : s === 'X' || s === '×' ? 'X' : '';
};

export function checkAnswer(puzzle, given) {
  if (!puzzle) return false;
  switch (typeOf(puzzle)) {
    case 'direction': {
      const a = normalizeDirection(puzzle.answer);
      return a.length > 0 && normalizeDirection(given) === a;
    }
    case 'text': {
      const g = normalizeText(given);
      return !!g && textAnswers(puzzle.answer).includes(g);
    }
    case 'choice':
      return String(given ?? '') !== '' && Number(given) === Number(puzzle.answer);
    case 'ox':
      return !!normalizeOX(given) && normalizeOX(given) === normalizeOX(puzzle.answer);
    default: {
      const a = normalizeNumber(puzzle.answer), g = normalizeNumber(given);
      if (!a || !g) return false;
      if (a === g) return true;
      const na = toNumber(a), ng = toNumber(g);
      return Number.isFinite(na) && Number.isFinite(ng) && Math.abs(na - ng) < 1e-9;
    }
  }
}

// 학생에게 보내는 문제 정보 (정답 제외)
export function publicPuzzle(p) {
  const type = typeOf(p);
  return {
    q: String(p.q || ''),
    image: p.image || null,
    type,
    len: type === 'direction' ? normalizeDirection(p.answer).length : null,
    options: type === 'choice' ? (p.options || []).map(String) : null,
    hasHint: !!(p.hint && String(p.hint).trim()),
  };
}

export function randomFinalSeq(n = 7, rnd = Math.random) {
  let s = '';
  for (let i = 0; i < n; i++) s += 'NESW'[Math.floor(rnd() * 4)];
  return s;
}

export const IMAGE_DATA_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_IMAGE_DATA = 600_000; // 압축 후 data URL 길이 한도

// 교사 입력 검사 (편집 화면 · 서버 공통). 문제 있으면 오류 문장 배열
export function validatePuzzles(puzzles, count = 7) {
  const errs = [];
  if (!Array.isArray(puzzles) || puzzles.length !== count) return [`문제는 ${count}개여야 합니다.`];
  puzzles.forEach((p, i) => {
    const n = i + 1;
    if (!p || !String(p.q || '').trim()) errs.push(`${n}번 문제 내용을 입력해 주세요.`);
    if (String(p?.q || '').length > 1500) errs.push(`${n}번 문제가 너무 깁니다. (1500자 이하)`);
    const type = typeOf(p);
    if (type === 'direction') {
      const a = normalizeDirection(p.answer);
      if (!a) errs.push(`${n}번 정답(방향)을 입력해 주세요.`);
      if (a.length > 10) errs.push(`${n}번 방향 정답은 10개 이하로 해 주세요.`);
    } else if (type === 'text') {
      const list = textAnswers(p.answer);
      if (!list.length) errs.push(`${n}번 정답(단답)을 입력해 주세요.`);
      if (String(p.answer).length > 120) errs.push(`${n}번 단답 정답이 너무 깁니다.`);
    } else if (type === 'choice') {
      const opts = Array.isArray(p.options) ? p.options.map((o) => String(o ?? '').trim()) : [];
      if (opts.length < 2 || opts.length > 6) errs.push(`${n}번 객관식 보기는 2~6개여야 해요.`);
      if (opts.some((o) => !o)) errs.push(`${n}번 객관식 보기 중 빈 칸이 있어요.`);
      if (opts.some((o) => o.length > 80)) errs.push(`${n}번 객관식 보기가 너무 깁니다. (80자 이하)`);
      const a = Number(p.answer);
      if (!(Number.isInteger(a) && a >= 0 && a < opts.length)) errs.push(`${n}번 객관식 정답 보기를 골라 주세요.`);
    } else if (type === 'ox') {
      if (!normalizeOX(p.answer)) errs.push(`${n}번 정답(O 또는 X)을 골라 주세요.`);
    } else {
      const a = normalizeNumber(p.answer);
      if (!a) errs.push(`${n}번 정답(숫자)을 입력해 주세요.`);
      else if (!/^[+-]?[\d.]+(\/[+-]?[\d.]+)?$/.test(a)) errs.push(`${n}번 정답은 숫자(정수·소수·분수)만 쓸 수 있어요.`);
      if (a.length > 12) errs.push(`${n}번 정답이 너무 깁니다.`);
    }
    if (p?.image) {
      const img = String(p.image);
      if (img.startsWith('data:')) {
        if (!IMAGE_DATA_RE.test(img)) errs.push(`${n}번 그림 파일 형식을 읽지 못했어요. (jpg·png 권장)`);
        else if (img.length > MAX_IMAGE_DATA) errs.push(`${n}번 그림이 너무 큽니다. 더 작은 그림을 써 주세요.`);
      } else if (!/^https:\/\//i.test(img)) errs.push(`${n}번 그림 주소는 https:// 로 시작해야 해요.`);
    }
  });
  return errs;
}

// 저장용으로 정리 (정답 형식 통일)
export function cleanPuzzle(p) {
  const type = typeOf(p);
  const out = {
    q: String(p.q || '').trim().slice(0, 1500),
    image: p.image ? String(p.image).trim() : null,
    type,
    hint: String(p.hint || '').trim().slice(0, 500),
  };
  if (type === 'direction') out.answer = normalizeDirection(p.answer);
  else if (type === 'text') out.answer = String(p.answer).split(/[,，\n]/).map((x) => x.trim()).filter(Boolean).join(', ').slice(0, 120);
  else if (type === 'choice') { out.options = p.options.map((o) => String(o).trim().slice(0, 80)); out.answer = Number(p.answer); }
  else if (type === 'ox') out.answer = normalizeOX(p.answer);
  else out.answer = normalizeNumber(p.answer);
  return out;
}
