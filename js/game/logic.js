// 상호작용 규칙: 어떤 물건을 누르면 무슨 일이 일어나는지
import { SPOTS, ITEMS, FLAVOR, fragmentText, buildGoals } from './content.js';
import { addItem, removeItem, addClue, markSeen, has } from './state.js';

const SPOT_INDEX = Object.fromEntries(SPOTS.map((s, i) => [s.id, i]));

const LABELS = {
  jangseung: ['장승', '전설 듣기'],
  stele: ['비석', '읽기'],
  altar: ['방위 석단', '일곱 걸음 밟기'],
  stairs: ['지하로 내려가는 계단', '내려가기'],
  jars: ['장독대', '살펴보기'],
  persimmon: ['감나무', '살펴보기'],
  sotdae: ['솟대', '살펴보기'],
  pond: ['언 연못', '살펴보기'],
  snowmen: ['눈사람', '살펴보기'],
  door_seodang: ['서당 (書堂)', '들어가기'],
  door_daegam: ['대감댁 (大監宅)', '들어가기'],
  door_yakbang: ['약방 (藥房)', '들어가기'],
  door_byeoldang: ['별당 (別堂)', '들어가기'],
  letter: ['서안 위의 종이', '읽기'],
  scroll_seodang: ['족자', '읽기'],
  books: ['책장', '살펴보기'],
  mirror: ['경대', '서랍 열기'],
  cushions: ['방석', '살펴보기'],
  yakbang_note: ['책상 위 쪽지', '읽기'],
  herbs: ['약초 채반', '살펴보기'],
  scroll_byeoldang: ['족자', '읽기'],
  gayageum: ['가야금', '타 보기'],
  chest: ['보물 상자', '열기'],
  exit_vault: ['계단', '마당으로 올라가기'],
};
SPOTS.forEach((s, i) => { LABELS[s.id] = [`${s.name}`, '문제 풀기', i]; });
for (const a of ['seodang', 'daegam', 'yakbang', 'byeoldang']) LABELS[`exit_${a}`] = ['문', '밖으로 나가기'];

export function createGame({ state, ui, world, save, backend, config, story }) {
  const flags = state.flags;
  const goals = buildGoals(config);

  async function storyText(id, title, text, from, icon) {
    const isNew = addClue(state, id);
    save();
    await ui.text({ title, from, text, icon, isNew });
  }

  async function getItem(id) {
    addItem(state, id);
    save();
    ui.refreshInventory(id);
    await ui.itemGet(id);
  }

  function labelFor(id) {
    if (id === 'stairs' && !flags.stairs_open) return null;
    if (id === 'altar' && flags.stairs_open) return null;
    const l = LABELS[id];
    if (!l) return null;
    let [title, action] = l;
    if (l[2] != null && state.solved.includes(l[2])) action = '다시 보기';
    if (id === 'door_daegam' && !flags.daegam_unlocked) action = has(state, 'key') ? '열쇠로 열기' : '문 열어 보기';
    if (id === 'door_byeoldang' && !flags.byeoldang_lit && !has(state, 'lamp')) action = '문 열어 보기';
    if (id === 'chest' && state.finished) action = '다시 보기';
    return { title, action };
  }
  const isNew = (id) => !state.seen.includes(id);
  const STORY_IDS = ['jangseung', 'stele', 'letter', 'mirror', 'yakbang_note', 'scroll_byeoldang', 'scroll_seodang'];
  // 머리 위 표시 종류
  function markerKind(id) {
    if (id in SPOT_INDEX) return state.solved.includes(SPOT_INDEX[id]) ? 'done' : 'puzzle';
    if (id === 'altar' || id === 'stairs' || id === 'chest') return state.finished && id === 'chest' ? 'done' : 'final';
    if (id.startsWith('door_')) return 'door';
    if (id.startsWith('exit_')) return 'exit';
    if (STORY_IDS.includes(id)) return 'story';
    return 'flavor';
  }

  async function interact(id) {
    markSeen(state, id);
    save();

    // ---- 문 ----
    if (id === 'door_seodang') return world.enterArea('seodang');
    if (id === 'door_yakbang') return world.enterArea('yakbang');
    if (id === 'door_daegam') {
      if (flags.daegam_unlocked) return world.enterArea('daegam');
      if (has(state, 'key')) {
        flags.daegam_unlocked = true;
        removeItem(state, 'key');
        save();
        ui.refreshInventory();
        ui.toast('🗝️ 철컥! 놋쇠 자물쇠가 열렸다.');
        ui.sfx('unlock');
        world.fx('unlockDoor');
        await wait(700);
        return world.enterArea('daegam');
      }
      return ui.text(FLAVOR.daegam_locked);
    }
    if (id === 'door_byeoldang') {
      if (flags.byeoldang_lit || has(state, 'lamp')) {
        if (!flags.byeoldang_lit) {
          flags.byeoldang_lit = true;
          save();
          ui.toast('🪔 등잔에 불을 붙이고 별당에 들어간다.');
        }
        return world.enterArea('byeoldang');
      }
      return ui.text(FLAVOR.byeoldang_dark);
    }
    if (id === 'exit_vault') return world.enterArea('village', 'stairs');
    if (id.startsWith('exit_')) return world.enterArea('village', `door_${id.slice(5)}`);

    // ---- 퍼즐 장소 ----
    if (id in SPOT_INDEX) return openPuzzle(SPOT_INDEX[id]);

    switch (id) {
      case 'jangseung': return storyText('intro', (story.legend || `${story.name}의 전설`), story.intro, '마을 입구 · 장승', '🪵');
      case 'stele': return storyText('stele', '석단 옆 비석', story.stele, '중앙 마당', '🪨');
      case 'letter': return storyText('letter', '서안 위의 종이', story.letter, '서당', '📜');
      case 'scroll_seodang': return ui.text({ title: '족자', text: story.scroll3d.seodang.join('\n'), icon: '📜' });
      case 'mirror': return storyText('mirror', '경대', story.mirror, '대감댁', '🪞');
      case 'yakbang_note': return storyText('yakbang_note', '책상 위 쪽지', story.yakbang_note, '약방', '📝');
      case 'scroll_byeoldang': return storyText('scroll_byeoldang', '별당의 족자', story.scroll_byeoldang, '별당', '📜');
      case 'gayageum': ui.sfx('gayageum'); return ui.toast('🎶 ' + FLAVOR.gayageum.text);
      case 'altar': return openFinal();
      case 'stairs': return world.enterArea('vault');
      case 'chest': return openChest();
      default:
        if (FLAVOR[id]) return ui.text(FLAVOR[id]);
        return null;
    }
  }

  async function openPuzzle(i) {
    const sp = SPOTS[i];
    const pz = config.puzzles[i];
    const solved = state.solved.includes(i);
    const res = await ui.puzzle({
      index: i, spot: sp, intro: story.spots[i], puzzle: pz, solved,
      fragment: solved ? fragmentText(story, i + 1, state.fragments[i]) : null,
      lockUntil: state.locks?.[`p${i}`] || 0,
      onLock: (until) => { state.locks = { ...(state.locks || {}), [`p${i}`]: until }; save(); },
      submit: async (answer) => {
        const r = await backend.check(state.session, i, answer);
        return r;
      },
    });
    if (!res || !res.ok || solved) return;
    // 정답!
    state.solved = [...new Set([...state.solved, i])];
    state.fragments[i] = res.fragment.dir;
    save();
    ui.refreshHud();
    world.fx(`solve_${sp.id}`);
    ui.sfx('unlock');
    await wait(650);
    await ui.fragment({ order: i + 1, text: fragmentText(story, i + 1, res.fragment.dir), story, count: state.solved.length, total: config.puzzles.length });
    if (sp.reward && !flags[`got_${sp.reward}`]) {
      flags[`got_${sp.reward}`] = true;
      await getItem(sp.reward);
    }
    if (state.solved.length === config.puzzles.length) ui.toast('✨ 일곱 조각을 모두 모았다! 중앙 마당의 석단으로 가자.');
  }

  async function openFinal() {
    if (state.solved.length < config.puzzles.length) {
      return ui.text({ ...FLAVOR.altar_empty, text: `${FLAVOR.altar_empty.text}\n\n지금까지 모은 조각: ${state.solved.length} / ${config.puzzles.length}` });
    }
    // 얻은 순서가 아니라 조각 번호(一~七) 순서로 보여 줌
    const frags = [...state.solved].sort((a, b) => a - b).map((i) => fragmentText(story, i + 1, state.fragments[i]));
    const seq = await ui.finalPuzzle({
      length: config.puzzles.length, fragments: frags, story,
      onPress: (d) => world.fx('altarPress', d),
      lockUntil: state.locks?.final || 0,
      onLock: (until) => { state.locks = { ...(state.locks || {}), final: until }; save(); },
      submit: async (s) => backend.final(state.session, s),
    });
    if (!seq) return;
    flags.stairs_open = true;
    state.finalSeq = seq;
    save();
    ui.sfx('rumble');
    ui.toast('우르르릉… 석단 가운데 덮개돌이 움직인다!');
    await world.openStairs(true);
    await ui.text({ title: '길이 열렸다', text: '덮개돌이 밀려나고 땅속으로 내려가는 돌계단이 드러났다.\n아래에서 희미한 빛이 새어 나온다.', icon: '✨' });
  }

  async function openChest() {
    if (!state.finished) {
      let r;
      try {
        r = await backend.finish(state.session, state.finalSeq || '');
      } catch (e) {
        return ui.text({ title: '기록을 저장하지 못했어요', text: `${e.message}\n\n잠시 후 다시 상자를 눌러 주세요.`, icon: '⚠️' });
      }
      if (!r?.ok) return ui.text({ title: '상자가 열리지 않는다', text: '석단의 걸음이 맞지 않았던 것 같다. 석단으로 돌아가 다시 밟아 보자.', icon: '🔒' });
      state.finished = true;
      state.result = { elapsedMs: r.elapsedMs, hints: r.hints, scoreMs: r.scoreMs, rank: r.rank };
      save();
      world.fx('openChest');
      ui.sfx('treasure');
      await wait(1400);
      await storyText('final', story.treasure, story.finalLetter, '지하 보물창고', '💰');
    }
    return ui.ending();
  }

  // ---- 힌트 ----
  function goalList() {
    return goals.map((g) => {
      const level = g.hints.filter((h, k) => state.hintKeys.includes(hintKey(g, k))).length;
      return {
        id: g.id, title: g.title, complete: !!g.done(state), total: g.hints.length, level,
        shown: g.hints.slice(0, level).map((h, k) => (h.teacher != null ? state.hintTexts[hintKey(g, k)] || '(선생님 힌트)' : h.text)),
      };
    });
  }
  function hintKey(g, k) {
    const h = g.hints[k];
    return h.teacher != null ? `p${h.teacher}:t` : `${g.id}:${k}`;
  }
  async function revealHint(goalId) {
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    const k = g.hints.findIndex((h, j) => !state.hintKeys.includes(hintKey(g, j)));
    if (k < 0) return;
    const key = hintKey(g, k);
    const r = await backend.hint(state.session, key);
    state.hintKeys = [...new Set([...state.hintKeys, key])];
    state.hintsUsed = r.hints ?? state.hintKeys.length;
    if (r.text != null) state.hintTexts[key] = r.text || '(선생님이 힌트를 적지 않았어요)';
    save();
  }

  return { interact, labelFor, isNew, markerKind, goalList, revealHint };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export { ITEMS };
