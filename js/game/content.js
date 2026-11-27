// =========================================================
// 게임 공통 내용 (장소 · 아이템 · 방위 · 힌트 · 체험판 문제)
// 이야기별 문구는 stories.js, 교과 문제는 교사가 편집 모드에서 입력합니다.
// =========================================================

export const PUZZLE_COUNT = 7; // 교과 문제 퍼즐 수 (+ 마지막 석단 퍼즐 = 8)

import { getSpots, getTheme } from './themes.js';
export { getSpots, getTheme };

// 퍼즐 장소 (순서 고정) — 이름은 이야기(테마)마다 다름. SPOTS 는 기본(설화) 이름
export const SPOTS = getSpots('seolhwa');

const ITEM_BASE = {
  key: { name: '놋쇠 열쇠', icon: '🗝️', desc: '묵직한 놋쇠 열쇠. 대감댁 대문에 맞을 것 같다.' },
  lamp: { name: '등잔', icon: '🪔', desc: '대감댁 병풍 뒤 궤짝에서 나온 기름 등잔. 어두운 별당을 밝힐 수 있다.' },
};
export const ITEMS = ITEM_BASE;
export function getItems(themeId) {
  const t = getTheme(themeId);
  return { ...ITEM_BASE, key: { ...ITEM_BASE.key, desc: t.keyDesc || ITEM_BASE.key.desc } };
}

// 방위
export const DIRS = {
  N: { hanja: '北', ko: '북', arrow: '↑', phrase: '북극성이 빛나는 쪽' },
  E: { hanja: '東', ko: '동', arrow: '→', phrase: '해가 뜨는 쪽' },
  S: { hanja: '南', ko: '남', arrow: '↓', phrase: '나침반 빨간 바늘이 가리키는 반대쪽' },
  W: { hanja: '西', ko: '서', arrow: '←', phrase: '해가 지는 쪽' },
};
export const DIR_KEYS = ['N', 'E', 'S', 'W'];
export const HANJA_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export function fragmentText(story, order, dir) {
  return `${story.fragment} 〔${HANJA_NUM[order - 1]}〕 — ${DIRS[dir].phrase}으로 한 걸음`;
}

// 기타 소품 문구 (이야기와 무관)
export const FLAVOR = {
  books: { title: '책장', icon: '📚', text: '천자문, 명심보감, 소학… 오래된 책들이 가지런히 꽂혀 있다.' },
  cushions: { title: '방석', icon: '🟥', text: '비단 방석이 가지런히 놓여 있다. 방바닥이 따끈하다.' },
  herbs: { title: '약초 채반', icon: '🌿', text: '채반 위에 약초가 말라 가고 있다. 쌉싸름한 냄새가 난다.' },
  gayageum: { title: '가야금', icon: '🎶', text: '줄을 튕기자 맑은 가야금 소리가 별당 가득 울린다.' },
  daegam_locked: { title: '굳게 잠긴 대감댁', icon: '🔒', text: '대감댁 문에 커다란 놋쇠 자물쇠가 걸려 있다. 열쇠가 있어야 들어갈 수 있겠다.\n\n마을 어딘가의 자물쇠 안에 열쇠가 들어 있을지도 모른다.' },
  byeoldang_dark: { title: '어두운 별당', icon: '🌑', text: '문틈으로 들여다보니 안이 칠흑같이 어둡다. 불빛이 있어야 들어갈 수 있겠다.' },
};
// 테마별 마을 소품 문구를 합친 목록 (label 은 [이름, 행동])
export function getFlavor(themeId) {
  const t = getTheme(themeId);
  const out = { ...FLAVOR };
  for (const [k, v] of Object.entries(t.flavor || {})) if (v) out[k] = v;
  out.altar_empty = { title: t.final.name, icon: t.final.icon, text: t.final.empty };
  return out;
}

// ---- 진행 목표 + 단계별 힌트 ----
// 힌트 하나를 볼 때마다 기록에 +1분 (서버에서 셈)
export const HINT_PENALTY_MS = 60_000;
export function buildGoals(cfg, themeId) {
  const theme = getTheme(themeId);
  const spots = getSpots(themeId);
  const goals = [{
    id: 'intro', title: '마을 입구의 장승에게 전설 듣기',
    done: (s) => s.clues.includes('intro'),
    hints: [{ text: '시작 지점 바로 앞에 서 있는 두 장승에게 다가가 E(또는 화면의 버튼)를 누르세요.' }],
  }];
  spots.forEach((sp, i) => {
    const hints = [{ text: `문제는 ${sp.where}에 있어요.` }];
    if (sp.id === 'screen') hints.push({ text: `대감댁 열쇠는 ${spots[0].name} 문제를 풀면 나와요.` });
    if (sp.id === 'najeon') hints.push({ text: '별당에 들어가려면 등잔이 필요해요. 등잔은 대감댁 병풍 문제를 풀면 나와요.' });
    if (cfg.puzzles[i]?.hasHint || cfg.puzzles[i]?.hint) hints.push({ teacher: i, text: null });
    goals.push({ id: `p${i}`, title: `${i + 1}. ${sp.name} 문제 풀기`, done: (s) => s.solved.includes(i), hints });
  });
  goals.push({
    id: 'final', title: `8. ${theme.final.name} — 일곱 걸음 밟기`,
    done: (s) => !!s.flags.stairs_open,
    hints: [
      { text: `${theme.final.where}에 있어요. 근처 ${theme.stele.title}도 읽어 보세요. 일곱 조각은 📒 수첩에 모두 기록돼 있어요.` },
      { text: '조각의 〔一〕〔二〕〔三〕… 은 순서예요. 一=1, 二=2, 三=3, 四=4, 五=5, 六=6, 七=7' },
      { text: '해가 뜨는 쪽=동(東), 해가 지는 쪽=서(西), 나침반 빨간 바늘이 가리키는 반대쪽=남(南), 북극성이 빛나는 쪽=북(北)' },
    ],
  });
  goals.push({
    id: 'treasure', title: '지하로 내려가 보물 찾기',
    done: (s) => !!s.finished,
    hints: [{ text: `${theme.final.name}에 열린 ${theme.final.stairs}으로 내려가 ${theme.final.chest}을(를) 살펴보세요.`.replace('을(를)', /[가-힣]$/.test(theme.final.chest) && (theme.final.chest.charCodeAt(theme.final.chest.length - 1) - 0xac00) % 28 ? '을' : '를') }],
  });
  return goals;
}

// ---- 체험판 (코드 DEMO) 문제 ----
export const DEMO_CONFIG = {
  code: 'DEMO',
  title: '체험판 · 한옥마을 방탈출',
  story: 'seolhwa',
  puzzles: [
    { q: '3 × 4 + 5 의 값은?', type: 'number', answer: '17', hint: '곱셈을 먼저 계산해요. 3 × 4 = 12' },
    { q: '사각형의 네 각의 크기를 모두 더하면 360° 이다.', type: 'ox', answer: 'O', hint: '직사각형을 생각해 보세요. 90° 가 4개!' },
    { q: '아침에 해가 뜨는 방향, 저녁에 해가 지는 방향, 북극성이 보이는 방향을 차례로 입력하세요.', type: 'direction', answer: 'EWN', hint: '해는 동쪽에서 떠서 서쪽으로 집니다.' },
    { q: '훈민정음을 만들어 반포한 조선의 임금은 누구일까요?', type: 'text', answer: '세종대왕, 세종', hint: '만 원짜리 지폐에 그려진 임금이에요.' },
    { q: '북쪽을 보고 서 있다가 시계 방향으로 90°씩 세 번 돌았습니다. 처음 방향과 돌 때마다 바라본 방향을 차례로 입력하세요. (모두 4개)', type: 'direction', answer: 'NESW', hint: '시계 방향: 북 → 동 → 남 → 서' },
    { q: '1기압에서 물이 끓는 온도는?', type: 'choice', options: ['0℃', '50℃', '100℃', '200℃'], answer: 2, hint: '얼음이 녹는 온도는 0℃ 예요.' },
    { q: '1/2 + 1/4 을 분수로 입력하세요. (예: 2/3)', type: 'number', answer: '3/4', hint: '1/2 = 2/4 이에요.' },
  ],
};
