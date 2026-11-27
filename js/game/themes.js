// =========================================================
// 이야기별 맵 구성 (시간대 · 날씨 · 마을 배치 · 문제 장소 · 마지막 퍼즐)
// 3D 배치는 areas.js, 여기에는 화면에 보이는 이름과 문구만 둡니다.
// 문제 장소 슬롯 0~2 는 마을 밖(테마마다 다름), 3~6 은 집 안(공통)입니다.
// 슬롯 0 을 풀면 대감댁 열쇠, 슬롯 4(대감댁 병풍)를 풀면 등잔이 나옵니다.
// =========================================================

const INDOOR = [
  { id: 'bandaji', name: '서당 반닫이', short: '서당', where: '서당(書堂) 안 반닫이', area: 'seodang' },
  { id: 'screen', name: '대감댁 병풍', short: '대감댁', where: '대감댁(大監宅) 안 병풍 (대문 열쇠 필요)', reward: 'lamp', area: 'daegam' },
  { id: 'cabinet', name: '약방 약장', short: '약방', where: '약방(藥房) 안 약장', area: 'yakbang' },
  { id: 'najeon', name: '별당 자개함', short: '별당', where: '별당(別堂) 안 자개함 (등잔 필요)', area: 'byeoldang' },
];
// 마을 밖 문제 장소의 내부 id (3D·서버 공통, 바꾸지 말 것)
export const OUTDOOR_IDS = ['well', 'snowman', 'pavilion'];

export const THEMES = {
  seolhwa: {
    mood: '첫눈 내리는 밤',
    moodIcon: '🌙',
    weather: '함박눈 · 달빛 · 청사초롱',
    village: '첫눈 내린 한옥마을',
    loading: '첫눈 내리는 밤의 한옥마을을 짓고 있어요…',
    layout: '큰 얼음 연못을 집 네 채가 둥글게 감싼 마을',
    outdoor: [
      { name: '고드름 달린 처마', short: '처마', where: '마을 북서쪽 곳간 처마의 고드름' },
      { name: '석판 든 눈사람', short: '눈사람', where: '얼음 연못 남서쪽의 눈사람' },
      { name: '눈 덮인 장독대', short: '장독대', where: '얼음 연못 남동쪽의 장독대' },
    ],
    keyDesc: '처마 끝 커다란 고드름 속에 얼어 있던 놋쇠 열쇠. 대감댁 대문에 맞을 것 같다.',
    final: {
      name: '눈꽃 얼음판', icon: '❄️', where: '얼음 연못 한가운데의 눈꽃 얼음판',
      stones: '얼음판 둘레의 방위 돌',
      empty: '연못 한가운데에 눈꽃 무늬가 새겨진 둥근 얼음판이 있다. 둘레에는 東·西·南·北이 새겨진 돌 네 개.\n\n일곱 조각을 모두 모은 뒤 다시 오자.',
      pressing: '얼음판이 울린다…',
      toast: '쩌정… 눈꽃 얼음판에 금이 간다!',
      openTitle: '얼음이 갈라졌다',
      openText: '눈꽃 얼음판이 여섯 조각으로 갈라져 물러나고, 연못 아래로 내려가는 얼음 계단이 드러났다.\n아래에서 푸른 빛이 새어 나온다.',
      stairs: '얼음 계단', vault: '얼음 동굴', chest: '설화보주 받침대', chestAction: '살펴보기',
    },
    stele: { title: '연못가 비석', from: '얼음 연못' },
    flavor: {
      sotdae: { label: ['솟대', '살펴보기'], title: '솟대', icon: '🐦', text: '솟대 꼭대기 나무 새의 머리에 눈이 소복하다. 마을의 평안을 비는 솟대다.' },
      snowmen: { label: ['눈사람', '살펴보기'], title: '눈사람', icon: '⛄', text: '아이들이 만든 눈사람이다. 코가 당근이다.' },
      persimmon: { label: ['감나무', '살펴보기'], title: '감나무', icon: '🍊', text: '잎이 모두 진 가지 끝에 까치밥으로 남긴 감 몇 개가 매달려 있다.' },
      pond: { label: ['얼음 연못', '살펴보기'], title: '얼음 연못', icon: '🧊', text: '연못이 꽁꽁 얼었다. 달빛에 얼음이 푸르게 빛난다. 한가운데 둥근 얼음판에 눈꽃 무늬가 보인다.' },
    },
  },

  hong: {
    mood: '보름달 밤 잠입',
    moodIcon: '🌕',
    weather: '맑음 · 커다란 보름달 · 횃불',
    village: '보름달 뜬 한옥마을',
    loading: '보름달 뜬 밤의 한옥마을을 짓고 있어요…',
    layout: '높은 담장 안 탐관오리 대감댁과 곡간 세 채',
    outdoor: [
      { name: '포졸 초소', short: '초소', where: '대감댁 담장 대문 옆 포졸 초소' },
      { name: '담장 개구멍', short: '개구멍', where: '대감댁 서쪽 담장 아래 개구멍' },
      { name: '마구간 여물통', short: '마구간', where: '마을 서남쪽 마구간의 여물통' },
    ],
    keyDesc: '포졸 초소 기둥에 걸려 있던 놋쇠 열쇠 꾸러미. 대감댁 대문 열쇠다!',
    final: {
      name: '곡간 마당 자물쇠 석판', icon: '🔐', where: '담장 안 곡간 마당의 자물쇠 석판',
      stones: '석판 네 귀의 방위 돌',
      empty: '곡간 앞마당에 커다란 쇠자물쇠가 달린 나무 뚜껑이 땅에 박혀 있다. 둘레 석판에는 東·西·南·北이 새겨진 돌 네 개.\n\n일곱 조각을 모두 모은 뒤 다시 오자.',
      pressing: '자물쇠가 덜컹거린다…',
      toast: '철커덕! 쇠자물쇠가 풀렸다!',
      openTitle: '비밀문이 열렸다',
      openText: '곡간 앞 땅바닥의 비밀문이 삐걱 열리고, 땅속으로 내려가는 돌계단이 드러났다.\n아래에서 횃불 빛이 일렁인다.',
      stairs: '비밀문 아래 계단', vault: '곡간 지하 창고', chest: '활빈당 금궤', chestAction: '열기',
    },
    stele: { title: '방(榜) 붙은 게시판', from: '대감댁 담장 앞' },
    flavor: {
      granary: { label: ['곡간', '살펴보기'], title: '곡간', icon: '🌾', text: '굳게 잠긴 곡간 문틈으로 쌀가마니가 천장까지 쌓인 게 보인다. 백성에게 거둔 쌀이다.' },
      haystack: { label: ['짚더미', '살펴보기'], title: '짚더미', icon: '🌾', text: '말에게 먹일 짚이 수북하다. 누군가 숨어 있기 딱 좋겠다.' },
      jars: { label: ['장독대', '살펴보기'], title: '장독대', icon: '🏺', text: '달빛 아래 항아리들이 반들반들 빛난다. 된장, 간장, 고추장이 익어 가고 있다.' },
      sacks: { label: ['쌀가마니', '살펴보기'], title: '쌀가마니', icon: '🌾', text: '곡간에 다 넣지 못한 쌀가마니가 쌓여 있다. 가마니마다 "官(관)" 자 도장이 찍혀 있다.' },
    },
  },

  kimsatgat: {
    mood: '늦가을 해질녘',
    moodIcon: '🍁',
    weather: '맑음 · 붉은 노을 · 낙엽',
    village: '단풍 든 한옥마을',
    loading: '노을 진 가을 한옥마을을 짓고 있어요…',
    layout: '개울이 마을을 비스듬히 가르고, 나무다리 건너편에 주막',
    outdoor: [
      { name: '개울 나무다리', short: '나무다리', where: '마을 가운데 개울을 건너는 나무다리' },
      { name: '주막 평상', short: '주막', where: '개울 건너 동쪽 주막 앞 평상' },
      { name: '감나무 아래 함', short: '감나무', where: '개울 남쪽 서편의 감나무 아래' },
    ],
    keyDesc: '나무다리 난간 아래에 묶여 있던 놋쇠 열쇠. 대감댁 대문에 맞을 것 같다.',
    final: {
      name: '언덕 아래 시비(詩碑)', icon: '🪨', where: '개울 건너 북쪽 언덕 아래의 시비',
      stones: '시비 둘레의 방위 돌',
      empty: '언덕 아래 커다란 자연석에 시 한 수가 새겨져 있다. 시비 둘레에는 東·西·南·北이 새겨진 돌 네 개.\n\n일곱 조각을 모두 모은 뒤 다시 오자.',
      pressing: '시비가 흔들린다…',
      toast: '그르릉… 시비가 저절로 돌아간다!',
      openTitle: '시비가 돌아갔다',
      openText: '커다란 시비가 천천히 돌아 옆으로 밀려나고, 그 아래로 내려가는 돌계단이 드러났다.\n아래에서 촛불 빛이 새어 나온다.',
      stairs: '시비 아래 계단', vault: '촛불 켜진 서재 동굴', chest: '옻칠 문갑', chestAction: '열기',
    },
    stele: { title: '시비 옆 작은 비석', from: '언덕 아래' },
    flavor: {
      maple: { label: ['단풍나무', '살펴보기'], title: '단풍나무', icon: '🍁', text: '노을빛을 받아 단풍잎이 불타는 것처럼 붉다. 바람이 불 때마다 잎이 우수수 떨어진다.' },
      stream: { label: ['개울', '살펴보기'], title: '개울', icon: '🌊', text: '맑은 개울물에 붉은 단풍잎이 둥둥 떠내려간다. 물이 차갑다.' },
      stones: { label: ['징검다리', '건너 보기'], title: '징검다리', icon: '🪨', text: '징검돌을 하나씩 밟고 개울을 건널 수 있다. 미끄러지지 않게 조심!' },
      jars: { label: ['장독대', '살펴보기'], title: '주막 장독대', icon: '🏺', text: '주막 항아리에서 막걸리 익는 시큼한 냄새가 난다.' },
      straw: { label: ['볏가리', '살펴보기'], title: '볏가리', icon: '🌾', text: '가을걷이를 끝낸 볏단이 높이 쌓여 있다. 올해도 풍년이다.' },
      flag: { label: ['주막 깃발', '살펴보기'], title: '주막 깃발', icon: '🚩', text: '"酒(주)" 자가 쓰인 깃발이 바람에 펄럭인다. 나그네를 부르는 주막 표시다.' },
    },
  },

  jeonwoochi: {
    mood: '천둥 치는 밤',
    moodIcon: '⛈️',
    weather: '비 · 천둥번개',
    village: '비 내리는 한옥마을',
    loading: '천둥 치는 밤의 한옥마을을 짓고 있어요…',
    layout: '가운데 도사의 수련터, 사방으로 집들',
    outdoor: [
      { name: '수련터 돌기둥', short: '돌기둥', where: '수련터 서남쪽, 부적 붙은 돌기둥' },
      { name: '번개 맞은 고목', short: '고목', where: '마을 서남쪽의 번개 맞은 고목' },
      { name: '부적 장승', short: '부적 장승', where: '마을 동남쪽, 부적이 붙은 장승' },
    ],
    keyDesc: '돌기둥 부적이 떨어지며 함께 나온 놋쇠 열쇠. 대감댁 대문에 맞을 것 같다.',
    final: {
      name: '수련터 팔괘 석단', icon: '☯️', where: '마을 한가운데 수련터의 팔괘 석단',
      stones: '석단 네 방위의 돌',
      empty: '수련터 한가운데 팔각 석단에 여덟 괘(卦)가 새겨져 있다. 네 방위에는 東·西·南·北이 새겨진 돌.\n\n일곱 조각을 모두 모은 뒤 다시 오자.',
      pressing: '석단이 우르릉 울린다…',
      toast: '번쩍! 번개가 팔괘 석단에 내리꽂혔다!',
      openTitle: '석단이 열렸다',
      openText: '번개를 맞은 팔괘 석단 가운데가 빙글 돌며 가라앉고, 땅속으로 내려가는 계단이 드러났다.\n아래에서 보랏빛이 새어 나온다.',
      stairs: '석단 아래 계단', vault: '도술 동굴', chest: '풍운선 받침대', chestAction: '살펴보기',
    },
    stele: { title: '수련터 비석', from: '수련터' },
    flavor: {
      pillar: { label: ['수련터 돌기둥', '살펴보기'], title: '돌기둥', icon: '🪨', text: '빗물에 젖은 돌기둥마다 둔갑술 부적이 붙어 있다. 이 기둥의 부적은 이미 힘을 잃었다.' },
      puddle: { label: ['물웅덩이', '살펴보기'], title: '물웅덩이', icon: '💧', text: '번개가 칠 때마다 웅덩이에 하늘이 하얗게 비친다.' },
      brazier: { label: ['화로', '살펴보기'], title: '도사의 화로', icon: '🔥', text: '비가 이렇게 쏟아지는데도 화로 불이 꺼지지 않는다. 도술이 걸린 불인가 보다.' },
      jars: { label: ['장독대', '살펴보기'], title: '장독대', icon: '🏺', text: '항아리 뚜껑 위로 빗방울이 투둑투둑 떨어진다.' },
    },
  },

  teacher: {
    mood: '꼬마전구 반짝이는 눈 오는 밤',
    moodIcon: '✨',
    weather: '포근한 눈 · 알록달록 꼬마전구',
    village: '꼬마전구 반짝이는 한옥마을',
    loading: '꼬마전구 반짝이는 한옥마을을 짓고 있어요…',
    layout: '가운데 커다란 소나무, 주변으로 집들',
    outdoor: [
      { name: '큰 소나무 장식', short: '소나무', where: '마을 한가운데 큰 소나무 (동쪽 가지)' },
      { name: '선물 썰매', short: '썰매', where: '큰 소나무 남동쪽의 선물 썰매' },
      { name: '석판 든 눈사람', short: '눈사람', where: '큰 소나무 남서쪽의 눈사람' },
    ],
    keyDesc: '소나무 가지에 장식처럼 걸려 있던 놋쇠 열쇠. 대감댁 대문에 맞을 것 같다.',
    final: {
      name: '소나무 아래 별 석판', icon: '⭐', where: '큰 소나무 바로 아래의 별 모양 석판',
      stones: '별 석판 둘레의 방위 돌',
      empty: '큰 소나무 아래에 별 모양 석판이 놓여 있다. 둘레에는 東·西·南·北이 새겨진 돌 네 개.\n\n일곱 쪽지를 모두 모은 뒤 다시 오자.',
      pressing: '꼬마전구가 깜빡인다…',
      toast: '반짝반짝! 소나무 전구가 한꺼번에 빛난다!',
      openTitle: '별 석판이 열렸다',
      openText: '소나무가 환하게 빛나더니 별 석판이 스르르 옆으로 밀려나고, 땅속으로 내려가는 계단이 드러났다.\n아래에서 알록달록한 빛이 새어 나온다.',
      stairs: '별 석판 아래 계단', vault: '반짝이는 선물 방', chest: '커다란 선물 상자', chestAction: '열기',
    },
    stele: { title: '소나무 옆 팻말', from: '큰 소나무' },
    flavor: {
      snowmen: { label: ['눈사람', '살펴보기'], title: '눈사람', icon: '⛄', text: '우리 반 친구들이 만든 것 같은 눈사람이다. 목도리가 멋지다!' },
      gifts: { label: ['선물 꾸러미', '살펴보기'], title: '선물 꾸러미', icon: '🎁', text: '소나무 아래 작은 선물 상자들이 쌓여 있다. 진짜 선물은 땅속에 있다던데…' },
      lights: { label: ['꼬마전구', '살펴보기'], title: '꼬마전구', icon: '💡', text: '처마마다 알록달록한 꼬마전구가 반짝인다. 선생님이 달아 두신 걸까?' },
      jars: { label: ['장독대', '살펴보기'], title: '장독대', icon: '🏺', text: '항아리마다 소복이 눈이 쌓였다.' },
    },
  },
};

export const THEME_IDS = Object.keys(THEMES);
export function getTheme(id) { return THEMES[id] || THEMES.seolhwa; }

// 문제 장소 7곳 (테마별 이름)
export function getSpots(themeId) {
  const t = getTheme(themeId);
  const out = t.outdoor.map((o, i) => ({ id: OUTDOOR_IDS[i], area: 'village', ...o, ...(i === 0 ? { reward: 'key' } : {}) }));
  return [...out, ...INDOOR];
}
