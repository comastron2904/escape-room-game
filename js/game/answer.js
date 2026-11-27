// 정답 비교 (브라우저 체험판과 서버가 함께 씁니다)

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

export function checkAnswer(puzzle, given) {
  if (!puzzle) return false;
  if (puzzle.type === 'direction') {
    const a = normalizeDirection(puzzle.answer);
    return a.length > 0 && normalizeDirection(given) === a;
  }
  const a = normalizeNumber(puzzle.answer), g = normalizeNumber(given);
  if (!a || !g) return false;
  if (a === g) return true;
  const na = toNumber(a), ng = toNumber(g);
  // 분수 답이면 분수로 입력해야 정답 (0.75 ≠ 3/4 로 구분하지 않음: 값이 같으면 정답)
  return Number.isFinite(na) && Number.isFinite(ng) && Math.abs(na - ng) < 1e-9;
}

// 학생에게 보내는 문제 정보 (정답 제외)
export function publicPuzzle(p) {
  return {
    q: String(p.q || ''),
    image: p.image || null,
    type: p.type === 'direction' ? 'direction' : 'number',
    len: p.type === 'direction' ? normalizeDirection(p.answer).length : null,
    hasHint: !!(p.hint && String(p.hint).trim()),
  };
}

export function randomFinalSeq(n = 7, rnd = Math.random) {
  let s = '';
  for (let i = 0; i < n; i++) s += 'NESW'[Math.floor(rnd() * 4)];
  return s;
}

// 교사 입력 검사 (편집 화면 · 서버 공통). 문제 있으면 오류 문장 배열
export function validatePuzzles(puzzles, count = 7) {
  const errs = [];
  if (!Array.isArray(puzzles) || puzzles.length !== count) return [`문제는 ${count}개여야 합니다.`];
  puzzles.forEach((p, i) => {
    const n = i + 1;
    if (!p || !String(p.q || '').trim()) errs.push(`${n}번 문제 내용을 입력해 주세요.`);
    if (String(p.q || '').length > 1500) errs.push(`${n}번 문제가 너무 깁니다. (1500자 이하)`);
    if (p.type === 'direction') {
      const a = normalizeDirection(p.answer);
      if (!a) errs.push(`${n}번 정답(방향)을 입력해 주세요.`);
      if (a.length > 10) errs.push(`${n}번 방향 정답은 10개 이하로 해 주세요.`);
    } else {
      const a = normalizeNumber(p.answer);
      if (!a) errs.push(`${n}번 정답(숫자)을 입력해 주세요.`);
      else if (!/^[+-]?[\d.]+(\/[+-]?[\d.]+)?$/.test(a)) errs.push(`${n}번 정답은 숫자(정수·소수·분수)만 쓸 수 있어요.`);
      if (a.length > 12) errs.push(`${n}번 정답이 너무 깁니다.`);
    }
    if (p.image && !/^https:\/\//i.test(p.image)) errs.push(`${n}번 그림 주소는 https:// 로 시작해야 해요.`);
  });
  return errs;
}
