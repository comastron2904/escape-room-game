// 한옥마을 방탈출 — 학생용 화면(UI)과 게임 진행
import { generateLook, drawCharacter, loadProfile, saveProfile } from './character.js';
import { loadSave, saveState, clearSave, freshState, formatTime } from './game/state.js';
import { createGame } from './game/logic.js';
import { ITEMS, DIRS, DIR_KEYS, DEMO_CONFIG, HINT_PENALTY_MS, PUZZLE_COUNT, fragmentText } from './game/content.js';
import { getStory } from './game/stories.js';
import { createRemoteBackend, createLocalBackend } from './api.js';
import { ANSWER_TYPES } from './game/answer.js';
import { loadCharacterLibrary, createCharacterPreview } from './3d/characters.js';
import { createSfx } from './sfx.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const params = new URLSearchParams(location.search);

const AREA_NAMES = { village: '눈 내린 한옥마을', seodang: '서당 (書堂)', daegam: '대감댁 (大監宅)', yakbang: '약방 (藥房)', byeoldang: '별당 (別堂)', vault: '지하 보물창고' };

let world = null;
let game = null;
let state = null;
let config = null;  // 학생용 구성 (정답 없음)
let story = null;
let backend = null;
const sfx = createSfx();
const save = () => state && saveState(state);
const now = () => Date.now() + (state?.clockOffset || 0);

// =========================================================
// 공용 팝업
// =========================================================
let modalResolve = null;
let modalOnKey = null;
function openModal(html, { onKey = null, wide = false, locked = false } = {}) {
  closeModal(undefined, true);
  const card = $('modalCard');
  card.innerHTML = html;
  card.style.width = wide ? 'min(600px, 100%)' : '';
  $('modal').hidden = false;
  $('modal').dataset.locked = locked ? '1' : '';
  document.body.classList.add('modal-open');
  world?.setPaused(true);
  modalOnKey = onKey;
  return new Promise((resolve) => { modalResolve = resolve; });
}
function closeModal(value, silent = false) {
  if ($('modal').hidden) return;
  $('modal').hidden = true;
  document.body.classList.remove('modal-open');
  modalOnKey = null;
  const r = modalResolve;
  modalResolve = null;
  if (!silent) world?.setPaused(false);
  lastModalClose = performance.now();
  r?.(value);
}
$('modal').addEventListener('click', (e) => { if (e.target === $('modal') && !$('modal').dataset.locked) closeModal(null); });
// 팝업이 떠 있을 때의 키 처리 (캡처 단계에서 먼저 받아, 같은 Enter 가 게임 조작으로 넘어가지 않게 함)
let lastModalClose = 0;
window.addEventListener('keydown', (e) => {
  if ($('modal').hidden) return;
  e.stopImmediatePropagation();
  if (e.key === 'Escape' && !$('modal').dataset.locked) { e.preventDefault(); closeModal(null); return; }
  modalOnKey?.(e);
  if (e.defaultPrevented || $('modal').hidden) return;
  // 따로 정하지 않은 팝업은 Enter 로 닫기 (확인 버튼이 있으면 그 버튼을 누른 것처럼)
  if (e.key === 'Enter' && !e.repeat && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    const ok = card().querySelector('[data-ok]:not(:disabled)');
    if (ok && !ok.closest('.m-actions')?.querySelector('.btn-ghost[data-close]')) ok.click();
    else closeModal(null);
  }
}, true);
const head = (icon, title, from = '', close = true) => `
  <div class="m-head">
    <div class="m-icon">${icon || '📜'}</div>
    <div><h2>${esc(title)}</h2>${from ? `<p class="m-from">${esc(from)}</p>` : ''}</div>
    ${close ? '<button class="icon-btn" data-close type="button" aria-label="닫기">✕</button>' : ''}
  </div>`;
const card = () => $('modalCard');
function bindClose(value = null) {
  card().querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(value)));
}
const okKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); closeModal(true); } };

function uiText({ title, from, text, icon, isNew }) {
  const p = openModal(`${head(icon, title, from)}
    ${isNew ? '<div class="badge-new">📒 수첩에 기록했어요</div>' : ''}
    <p class="m-text">${esc(text)}</p>
    <div class="m-actions"><button class="btn btn-gold" data-ok type="button">확인</button></div>`, { onKey: okKey });
  bindClose(true);
  card().querySelector('[data-ok]').addEventListener('click', () => closeModal(true));
  setTimeout(() => card().querySelector('[data-ok]')?.focus(), 30);
  if (isNew) { $('noteDot').hidden = false; sfx.play('page'); }
  return p;
}

function uiItemGet(id) {
  const it = ITEMS[id];
  sfx.play('get');
  const p = openModal(`<div class="get-card">
      <div class="get-icon">${it.icon}</div>
      <p class="get-kicker">획득!</p>
      <h2>${esc(it.name)}</h2>
      <p class="m-desc">${esc(it.desc)}</p>
      <div class="m-actions" style="justify-content:center"><button class="btn btn-gold" data-ok type="button">좋아!</button></div>
    </div>`, { onKey: okKey });
  card().querySelector('[data-ok]').addEventListener('click', () => closeModal(true));
  setTimeout(() => card().querySelector('[data-ok]')?.focus(), 30);
  return p;
}

function uiFragment({ order, text, count, total }) {
  sfx.play('get');
  $('noteDot').hidden = false;
  const p = openModal(`<div class="get-card">
      <div class="get-icon frag-icon">👣</div>
      <p class="get-kicker">조각 ${count} / ${total}</p>
      <h2>${esc(story.fragment)}</h2>
      <div class="frag-box"><span class="frag-no">${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][order - 1]}</span><span>${esc(text.split('— ')[1] || text)}</span></div>
      <p class="m-desc">수첩(📒)에 기록했어요. 일곱 조각을 모아 중앙 마당의 석단으로 가세요.</p>
      <div class="m-actions" style="justify-content:center"><button class="btn btn-gold" data-ok type="button">확인</button></div>
    </div>`, { onKey: okKey });
  card().querySelector('[data-ok]').addEventListener('click', () => closeModal(true));
  return p;
}

// ---- 숫자 / 방향 입력 공용 부품 ----
const NUM_HANJA = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function answerInput(type, len, { numbered = false, options = [] } = {}) {
  if (type === 'direction') {
    return `<div class="dir-wrap">
      <div class="seq-slots${numbered ? ' numbered' : ''}" data-slots>${new Array(len).fill(0).map((_, i) => `<div class="seq-slot" data-n="${numbered ? NUM_HANJA[i] : ''}"></div>`).join('')}</div>
      <div class="compass">
        <span></span><button type="button" class="dir-btn" data-dir="N"><b>北</b>북 ↑</button><span></span>
        <button type="button" class="dir-btn" data-dir="W"><b>西</b>서 ←</button><button type="button" class="dir-btn back" data-back>⌫</button><button type="button" class="dir-btn" data-dir="E"><b>東</b>동 →</button>
        <span></span><button type="button" class="dir-btn" data-dir="S"><b>南</b>남 ↓</button><span></span>
      </div></div>`;
  }
  if (type === 'text') {
    return `<div class="text-wrap">
      <input class="text-answer" data-text maxlength="40" placeholder="정답을 입력하세요" autocomplete="off" spellcheck="false" />
      <p class="muted tiny">띄어쓰기는 상관없어요 · Enter 로 제출</p></div>`;
  }
  if (type === 'choice') {
    const marks = ['①', '②', '③', '④', '⑤', '⑥'];
    return `<div class="choice-wrap">${options.map((o, i) => `<button type="button" class="choice-opt" data-c="${i}" aria-pressed="false"><span class="cm">${marks[i]}</span><span>${esc(o)}</span></button>`).join('')}
      <p class="muted tiny">보기를 고른 뒤 자물쇠 열기 · 숫자 키 1~${options.length} 로도 고를 수 있어요</p></div>`;
  }
  if (type === 'ox') {
    return `<div class="ox-wrap"><button type="button" class="ox-btn o" data-ox="O" aria-pressed="false">O</button><button type="button" class="ox-btn x" data-ox="X" aria-pressed="false">X</button></div>`;
  }
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.', '/', 'C', '⌫'];
  return `<div class="num-wrap">
    <div class="num-display" data-display>&nbsp;</div>
    <div class="keypad">${keys.map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div>
    <p class="muted tiny">키보드 숫자로도 입력할 수 있어요 · 분수는 3/4 처럼</p></div>`;
}
function bindAnswerInput(root, type, len, onChange, { options = [] } = {}) {
  let value = type === 'direction' ? [] : '';
  const textEl = root.querySelector('[data-text]');
  const current = () => (type === 'direction' ? value.join('') : type === 'text' ? textEl.value : value);
  const render = () => {
    if (type === 'direction') {
      root.querySelectorAll('[data-slots] .seq-slot').forEach((s, i) => {
        const d = value[i];
        s.classList.toggle('filled', !!d);
        s.classList.toggle('next', i === value.length);
        s.innerHTML = d ? `<b>${DIRS[d].hanja}</b>` : s.dataset.n ? `<i>${s.dataset.n}</i>` : '';
      });
    } else if (type === 'choice') {
      root.querySelectorAll('[data-c]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === value)));
    } else if (type === 'ox') {
      root.querySelectorAll('[data-ox]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ox === value)));
    } else if (type === 'number') root.querySelector('[data-display]').textContent = value || '\u00a0';
    onChange?.(current());
  };
  const push = (k) => {
    if (type === 'direction') {
      if (k === 'back') value.pop(); else if (value.length < len) value.push(k);
    } else if (type === 'choice' || type === 'ox') value = k;
    else if (k === '⌫' || k === 'Backspace') value = value.slice(0, -1);
    else if (k === 'C') value = '';
    else if (value.length < 14) value += k;
    sfx.play('click');
    render();
  };
  root.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => push(b.dataset.dir)));
  root.querySelector('[data-back]')?.addEventListener('click', () => push('back'));
  root.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => push(b.dataset.k)));
  root.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => push(b.dataset.c)));
  root.querySelectorAll('[data-ox]').forEach((b) => b.addEventListener('click', () => push(b.dataset.ox)));
  if (textEl) {
    textEl.addEventListener('input', render);
    setTimeout(() => textEl.focus(), 60);
  }
  render();
  return {
    get: current,
    ready() {
      const v = current();
      if (type === 'direction') return v.length === len;
      if (type === 'text') return !!v.trim();
      return v !== '';
    },
    clear: () => { value = type === 'direction' ? [] : ''; if (textEl) { textEl.select(); } render(); },
    key(e) {
      if (type === 'text') return false; // 입력칸이 직접 받음
      if (type === 'direction') {
        const m = { ArrowUp: 'N', ArrowRight: 'E', ArrowDown: 'S', ArrowLeft: 'W', Backspace: 'back' }[e.key];
        if (m) { e.preventDefault(); push(m); return true; }
      } else if (type === 'choice') {
        const n = Number(e.key);
        if (n >= 1 && n <= options.length) { e.preventDefault(); push(String(n - 1)); return true; }
      } else if (type === 'ox') {
        const k = e.key.toUpperCase();
        if (k === 'O' || k === 'X') { e.preventDefault(); push(k); return true; }
      } else if (/^[0-9.\-/]$/.test(e.key) || e.key === 'Backspace') { e.preventDefault(); push(e.key); return true; }
      return false;
    },
  };
}

// ---- 교과 문제 퍼즐 ----
function uiPuzzle({ index, spot, intro, puzzle, solved, fragment, submit }) {
  const type = ANSWER_TYPES[puzzle.type] ? puzzle.type : 'number';
  const imgHtml = puzzle.image ? `<img class="q-img" src="${esc(puzzle.image)}" alt="문제 그림" referrerpolicy="no-referrer" title="누르면 크게 보기" />` : '';
  const len = puzzle.len || 4;
  const options = puzzle.options || [];
  const body = solved
    ? `<div class="solved-box">✅ 이미 푼 문제예요<br/><small>${esc(fragment)}</small></div>
       <div class="m-actions"><button class="btn btn-gold" data-close type="button">확인</button></div>`
    : `${answerInput(type, len, { options })}
       <p class="err" data-err></p>
       <div class="m-actions"><button class="btn btn-ghost" data-close type="button">나중에</button><button class="btn btn-gold" data-ok type="button" disabled>${type === 'direction' ? '방향 맞추기' : '자물쇠 열기'}</button></div>`;
  let input = null;
  let busy = false;
  const p = openModal(`${head('🔐', spot.name, `${index + 1}번 문제 · ${ANSWER_TYPES[type].lock}`)}
    <p class="story-intro">${esc(intro)}</p>
    <div class="problem"><div class="q-text">${esc(puzzle.q)}</div>${imgHtml}</div>
    ${body}`, {
    wide: true,
    onKey: (e) => {
      if (!input || e.isComposing || e.keyCode === 229) return; // 한글 조합 중 Enter 는 무시
      if (e.key === 'Enter') { e.preventDefault(); trySubmit(); return; }
      input.key(e);
    },
  });
  bindClose(null);
  card().querySelector('.q-img')?.addEventListener('click', (e) => e.currentTarget.classList.toggle('big'));
  if (solved) return p;
  const root = card();
  const ok = root.querySelector('[data-ok]');
  const err = root.querySelector('[data-err]');
  input = bindAnswerInput(root, type, len, () => { ok.disabled = busy || !input?.ready(); }, { options });
  ok.disabled = !input.ready();
  async function trySubmit() {
    if (busy || !input.ready()) return;
    const v = input.get();
    busy = true; ok.disabled = true; err.textContent = '확인하는 중…';
    let r;
    try { r = await submit(v); } catch (e) { err.textContent = e.message; busy = false; ok.disabled = false; return; }
    if (r?.ok) { closeModal(r); return; }
    sfx.play('wrong');
    root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake');
    err.textContent = '🔒 틀렸어요. 다시 생각해 보세요. (2초 후 다시 입력)';
    setTimeout(() => {
      busy = false;
      if (type !== 'number') input.clear();
      ok.disabled = !input.ready();
      err.textContent = '';
    }, 2000);
  }
  ok.addEventListener('click', trySubmit);
  return p;
}

// ---- 마지막: 일곱 걸음 ----
function uiFinal({ length, fragments, onPress, submit }) {
  let input = null, busy = false;
  const p = openModal(`${head('🪨', '방위 석단', '마지막 퍼즐 · 일곱 걸음')}
    <p class="m-desc">조각 번호 〔一〕부터 〔七〕까지 차례대로, 조각에 적힌 <b>방위</b>의 돌을 누르세요. 아래 칸의 번호가 조각 번호예요.</p>
    <div class="frag-list">${fragments.map((f) => `<div>${esc(f)}</div>`).join('')}</div>
    ${answerInput('direction', length, { numbered: true })}
    <p class="err" data-err></p>
    <div class="m-actions"><button class="btn btn-ghost" data-close type="button">그만두기</button><button class="btn btn-gold" data-ok type="button" disabled>밟기</button></div>`, {
    wide: true,
    onKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } else input?.key(e); },
  });
  bindClose(null);
  const root = card();
  const ok = root.querySelector('[data-ok]');
  const err = root.querySelector('[data-err]');
  let prev = '';
  input = bindAnswerInput(root, 'direction', length, (v) => {
    if (v.length > prev.length) onPress?.(v[v.length - 1]);
    prev = v;
    ok.disabled = busy || v.length !== length;
  });
  async function go() {
    const v = input.get();
    if (busy || v.length !== length) return;
    busy = true; ok.disabled = true; err.textContent = '석단이 흔들린다…';
    let r;
    try { r = await submit(v); } catch (e) { err.textContent = e.message; busy = false; ok.disabled = false; return; }
    if (r?.ok) { closeModal(v); return; }
    sfx.play('wrong');
    root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake');
    err.textContent = '돌이 제자리로 돌아갔다. 차례나 방위를 다시 확인해 보자.';
    setTimeout(() => { busy = false; input.clear(); err.textContent = ''; }, 1500);
  }
  ok.addEventListener('click', go);
  return p;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3300);
}

function refreshInventory(newId) {
  const inv = $('inventory');
  inv.replaceChildren();
  for (const id of state.items) {
    const it = ITEMS[id];
    if (!it) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'inv-slot' + (id === newId ? ' new' : '');
    b.textContent = it.icon;
    b.title = it.name;
    b.addEventListener('click', () => uiText({ title: it.name, text: it.desc, icon: it.icon }));
    inv.appendChild(b);
  }
  refreshHud();
}
function refreshHud() {
  $('fragCount').textContent = state.solved.length;
  $('fragTotal').textContent = config.puzzles.length;
}

// ---- 수첩 ----
const CLUE_TITLES = { intro: '전설', stele: '석단 옆 비석', letter: '서안 위의 종이', mirror: '경대', yakbang_note: '약방 쪽지', scroll_byeoldang: '별당의 족자', final: story => story.treasure };
function clueText(id) {
  return { intro: story.intro, stele: story.stele, letter: story.letter, mirror: story.mirror, yakbang_note: story.yakbang_note, scroll_byeoldang: story.scroll_byeoldang, final: story.finalLetter }[id] || '';
}
function openNotebook(tab = 'frags') {
  $('noteDot').hidden = true;
  let list = '';
  if (tab === 'frags') {
    const frags = [...state.solved].sort((a, b) => a - b).map((i) => ({ i, t: fragmentText(story, i + 1, state.fragments[i]) }));
    list = frags.length
      ? frags.map((f) => `<div class="note"><h3>👣 ${esc(f.t)}</h3><p class="m-from">${f.i + 1}번 문제에서 얻음</p></div>`).join('')
      : '<p class="muted">아직 모은 조각이 없어요. 문제를 풀면 조각을 얻어요.</p>';
  } else if (tab === 'clues') {
    const cl = state.clues.filter((c) => clueText(c));
    list = cl.length ? cl.map((id) => {
      const t = CLUE_TITLES[id];
      return `<div class="note"><h3>${esc(typeof t === 'function' ? t(story) : t)}</h3><p>${esc(clueText(id))}</p></div>`;
    }).join('') : '<p class="muted">아직 읽은 이야기가 없어요.</p>';
  } else {
    list = state.items.length ? state.items.map((id) => ITEMS[id]).map((i) => `<div class="note"><h3>${i.icon} ${esc(i.name)}</h3><p>${esc(i.desc)}</p></div>`).join('') : '<p class="muted">가진 물건이 없어요.</p>';
  }
  openModal(`${head('📒', '탐험 수첩')}
    <div class="note-tabs" role="tablist">
      <button type="button" data-tab="frags" aria-selected="${tab === 'frags'}">조각 ${state.solved.length}/${config.puzzles.length}</button>
      <button type="button" data-tab="clues" aria-selected="${tab === 'clues'}">이야기</button>
      <button type="button" data-tab="items" aria-selected="${tab === 'items'}">소지품</button>
    </div>
    <div class="note-list">${list}</div>`, { wide: true });
  bindClose(null);
  card().querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => openNotebook(b.dataset.tab)));
}

// ---- 힌트 ----
function openHints() {
  const goals = game.goalList();
  const firstOpen = goals.find((g) => !g.complete);
  const html = goals.map((g) => {
    const more = g.level < g.total;
    return `<div class="goal ${g.complete ? 'done' : ''}">
      <div class="ck">${g.complete ? '✓' : ''}</div>
      <div class="goal-body"><strong>${esc(g.title)}</strong>
        ${g.shown.length ? `<ol>${g.shown.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>` : ''}
        ${!g.complete && more ? `<button type="button" class="btn ${g === firstOpen ? 'btn-gold' : 'btn-ghost'}" data-hint="${g.id}">힌트 보기 (${g.level + 1}/${g.total}) · +1분</button>` : ''}
      </div></div>`;
  }).join('');
  openModal(`${head('💡', '진행 목표와 힌트')}
    <p class="m-desc">힌트를 하나 볼 때마다 순위표 기록에 <b>+${HINT_PENALTY_MS / 60000}분</b>이 더해져요. (지금까지 ${state.hintsUsed}개)</p>
    <div class="note-list">${html}</div>`, { wide: true });
  bindClose(null);
  card().querySelectorAll('[data-hint]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true; b.textContent = '불러오는 중…';
    try { await game.revealHint(b.dataset.hint); } catch (e) { toast(e.message); }
    openHints();
  }));
}

// ---- 순위표 ----
async function openLeaderboard(highlight = true) {
  openModal(`${head('🏆', '순위표', config.title)}<p class="muted">불러오는 중…</p>`, { wide: true });
  bindClose(null);
  let data;
  try { data = await backend.leaderboard(state.code, state.session); } catch (e) {
    card().querySelector('.muted').textContent = e.message;
    return;
  }
  if ($('modal').hidden) return;
  const rows = data.entries.map((e, i) => {
    const me = highlight && (e.me || e.id === state.session);
    return `<tr class="${me ? 'me' : ''}"><td class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td><td class="nm">${esc(e.nickname)}${me ? ' <em>나</em>' : ''}</td>
      <td class="tm">${formatTime(e.elapsedMs)}</td><td class="ht">${e.hints}</td><td class="sc">${formatTime(e.scoreMs)}</td></tr>`;
  }).join('');
  card().querySelector('.muted').outerHTML = `
    <p class="m-desc">기록 = 걸린 시간 + 힌트 1개당 ${HINT_PENALTY_MS / 60000}분 ${data.local ? '· <b>이 기기에만 저장된 체험판 순위</b>' : ''}</p>
    ${rows ? `<div class="board-wrap"><table class="board"><thead><tr><th>순위</th><th>이름</th><th>시간</th><th>힌트</th><th>기록</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">아직 탈출한 사람이 없어요. 첫 번째 주인공이 되어 보세요!</p>'}
    <p class="muted tiny">탈출한 사람 ${data.total}명</p>`;
}

// ---- 메뉴 ----
function openMenu() {
  openModal(`${head('☰', '메뉴')}
    <div class="choice-list">
      <button type="button" data-a="board">🏆 순위표</button>
      <button type="button" data-a="music">${sfx.musicOn ? '🎵 배경음악 끄기' : '🎵 배경음악 켜기'}</button>
      <button type="button" data-a="sound">${sfx.muted ? '🔇 효과음 켜기' : '🔊 효과음 끄기'}</button>
      <button type="button" data-a="char">🧑 캐릭터 바꾸기</button>
      <button type="button" data-a="howto">❓ 조작 방법 · 전설 다시 보기</button>
      ${state.mode === 'preview' ? '' : '<button type="button" data-a="reset">🔄 처음부터 다시 하기 (새 기록)</button>'}
    </div>`);
  bindClose(null);
  card().querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', async () => {
    const a = b.dataset.a;
    if (a === 'sound') { sfx.setMuted(!sfx.muted); openMenu(); return; }
    if (a === 'music') { sfx.setMusic(!sfx.musicOn); openMenu(); return; }
    closeModal(null);
    if (a === 'board') openLeaderboard();
    if (a === 'char') changeCharacter();
    if (a === 'howto') showIntro();
    if (a === 'reset') {
      const yes = await confirmBox('처음부터 다시 할까요?', '지금까지의 진행이 사라지고, 시간도 처음부터 다시 잽니다.');
      if (yes) { clearSave(); location.href = `${location.pathname}?code=${encodeURIComponent(state.code)}`; }
    }
  }));
}
function confirmBox(title, text) {
  const p = openModal(`${head('❔', title)}<p class="m-desc">${esc(text)}</p>
    <div class="m-actions"><button class="btn btn-ghost" data-close type="button">아니요</button><button class="btn btn-red" data-ok type="button">네</button></div>`);
  bindClose(false);
  card().querySelector('[data-ok]').addEventListener('click', () => closeModal(true));
  return p;
}

function showIntro() {
  const touch = document.body.classList.contains('touch');
  const how = touch
    ? '• 화면을 누르면 그곳으로 걸어가요. 누른 채 끌면 따라가요.\n• 반짝이는 곳을 누르면 다가가서 조사해요.\n• 두 손가락으로 확대/축소'
    : '• WASD / 방향키로 이동, Shift 로 달리기\n• 반짝이는 곳에 다가가 E 또는 Space 로 조사\n• 클릭해도 걸어가서 조사해요. 휠로 확대/축소';
  return uiText({
    title: config.title, from: `${story.name}의 전설`,
    text: `${story.synopsis}\n\n마을 곳곳 일곱 곳에 문제가 숨겨져 있어요. 문제를 풀어 자물쇠를 열 때마다 조각을 하나씩 얻고, 일곱 조각을 모아 중앙 마당의 석단 퍼즐을 풀면 보물로 가는 길이 열립니다.\n\n─ 조작 방법 ─\n${how}\n\n막히면 💡 힌트(1개당 +1분), 모은 조각은 📒 수첩에서 볼 수 있어요.`,
    icon: '🏯',
  });
}

function uiEnding() {
  const r = state.result || {};
  const p = openModal(`<div class="ending">
      <div class="trophy">🏆</div>
      <p class="get-kicker">탈출 성공</p>
      <h2>${esc(story.endingTitle)}</h2>
      <p class="m-desc">일곱 문제를 모두 풀고 ${esc(story.treasure)}을(를) 찾았어요.</p>
      <div class="stats">
        <div class="stat"><b>${formatTime(r.elapsedMs)}</b><span>걸린 시간</span></div>
        <div class="stat"><b>${r.hints ?? 0}</b><span>힌트 (+${r.hints ?? 0}분)</span></div>
        <div class="stat big"><b>${formatTime(r.scoreMs)}</b><span>최종 기록${r.rank ? ` · ${r.rank}위` : ''}</span></div>
      </div>
      <div class="m-actions" style="justify-content:center;flex-wrap:wrap">
        <button class="btn btn-ghost" data-close type="button">마을 더 둘러보기</button>
        <button class="btn btn-gold" data-board type="button">🏆 순위표 보기</button>
      </div>
    </div>`);
  bindClose(null);
  card().querySelector('[data-board]').addEventListener('click', () => openLeaderboard());
  return p;
}

// =========================================================
// 캐릭터
// =========================================================
let profile = loadProfile();
let look = generateLook(profile?.nickname || '길손', profile?.roll || 0);
let charPreview = null;
let previewRaf = 0;
function startPreview(stageEl, input, getRoll) {
  const canvas = stageEl.querySelector('canvas');
  const start = performance.now();
  let last = start;
  const tick = (t) => {
    const lk = generateLook(input.value.trim() || '길손', getRoll());
    if (charPreview) charPreview.render(lk.seed, (t - last) / 1000, 'full', Math.sin((t - start) / 1250) * 0.5);
    else {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCharacter(ctx, canvas.width / 2, canvas.height * 0.86, lk, { scale: 4.2, dir: 'down' });
    }
    last = t;
    previewRaf = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(previewRaf);
  previewRaf = requestAnimationFrame(tick);
}
async function setupPreview(stageEl) {
  try {
    const lib = await loadCharacterLibrary();
    if (lib && !charPreview) charPreview = createCharacterPreview(lib);
  } catch { charPreview = null; }
  if (charPreview) {
    charPreview.canvas.className = 'preview3d';
    stageEl.querySelector('canvas')?.replaceWith(charPreview.canvas);
  }
}

function paintChip(lk) {
  const c = $('chipAvatar');
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.beginPath(); ctx.arc(36, 36, 36, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#e9dcbc'; ctx.fillRect(0, 0, 72, 72);
  if (charPreview) {
    charPreview.snapshot(lk.seed || 0).then((url) => {
      if (!url) return;
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, 72, 72); ctx.restore(); };
      img.src = url;
    });
    return;
  }
  drawCharacter(ctx, 36, 118, lk, { scale: 2.1, dir: 'down' });
  ctx.restore();
}

function changeCharacter() {
  let roll = profile?.roll || 0;
  openModal(`${head('🧑', '캐릭터 바꾸기')}
    <div class="avatar-stage" id="charStage"><canvas width="320" height="320"></canvas></div>
    <p class="muted" style="text-align:center">순위표 이름은 바뀌지 않아요: <b>${esc(state.nickname)}</b></p>
    <div class="row"><button class="btn btn-ghost" data-roll type="button">🎲 다시 뽑기</button><button class="btn btn-gold" data-ok type="button">이걸로!</button></div>`);
  bindClose(null);
  const fake = { value: state.nickname };
  const stage = $('charStage');
  if (charPreview) stage.querySelector('canvas').replaceWith(charPreview.canvas);
  startPreview(stage, fake, () => roll);
  card().querySelector('[data-roll]').addEventListener('click', () => { roll = (roll + 1 + Math.floor(Math.random() * 1000)) % 100000; });
  card().querySelector('[data-ok]').addEventListener('click', () => {
    cancelAnimationFrame(previewRaf);
    profile = { nickname: state.nickname, roll };
    saveProfile(profile);
    look = generateLook(state.nickname, roll);
    world.setLook(look, state.nickname);
    paintChip(look);
    closeModal(true);
  });
}

// =========================================================
// 시작 화면 (구성 코드 + 이름)
// =========================================================
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

const remote = createRemoteBackend();
let remoteOk = null;
async function backendFor(code) {
  if (String(code).toUpperCase() === 'DEMO') return createLocalBackend(DEMO_CONFIG);
  if (remoteOk === null) remoteOk = await remote.available();
  if (!remoteOk) throw new Error('게임 서버에 연결할 수 없어요. 지금은 체험판(코드 DEMO)만 할 수 있어요.');
  return remote;
}

function showStart() {
  return new Promise((resolve) => {
    const sv = loadSave();
    const el = $('start');
    const codeIn = $('codeInput'), nameIn = $('nameInput'), err = $('startErr');
    const urlCode = (params.get('code') || '').trim().toUpperCase();
    codeIn.value = urlCode || sv?.code || '';
    nameIn.value = profile?.nickname || '';
    if (urlCode) codeIn.readOnly = true;
    let roll = profile?.roll || 0;
    const stage = $('startStage');
    setupPreview(stage).then(() => startPreview(stage, nameIn, () => roll));
    // 이어하기
    const cont = $('continueBox');
    if (sv && sv.session && (!urlCode || urlCode === sv.code)) {
      cont.hidden = false;
      $('continueInfo').textContent = `${sv.nickname} · 코드 ${sv.code} · 조각 ${sv.solved.length}/${PUZZLE_COUNT}${sv.finished ? ' · 탈출 완료' : ''}`;
    }
    el.hidden = false;
    $('loading').classList.add('done');
    setTimeout(() => (codeIn.value ? nameIn : codeIn).focus(), 60);

    const busy = (b) => el.querySelectorAll('button, input').forEach((x) => { if (x !== codeIn || !urlCode) x.disabled = b; });
    async function begin(kind) {
      err.textContent = '';
      busy(true);
      try {
        if (kind === 'continue') {
          const be = await backendFor(sv.code);
          const r = await be.resume(sv.session);
          const cfg = await be.config(sv.code);
          resolve({ be, cfg, st: mergeResume(sv, r), roll });
        } else {
          const code = codeIn.value.trim().toUpperCase();
          const nickname = nameIn.value.trim().slice(0, 12);
          if (!code) throw new Error('선생님이 알려 준 구성 코드를 입력해 주세요.');
          if (!nickname) throw new Error('순위표에 쓸 이름을 입력해 주세요.');
          const be = await backendFor(code);
          const cfg = await be.config(code);
          const r = await be.start(code, nickname);
          const st = freshState({ code: cfg.code, session: r.session, mode: be.mode, nickname, startedAt: r.startedAt, clockOffset: r.now - Date.now() });
          profile = { nickname, roll };
          saveProfile(profile);
          resolve({ be, cfg, st, roll });
        }
        cancelAnimationFrame(previewRaf);
        el.hidden = true;
      } catch (e) {
        err.textContent = e.status === 404 && kind === 'continue' ? '이전 기록을 찾지 못했어요. 새로 시작해 주세요.' : e.message;
        busy(false);
      }
    }
    $('startForm').onsubmit = (e) => { e.preventDefault(); begin('new'); };
    $('continueBtn').onclick = () => begin('continue');
    $('rerollBtn').onclick = () => { roll = (roll + 1 + Math.floor(Math.random() * 1000)) % 100000; };
    $('demoBtn').onclick = () => { codeIn.readOnly = false; codeIn.value = 'DEMO'; nameIn.focus(); };
  });
}

function mergeResume(sv, r) {
  const st = { ...freshState(), ...sv };
  st.solved = r.solved || [];
  st.fragments = {};
  for (const f of r.fragments || []) st.fragments[f.puzzle] = f.dir;
  st.hintKeys = r.hintKeys || st.hintKeys;
  st.hintsUsed = r.hints ?? st.hintKeys.length;
  st.startedAt = r.startedAt;
  st.clockOffset = r.now - Date.now();
  st.finished = !!r.finished;
  if (r.result) st.result = r.result;
  // 열쇠·등잔 보상은 푼 문제에 맞춰 복원
  if (st.solved.includes(0) && !st.flags.daegam_unlocked && !st.items.includes('key')) st.items.push('key');
  if (st.solved.includes(4) && !st.items.includes('lamp')) st.items.push('lamp');
  if (st.solved.includes(0)) st.flags.got_key = true;
  if (st.solved.includes(4)) st.flags.got_lamp = true;
  return st;
}

// =========================================================
// 시작
// =========================================================
let currentNear = null;
function showNear(id) {
  currentNear = id;
  const l = id ? game.labelFor(id) : null;
  $('hint').hidden = !!l;
  if (!l) { $('nearCard').hidden = true; return; }
  $('nearTitle').textContent = l.title;
  $('actLabel').textContent = l.action;
  $('nearMeta').textContent = id.startsWith('door_') ? '집' : id.startsWith('exit_') ? '나가기' : game.labelFor(id).action === '문제 풀기' ? '문제' : '조사하기';
  $('nearCard').hidden = false;
}

let busyInteract = false;
async function onActivate(id) {
  if (busyInteract || !$('modal').hidden) return;
  if (performance.now() - lastModalClose < 250) return;
  busyInteract = true;
  try { await game.interact(id); } catch (e) {
    console.error('[hanok] 상호작용 오류', e);
    toast(e.message || '문제가 생겼어요.');
  } finally {
    busyInteract = false;
    if (currentNear) showNear(currentNear);
  }
}

async function main() {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('touch', isTouch);
  document.addEventListener('contextmenu', (e) => { if (e.target.tagName === 'CANVAS') e.preventDefault(); });
  document.addEventListener('selectstart', (e) => { if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) e.preventDefault(); });
  if (!hasWebGL()) {
    $('loadingText').textContent = '이 브라우저는 3D(WebGL)를 지원하지 않아요. 최신 크롬·사파리·엣지에서 열어 주세요.';
    return;
  }

  // 교사 미리보기: 편집 화면에서 보낸 구성으로 바로 시작 (기록 저장 안 함)
  if (params.has('preview')) {
    let full = null;
    try { full = JSON.parse(sessionStorage.getItem('hanok.preview') || localStorage.getItem('hanok.preview') || 'null'); } catch { /* 무시 */ }
    if (!full) { $('loadingText').textContent = '미리보기할 구성이 없어요. 편집 화면에서 "미리 해보기"를 눌러 주세요.'; return; }
    full.code = 'PREVIEW';
    backend = createLocalBackend(full, { persist: false });
    config = await backend.config();
    const r = await backend.start('PREVIEW', '선생님');
    state = freshState({ code: 'PREVIEW', session: r.session, mode: 'preview', nickname: '선생님', startedAt: r.startedAt });
    document.body.classList.add('preview-mode');
  } else {
    const res = await showStart();
    backend = res.be; config = res.cfg; state = res.st;
    look = generateLook(state.nickname, res.roll);
    save();
  }
  story = getStory(config.story);
  $('gameTitle').textContent = config.title || story.title;
  document.title = `${config.title || story.title} · 3D 방탈출`;
  $('loading').classList.remove('done');
  $('loadingText').textContent = '눈 내린 한옥마을을 짓고 있어요…';

  const ui = {
    text: uiText, itemGet: uiItemGet, fragment: uiFragment, puzzle: uiPuzzle, finalPuzzle: uiFinal,
    toast, ending: uiEnding, refreshInventory, refreshHud, sfx: (n) => sfx.play(n),
  };
  const worldProxy = { enterArea: (...a) => world.enterArea(...a), fx: (...a) => world.fx(...a), openStairs: (...a) => world.openStairs(...a) };
  game = createGame({ state, ui, world: worldProxy, save, backend, config, story });

  const canvas = document.createElement('canvas');
  canvas.className = 'world3d';
  canvas.setAttribute('aria-label', '3D 한옥마을');
  $('stage').appendChild(canvas);
  const mod = await import('./world3d.js');
  world = await mod.createWorld(canvas, {
    look, nickname: state.nickname, state, game, story,
    onNear: showNear, onActivate, sfx: (n) => sfx.play(n),
    onAreaChange: (id) => {
      $('areaName').textContent = AREA_NAMES[id] || '';
      state.area = id; save();
      sfx.setMusicLevel(id === 'village' ? 1 : id === 'vault' || id === 'byeoldang' ? 0.55 : 0.8);
    },
  });
  $('areaName').textContent = AREA_NAMES[world.area] || '';
  $('loading').classList.add('done');
  if (params.has('debug')) window.__game = { state, game, world, ui, backend, config };
  refreshInventory();
  $('chipName').textContent = state.nickname;
  paintChip(look);
  $('profileChip').hidden = false;
  $('profileChip').addEventListener('click', changeCharacter);

  if (sfx.musicOn) sfx.startMusic();
  window.addEventListener('pointerdown', () => { if (sfx.musicOn) sfx.startMusic(); }, { once: true });
  if (!state.clues.length && !state.solved.length) await showIntro();
  else if (state.finished) toast('이미 탈출에 성공한 기록이에요. 순위표는 메뉴에서 볼 수 있어요.');
  else toast(`이어서 진행해요 · 조각 ${state.solved.length}/${config.puzzles.length}`);

  $('actBtn').addEventListener('click', () => world.activateNear());
  $('notebookBtn').addEventListener('click', () => openNotebook());
  $('hintBtn').addEventListener('click', openHints);
  $('menuBtn').addEventListener('click', openMenu);
  $('boardBtn').addEventListener('click', () => openLeaderboard());
  const runBtn = $('runBtn');
  runBtn.addEventListener('click', () => {
    const on = runBtn.getAttribute('aria-pressed') !== 'true';
    runBtn.setAttribute('aria-pressed', String(on));
    runBtn.querySelector('.run-label').textContent = on ? '달리는 중' : '달리기';
    world.setRunning(on);
  });
  window.addEventListener('keydown', (e) => {
    if (!$('modal').hidden) return;
    if (e.code === 'KeyN' || e.code === 'Tab') { e.preventDefault(); openNotebook(); }
    if (e.code === 'KeyH') openHints();
  });

  const tickTimer = () => {
    const ms = state.finished && state.result ? state.result.elapsedMs : now() - state.startedAt;
    $('timer').textContent = formatTime(ms);
    $('hintCount').textContent = state.hintsUsed;
  };
  tickTimer();
  let tick = 0;
  setInterval(() => {
    tickTimer();
    if (++tick % 3 === 0) { state.pos = world.getPlayer(); state.area = world.area; save(); }
  }, 1000);
  window.addEventListener('pagehide', () => { state.pos = world.getPlayer(); state.area = world.area; save(); });
  setTimeout(() => $('hint').classList.add('fade'), 12000);
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  window.addEventListener('keydown', () => sfx.unlock(), { once: true });
}

main().catch((err) => {
  console.error(err);
  $('loading').classList.remove('done');
  $('loadingText').textContent = `불러오는 중 문제가 생겼어요. 새로고침해 주세요. (${err.message || err})`;
});
