// 교사용 편집 모드
import { STORIES, STORY_IDS, getStory, cleanStoryVars } from './game/stories.js';
import { SPOTS, DIRS, PUZZLE_COUNT, DEMO_CONFIG } from './game/content.js';
import { validatePuzzles, normalizeDirection, normalizeOX, ANSWER_TYPES, DEFAULT_COOLDOWN, cleanCooldown, cooldownFor } from './game/answer.js';
import { formatTime } from './game/state.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DRAFT_KEY = 'hanok.editor.draft';

const blankPuzzle = () => ({ q: '', image: '', type: 'number', answer: '', hint: '', options: ['', '', '', ''] });
let cfg = { title: '', story: 'seolhwa', storyVars: {}, puzzles: Array.from({ length: PUZZLE_COUNT }, blankPuzzle), cooldown: { ...DEFAULT_COOLDOWN } };
let activePanel = 'basic', activePz = 0;
let loaded = null; // { code, password }

async function api(action, body) {
  let r;
  try {
    r = await fetch('./api/editor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
  } catch { throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
  let data = null;
  try { data = await r.json(); } catch { /* 빈 응답 */ }
  if (r.status === 404 && !data) throw new Error('서버(API)를 찾을 수 없어요. Vercel 에 배포된 주소에서 열어 주세요. (미리 해보기는 서버 없이도 돼요)');
  if (!r.ok) throw new Error(data?.error || `서버 오류 (${r.status})`);
  return data;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3300);
}

function saveDraft() {
  queueMicrotask(refreshNav);
  const put = (c) => localStorage.setItem(DRAFT_KEY, JSON.stringify({ cfg: c, code: loaded?.code || null, at: Date.now() }));
  try { put(cfg); } catch {
    // 그림이 많아 저장 공간이 모자라면 그림만 빼고 저장
    try { put({ ...cfg, puzzles: cfg.puzzles.map((p) => ({ ...p, image: p.image?.startsWith('data:') ? '' : p.image })) }); } catch { /* 무시 */ }
  }
}

// ---------------- 그림 올리기 (브라우저에서 줄여서 담음 → 저장할 때 서버가 Storage 에 올림) ----------------
async function compressImage(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('그림 파일(jpg, png 등)만 올릴 수 있어요.');
  if (file.size > 15 * 1024 * 1024) throw new Error('그림 파일이 너무 커요. (15MB 이하)');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('그림을 읽지 못했어요.')); im.src = url; });
    let max = 1280;
    for (let attempt = 0; attempt < 6; attempt++) {
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * sc));
      c.height = Math.max(1, Math.round(img.naturalHeight * sc));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.85, 0.75, 0.62]) {
        const d = c.toDataURL('image/jpeg', q);
        if (d.length <= 380_000) return d;
      }
      max = Math.round(max * 0.75);
    }
    throw new Error('그림을 충분히 줄이지 못했어요. 더 작은 그림을 써 주세요.');
  } finally { URL.revokeObjectURL(url); }
}

// ---------------- 이야기 ----------------
function renderStories() {
  $('stories').innerHTML = STORY_IDS.map((id) => {
    const s = getStory(id, id === 'teacher' ? cfg.storyVars : undefined);
    return `<button type="button" class="story-card" role="radio" aria-checked="${cfg.story === id}" data-story="${id}">
      <span class="hj">${esc(s.hanja)}</span><h3>${esc(s.name)}</h3><p>${esc(s.synopsis)}</p><div class="tr">보물: ${esc(s.treasure)}</div></button>`;
  }).join('');
  $('stories').querySelectorAll('[data-story]').forEach((b) => b.addEventListener('click', () => {
    cfg.story = b.dataset.story;
    renderStories();
    saveDraft();
  }));
  $('storyVarsBox').hidden = !STORIES[cfg.story]?.custom;
  renderStoryboard();
}
function renderStoryboard() {
  const s = getStory(cfg.story, cfg.storyVars);
  const first = s.intro.split('\n\n').slice(0, 2).join('\n\n');
  const items = [
    { t: '마을 입구 · 장승', d: first },
    ...SPOTS.map((sp, i) => ({
      t: `${sp.name} — ${i + 1}번 문제`,
      d: s.spots[i] + (sp.reward ? `\n→ 풀면 ${sp.reward === 'key' ? '놋쇠 열쇠(대감댁 문)' : '등잔(어두운 별당)'}도 얻어요.` : ''),
      tag: `선생님 문제 ${i + 1} → ${s.fragment} 〔${'一二三四五六七'[i]}〕`,
    })),
    { t: '중앙 마당 · 방위 석단 — 8번 퍼즐', d: s.stele, tag: '일곱 조각으로 푸는 마지막 퍼즐', final: true },
    { t: '지하 보물창고', d: s.finalLetter },
  ];
  $('storyboard').innerHTML = items.map((it) => `<li><b>${esc(it.t)}</b><span>${esc(it.d)}</span>${it.tag ? `<em class="tag ${it.final ? 'final' : ''}">${esc(it.tag)}</em>` : ''}</li>`).join('');
}

// ---------------- 문제 ----------------
const NOTES = {
  0: '풀면 대감댁 열쇠가 나와요',
  4: '대감댁 안 (1번을 먼저 풀어야 들어감) · 풀면 등잔',
  6: '별당 안 (5번을 먼저 풀어야 들어감)',
};
function renderPuzzles() {
  $('puzzles').innerHTML = cfg.puzzles.map((p, i) => {
    const type = ANSWER_TYPES[p.type] ? p.type : 'number';
    return `
    <div class="pz" data-i="${i}">
      <div class="pz-head"><span class="pn">${i + 1}</span><div><b>${esc(SPOTS[i].name)}</b><div class="loc">${esc(SPOTS[i].where)}</div></div>${NOTES[i] ? `<span class="pz-note">${esc(NOTES[i])}</span>` : ''}</div>
      <div class="pz-cols"><div class="pz-left">
      <label class="lbl">문제</label>
      <div class="q-wrap">
        <textarea class="q-input" data-f="q" maxlength="1500" rows="5" placeholder="학생에게 보여 줄 문제를 적어 주세요.&#10;예: 3 × 4 + 5 의 값은?">${esc(p.q)}</textarea>
        <div class="q-foot"><span class="q-tip">Enter 로 줄을 바꿀 수 있어요</span><span class="q-count" data-count>${String(p.q || '').length} / 1500</span></div>
      </div>
      <label class="lbl">그림 (선택)</label>
      <div class="img-box" data-drop>
        ${p.image ? `<img class="img-prev" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer" onerror="this.alt='그림을 불러오지 못했어요'" />` : '<div class="img-empty">🖼️ 그림 파일을 끌어다 놓거나, 복사한 그림을 이 카드에서 Ctrl+V</div>'}
        <div class="img-actions">
          <label class="btn btn-ghost btn-sm file-btn">📁 그림 올리기<input type="file" accept="image/*" data-file hidden /></label>
          ${p.image ? '<button type="button" class="btn btn-ghost btn-sm" data-imgdel>🗑️ 그림 빼기</button>' : ''}
          <details class="img-url"><summary>주소로 넣기</summary><input type="url" data-f="imageUrl" maxlength="500" value="${esc(p.image && !p.image.startsWith('data:') ? p.image : '')}" placeholder="https://…/그림.png" /></details>
        </div>
        <p class="err tiny" data-imgerr></p>
      </div>
      </div><div class="pz-right">
      <label class="lbl">정답 종류</label>
      <div class="type-tog">${Object.entries(ANSWER_TYPES).map(([k, t]) => `<button type="button" data-type="${k}" aria-pressed="${type === k}">${t.icon} ${t.name}</button>`).join('')}</div>
      <label class="lbl">정답</label>
      <div data-answer></div>
      <label class="lbl">힌트 (선택 · 학생이 보면 +1분)</label>
      <input type="text" data-f="hint" maxlength="500" value="${esc(p.hint || '')}" placeholder="예: 곱셈을 먼저 계산해요" />
      </div></div>
    </div>`;
  }).join('');
  $('puzzles').querySelectorAll('.pz').forEach((el) => {
    const i = +el.dataset.i;
    const p = cfg.puzzles[i];
    el.querySelectorAll('[data-f="q"], [data-f="hint"]').forEach((inp) => inp.addEventListener('input', () => { p[inp.dataset.f] = inp.value; saveDraft(); }));
    // 문제 칸: 글자 수 · 내용에 맞춰 높이 자동 조절
    const qa = el.querySelector('.q-input');
    const fit = () => { qa.style.height = 'auto'; qa.style.height = `${Math.max(150, qa.scrollHeight + 2)}px`; el.querySelector('[data-count]').textContent = `${qa.value.length} / 1500`; };
    qa.addEventListener('input', fit);
    requestAnimationFrame(fit);
    el.querySelector('[data-f="imageUrl"]').addEventListener('change', (e) => { p.image = e.target.value.trim(); saveDraft(); renderPuzzles(); });
    const setImage = async (file) => {
      const errEl = el.querySelector('[data-imgerr]');
      errEl.textContent = '그림을 줄이는 중…';
      try { p.image = await compressImage(file); saveDraft(); renderPuzzles(); }
      catch (e) { errEl.textContent = e.message; }
    };
    el.querySelector('[data-file]').addEventListener('change', (e) => { if (e.target.files[0]) setImage(e.target.files[0]); });
    el.querySelector('[data-imgdel]')?.addEventListener('click', () => { p.image = ''; saveDraft(); renderPuzzles(); });
    const drop = el.querySelector('[data-drop]');
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) setImage(f); });
    el.addEventListener('paste', (e) => {
      const item = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith('image/'));
      if (item) { e.preventDefault(); setImage(item.getAsFile()); }
    });
    el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      if (p.type === b.dataset.type) return;
      p.type = b.dataset.type;
      p.answer = b.dataset.type === 'choice' ? '' : '';
      if (b.dataset.type === 'choice' && !(p.options && p.options.length >= 2)) p.options = ['', '', '', ''];
      saveDraft();
      renderPuzzles();
    }));
    renderAnswer(el.querySelector('[data-answer]'), i);
    el.hidden = i !== activePz;
  });
  refreshNav();
}
function renderAnswer(box, i) {
  const p = cfg.puzzles[i];
  const type = ANSWER_TYPES[p.type] ? p.type : 'number';
  if (type === 'number') {
    box.innerHTML = `<input type="text" inputmode="decimal" maxlength="12" value="${esc(p.answer)}" placeholder="예: 17 · 3.5 · 3/4 · -2" />
      <p class="muted tiny">정수, 소수, 분수(3/4), 음수 가능. 0.50 과 0.5 는 같은 답으로 봐요.</p>`;
    box.querySelector('input').addEventListener('input', (e) => { p.answer = e.target.value; saveDraft(); });
    return;
  }
  if (type === 'text') {
    box.innerHTML = `<input type="text" maxlength="120" value="${esc(p.answer)}" placeholder="예: 세종대왕, 세종" />
      <p class="muted tiny">맞는 답이 여러 개면 쉼표(,)로 나눠 적어요. 띄어쓰기·영문 대소문자·마침표는 무시해요.</p>`;
    box.querySelector('input').addEventListener('input', (e) => { p.answer = e.target.value; saveDraft(); });
    return;
  }
  if (type === 'ox') {
    const cur = normalizeOX(p.answer);
    box.innerHTML = `<div class="ox-pick"><button type="button" data-ox="O" aria-pressed="${cur === 'O'}">O 맞다</button><button type="button" data-ox="X" aria-pressed="${cur === 'X'}">X 틀리다</button></div>`;
    box.querySelectorAll('[data-ox]').forEach((b) => b.addEventListener('click', () => { p.answer = b.dataset.ox; saveDraft(); renderAnswer(box, i); }));
    return;
  }
  if (type === 'choice') {
    if (!Array.isArray(p.options) || p.options.length < 2) p.options = ['', '', '', ''];
    const marks = ['①', '②', '③', '④', '⑤', '⑥'];
    box.innerHTML = `<div class="opt-list">${p.options.map((o, k) => `
        <div class="opt-row ${String(p.answer) === String(k) && p.answer !== '' ? 'right' : ''}">
          <button type="button" class="opt-pick" data-pick="${k}" title="정답으로 정하기">${String(p.answer) === String(k) && p.answer !== '' ? '✔' : marks[k]}</button>
          <input type="text" maxlength="80" data-opt="${k}" value="${esc(o)}" placeholder="보기 ${k + 1}" />
          ${p.options.length > 2 ? `<button type="button" class="opt-del" data-del="${k}" title="보기 빼기">✕</button>` : ''}
        </div>`).join('')}</div>
      ${p.options.length < 6 ? '<button type="button" class="btn btn-ghost btn-sm" data-addopt>＋ 보기 추가</button>' : ''}
      <p class="muted tiny">왼쪽 번호를 눌러 정답 보기를 정해요. (✔ 표시가 정답)</p>`;
    box.querySelectorAll('[data-opt]').forEach((inp) => inp.addEventListener('input', () => { p.options[+inp.dataset.opt] = inp.value; saveDraft(); }));
    box.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { p.answer = +b.dataset.pick; saveDraft(); renderAnswer(box, i); }));
    box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.del;
      p.options.splice(k, 1);
      if (p.answer !== '' && Number(p.answer) === k) p.answer = '';
      else if (p.answer !== '' && Number(p.answer) > k) p.answer = Number(p.answer) - 1;
      saveDraft(); renderAnswer(box, i);
    }));
    box.querySelector('[data-addopt]')?.addEventListener('click', () => { p.options.push(''); saveDraft(); renderAnswer(box, i); });
    return;
  }
  const render = () => {
    const a = normalizeDirection(p.answer);
    box.innerHTML = `<div class="dir-builder">
        <div class="dir-show">${a ? [...a].map((d) => DIRS[d].hanja).join('') : '<span style="opacity:.4;font-size:14px;letter-spacing:0">버튼으로 입력</span>'}</div>
        ${['N', 'E', 'S', 'W'].map((d) => `<button type="button" data-d="${d}" title="${DIRS[d].ko}">${DIRS[d].hanja}</button>`).join('')}
        <button type="button" data-d="back" title="지우기">⌫</button>
      </div><p class="muted tiny">${a ? `${[...a].map((d) => DIRS[d].ko).join(' → ')} (${a.length}개)` : '학생은 동서남북 버튼을 이 순서대로 눌러야 해요. 최대 10개'}</p>`;
    box.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
      let a2 = normalizeDirection(p.answer);
      if (b.dataset.d === 'back') a2 = a2.slice(0, -1); else if (a2.length < 10) a2 += b.dataset.d;
      p.answer = a2;
      saveDraft();
      render();
    }));
  };
  render();
}

// ---------------- 왼쪽 메뉴 · 패널 ----------------
function setPanel(name, pz) {
  if (pz != null) activePz = Math.max(0, Math.min(PUZZLE_COUNT - 1, pz));
  activePanel = name;
  document.querySelectorAll('[data-panel]').forEach((el) => { el.hidden = el.dataset.panel !== name; });
  document.querySelectorAll('#puzzles .pz').forEach((el) => { el.hidden = +el.dataset.i !== activePz; });
  $('pzNow').textContent = activePz + 1;
  $('pzPrev').disabled = activePz === 0;
  $('pzNext').disabled = activePz === PUZZLE_COUNT - 1;
  if (name === 'save') renderChecks();
  if (name === 'room') refreshRoom(true);
  if (name === 'board') loadBoard();
  refreshNav();
  document.querySelector('.ed-panels')?.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0 });
}
function puzzleProblems(i) {
  return validatePuzzles(cfg.puzzles.map((p, k) => (k === i ? p : { q: 'x', type: 'number', answer: '1' })), PUZZLE_COUNT);
}
function refreshNav() {
  if ($('editor').hidden) return;
  document.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === activePanel && !(b.dataset.go === 'puzzles' && false)));
  $('navPuzzles').innerHTML = cfg.puzzles.map((p, i) => {
    const errs = puzzleProblems(i);
    const empty = !String(p.q || '').trim();
    const st = empty ? 'empty' : errs.length ? 'warn' : 'ok';
    const t = ANSWER_TYPES[p.type] || ANSWER_TYPES.number;
    return `<button type="button" class="nav-sub ${activePanel === 'puzzles' && activePz === i ? 'on' : ''}" data-pz="${i}" title="${esc(errs[0] || SPOTS[i].name)}">
      <span class="pn-s">${i + 1}</span><span class="nm">${esc(SPOTS[i].short)}</span><span class="ty">${t.icon}</span><span class="st ${st}">${st === 'ok' ? '✓' : st === 'warn' ? '!' : ''}</span></button>`;
  }).join('');
  $('navPuzzles').querySelectorAll('[data-pz]').forEach((b) => b.addEventListener('click', () => setPanel('puzzles', +b.dataset.pz)));
  const okCount = cfg.puzzles.filter((_, i) => !puzzleProblems(i).length).length;
  $('navPzSt').textContent = `${okCount}/7`;
  $('navPzSt').className = `nav-st ${okCount === 7 ? 'ok' : ''}`;
  $('navBasicSt').textContent = String($('title').value || '').trim() ? '✓' : '';
  $('navBasicSt').className = `nav-st ${String($('title').value || '').trim() ? 'ok' : ''}`;
  $('navSaveSt').textContent = loaded ? loaded.code : '';
  if (activePanel === 'save') renderChecks();
}
function renderChecks() {
  const errs = collect();
  $('checkList').innerHTML = errs.length
    ? `<p class="chk-title">저장하기 전에 확인해 주세요 (${errs.length})</p>${errs.map((e) => {
      const m = /^(\d)번/.exec(e);
      return `<button type="button" class="chk-item" ${m ? `data-pz="${+m[1] - 1}"` : 'data-basic'}>⚠️ ${esc(e)} <span>고치러 가기 →</span></button>`;
    }).join('')}`
    : '<p class="chk-ok">✅ 모든 칸이 채워졌어요. 왼쪽 아래 <b>저장하기</b>를 눌러 주세요.</p>';
  $('checkList').querySelectorAll('[data-pz]').forEach((b) => b.addEventListener('click', () => setPanel('puzzles', +b.dataset.pz)));
  $('checkList').querySelectorAll('[data-basic]').forEach((b) => b.addEventListener('click', () => setPanel('basic')));
}
function setSaved(on) {
  document.querySelectorAll('[data-after-save]').forEach((el) => { el.hidden = !on; });
}
$('sideNav').addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) setPanel(b.dataset.go);
});
$('pzPrev').addEventListener('click', () => setPanel('puzzles', activePz - 1));
$('pzNext').addEventListener('click', () => setPanel('puzzles', activePz + 1));
// 맞춤 이야기 입력
for (const [id, key] of [['svTeacher', 'teacher'], ['svGift', 'gift'], ['svLetter', 'letter']]) {
  $(id).addEventListener('input', (e) => {
    cfg.storyVars = { ...(cfg.storyVars || {}), [key]: e.target.value };
    saveDraft();
    renderStoryboard();
    clearTimeout($(id)._t);
    $(id)._t = setTimeout(renderStories, 400);
  });
}

// ---------------- 오답 대기 시간 ----------------
function renderCooldown() {
  const cd = cleanCooldown(cfg.cooldown);
  cfg.cooldown = cd;
  $('cdFirst').value = cd.first; $('cdStep').value = cd.step; $('cdMax').value = cd.max;
  updateCooldownPreview();
}
function updateCooldownPreview() {
  const raw = { first: $('cdFirst').value, step: $('cdStep').value, max: $('cdMax').value };
  const cd = cleanCooldown(raw);
  cfg.cooldown = cd;
  const seq = [1, 2, 3, 4, 5].map((n) => `${cooldownFor(cd, n)}초`);
  let reach = 1;
  while (reach < 200 && cooldownFor(cd, reach) < cd.max) reach++;
  const fix = Number(raw.max) < Number(raw.first) ? ' · 최대값이 처음 값보다 작아서 처음 값에 맞췄어요' : '';
  $('cdPreview').innerHTML = cd.first === 0 && cd.step === 0
    ? '대기 없이 바로 다시 입력할 수 있어요.'
    : `1번째 오답 → <b>${seq[0]}</b>, 2번째 → <b>${seq[1]}</b>, 3번째 → <b>${seq[2]}</b>, 4번째 → <b>${seq[3]}</b>, 5번째 → <b>${seq[4]}</b> … ${reach < 200 ? `${reach}번째부터 계속 <b>${cd.max}초</b>` : ''}${fix}`;
  saveDraft();
}
['cdFirst', 'cdStep', 'cdMax'].forEach((id) => $(id).addEventListener('input', updateCooldownPreview));

// ---------------- 시작 ----------------
function openEditor() {
  $('entry').hidden = true;
  $('editor').hidden = false;
  $('title').value = cfg.title;
  $('pwNew').hidden = !!loaded;
  $('pwLoaded').hidden = !loaded;
  $('codeBadge').hidden = !loaded;
  if (loaded) $('codeBadge').textContent = loaded.code;
  setSaved(!!loaded);
  cfg.storyVars = cleanStoryVars(cfg.storyVars);
  $('svTeacher').value = cfg.storyVars.teacher; $('svGift').value = cfg.storyVars.gift; $('svLetter').value = cfg.storyVars.letter;
  activePz = 0;
  renderStories();
  renderPuzzles();
  renderCooldown();
  if (loaded) { showResult(loaded.code); startRoomWatch(); }
  setPanel(loaded ? 'room' : 'basic');
}

function showResult(code) {
  $('result').hidden = false;
  $('resultCode').textContent = code;
  const base = location.href.replace(/\/edit(\.html)?(\?.*)?(#.*)?$/, '/').replace(/[^/]*$/, '');
  $('studentLink').value = `${base}?code=${code}`;
}

$('newBtn').addEventListener('click', () => {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* 무시 */ }
  if (d && !d.code && d.cfg && confirm('저장하지 않은 작성 중인 구성이 있어요. 이어서 작성할까요?\n(취소를 누르면 빈 구성으로 시작)')) cfg = d.cfg;
  else if (confirm('체험판 예시 문제를 채워 넣고 시작할까요?\n(취소를 누르면 빈 칸으로 시작)')) {
    cfg = { title: '', story: 'seolhwa', puzzles: DEMO_CONFIG.puzzles.map((p) => ({ image: '', hint: '', options: ['', '', '', ''], ...p })), cooldown: { ...DEFAULT_COOLDOWN } };
  }
  loaded = null;
  openEditor();
});

$('loadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = $('loadCode').value.trim().toUpperCase();
  const password = $('loadPw').value;
  $('loadErr').textContent = '';
  if (!code || !password) { $('loadErr').textContent = '코드와 비밀번호를 입력해 주세요.'; return; }
  try {
    const c = await api('load', { code, password });
    cfg = { title: c.title, story: c.story, storyVars: c.storyVars || {}, puzzles: c.puzzles.map((p) => ({ image: '', hint: '', options: ['', '', '', ''], ...p })), cooldown: cleanCooldown(c.cooldown) };
    loaded = { code: c.code, password };
    openEditor();
    toast(`${c.code} 구성을 불러왔어요.`);
  } catch (err) { $('loadErr').textContent = err.message; }
});

$('title').addEventListener('input', (e) => { cfg.title = e.target.value; saveDraft(); });

function collect() {
  cfg.title = $('title').value.trim();
  const errs = [];
  if (!cfg.title) errs.push('게임 제목을 입력해 주세요.');
  errs.push(...validatePuzzles(cfg.puzzles, PUZZLE_COUNT));
  return errs;
}

$('previewBtn').addEventListener('click', () => {
  const errs = collect();
  if (errs.length) { $('saveErr').textContent = `미리 해보기 전에 고칠 곳이 ${errs.length}개 있어요.`; setPanel('save'); return; }
  $('saveErr').textContent = '';
  const data = JSON.stringify({ code: 'PREVIEW', title: cfg.title, story: cfg.story, storyVars: cleanStoryVars(cfg.storyVars), puzzles: cfg.puzzles, cooldown: cleanCooldown(cfg.cooldown) });
  try { sessionStorage.setItem('hanok.preview', data); } catch { /* 무시 */ }
  try { localStorage.setItem('hanok.preview', data); } catch { /* 그림이 커서 못 담으면 sessionStorage 사용 */ }
  window.open('./?preview=1', '_blank');
});

$('editor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errs = collect();
  $('saveErr').textContent = '';
  if (errs.length) { $('saveErr').textContent = `고칠 곳이 ${errs.length}개 있어요.`; setPanel('save'); return; }
  if (JSON.stringify(cfg).length > 4_000_000) { $('saveErr').textContent = '그림을 합친 크기가 너무 커요. 그림 몇 개를 더 작은 것으로 바꿔 주세요.'; return; }
  const btn = $('saveBtn');
  btn.disabled = true; btn.textContent = '저장하는 중… (그림이 있으면 조금 걸려요)';
  try {
    if (loaded) {
      const c = await api('update', { code: loaded.code, password: loaded.password, ...cfg });
      cfg.puzzles = c.puzzles.map((p) => ({ image: '', hint: '', options: ['', '', '', ''], ...p }));
      renderPuzzles();
      toast('저장했어요. 학생 화면에는 새로 시작할 때부터 반영돼요.');
    } else {
      const pw = $('pw1').value;
      if (pw.length < 4) throw new Error('편집 비밀번호를 4자 이상으로 정해 주세요.');
      if (pw !== $('pw2').value) throw new Error('비밀번호 확인이 맞지 않아요.');
      const r = await api('create', { ...cfg, password: pw });
      loaded = { code: r.code, password: pw };
      try {
        const c = await api('load', loaded);
        cfg.puzzles = c.puzzles.map((p) => ({ image: '', hint: '', options: ['', '', '', ''], ...p }));
        renderPuzzles();
      } catch { /* 무시 */ }
      $('pwNew').hidden = true; $('pwLoaded').hidden = false;
      $('codeBadge').hidden = false; $('codeBadge').textContent = r.code;
      setSaved(true);
      toast(`구성 코드 ${r.code} 가 만들어졌어요!`);
      loadBoard();
      startRoomWatch();
    }
    saveDraft();
    showResult(loaded.code);
    setPanel('save');
  } catch (err) {
    $('saveErr').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = '💾 저장하기';
  }
});

$('copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('studentLink').value); toast('주소를 복사했어요.'); } catch { $('studentLink').select(); }
});

// ---------------- 순위표 관리 ----------------
async function loadBoard() {
  if (!loaded) return;
  const box = $('boardBox');
  box.innerHTML = '<p class="muted" style="padding:12px">불러오는 중…</p>';
  try {
    const { entries } = await api('scores', loaded);
    const done = entries.filter((x) => x.finishedAt);
    const playing = entries.filter((x) => !x.finishedAt);
    const row = (s, i) => `<tr><td class="rk">${s.finishedAt ? i + 1 : '-'}</td><td class="nm">${esc(s.nickname)}</td>
      <td>${s.finishedAt ? formatTime(s.elapsedMs) : `<span class="dim">진행 중 · ${s.solved}/7</span>`}</td><td>${s.hints}</td><td class="dim">${s.wrong}</td>
      <td class="sc">${s.finishedAt ? formatTime(s.scoreMs) : ''}</td><td><button type="button" class="del" data-del="${s.id}">삭제</button></td></tr>`;
    box.innerHTML = entries.length
      ? `<table class="board"><thead><tr><th>순위</th><th>이름</th><th>시간</th><th>힌트</th><th>오답</th><th>기록</th><th></th></tr></thead>
         <tbody>${done.map(row).join('')}${playing.map((s) => row(s, 0)).join('')}</tbody></table>
         <p class="muted tiny" style="padding:8px 10px">탈출 ${done.length}명 · 진행 중 ${playing.length}명 · 기록 = 시간 + 힌트 1개당 1분</p>`
      : '<p class="muted" style="padding:12px">아직 기록이 없어요.</p>';
    box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('이 기록을 지울까요?')) return;
      try { await api('deleteScore', { ...loaded, session: b.dataset.del }); loadBoard(); } catch (err) { toast(err.message); }
    }));
  } catch (err) { box.innerHTML = `<p class="err" style="padding:12px">${esc(err.message)}</p>`; }
}
$('refreshBoard').addEventListener('click', loadBoard);
$('resetBoard').addEventListener('click', async () => {
  if (!confirm('이 구성의 모든 기록(진행 중 포함)을 지울까요? 되돌릴 수 없어요.')) return;
  try { await api('resetScores', loaded); toast('기록을 모두 지웠어요.'); loadBoard(); } catch (err) { toast(err.message); }
});

// ---------------- 수업 진행 (대기실) ----------------
let room = null, roomTimer = 0, clockTimer = 0;
function renderRoom() {
  if (!room) return;
  const st = room.status;
  const badge = $('roomBadge');
  badge.textContent = st === 'waiting' ? '⏳ 대기 중' : st === 'playing' ? '▶ 진행 중' : '■ 종료됨';
  badge.dataset.st = st;
  $('cntOnline').textContent = st === 'waiting' ? room.counts.online : room.counts.online;
  $('cntOnlineLabel').textContent = st === 'waiting' ? '명 대기 중' : '명 접속 중';
  $('cntPlaying').textContent = st === 'waiting' ? 0 : room.counts.playing;
  $('cntFinished').textContent = room.counts.finished;
  $('roomStart').disabled = st === 'playing';
  $('roomStart').textContent = st === 'ended' ? '▶ 다시 진행' : '▶ 시작';
  $('roomEnd').disabled = st !== 'playing';
  $('navRoomSt').textContent = st === 'waiting' ? `대기 ${room.counts.online}` : st === 'playing' ? `진행 ${room.counts.playing}` : '종료';
  updateClock();
}
function updateClock() {
  if (!room) return;
  const off = room.now - (room._fetched || Date.now());
  const t = room.status === 'playing' && room.startedAt ? Date.now() + off - room.startedAt
    : room.status === 'ended' && room.startedAt && room.endedAt ? room.endedAt - room.startedAt : null;
  $('roomClock').textContent = t == null ? '' : t < 0 ? `🚦 ${Math.ceil(-t / 1000)}초 뒤 출발` : `⏱ ${formatTime(t)}`;
}
async function refreshRoom(force) {
  if (!loaded) return;
  try {
    const showList = activePanel === 'room';
    const [r, sc] = await Promise.all([api('room', loaded), showList || force ? api('scores', loaded) : null]);
    room = r;
    room._fetched = Date.now();
    $('roomErr').textContent = '';
    renderRoom();
    if (sc) renderRoomList(sc.entries);
  } catch (e) { $('roomErr').textContent = e.message; }
}
function renderRoomList(entries) {
  const box = $('roomList');
  if (!entries.length) { box.innerHTML = '<p class="muted">아직 아무도 없어요. 학생들에게 코드를 알려 주세요.</p>'; return; }
  const order = (e) => (e.finishedAt ? 0 : e.online ? 1 : 2);
  const list = [...entries].sort((a, b) => order(a) - order(b) || (b.solved - a.solved));
  box.innerHTML = list.map((e) => {
    const st = e.finishedAt ? `<em class="tag done">탈출 ${formatTime(e.elapsedMs)}</em>`
      : room?.status === 'waiting' ? `<em class="tag wait">대기</em>`
        : `<em class="tag play">${e.solved}/7</em>`;
    return `<div class="rl-item ${e.online || e.finishedAt ? '' : 'off'}"><span class="dot-on"></span><b>${esc(e.nickname)}</b>${st}${e.wrong ? `<span class="muted tiny">오답 ${e.wrong}</span>` : ''}</div>`;
  }).join('');
}
function startRoomWatch() {
  clearInterval(roomTimer); clearInterval(clockTimer);
  refreshRoom();
  roomTimer = setInterval(() => { if (!document.hidden) refreshRoom(); }, 3000);
  clockTimer = setInterval(updateClock, 1000);
}
async function roomAction(action, confirmText) {
  if (confirmText && !confirm(confirmText)) return;
  try {
    room = await api(action, loaded);
    room._fetched = Date.now();
    renderRoom();
    if (action === 'roomStart') toast('시작! 학생 화면에서 5초 카운트다운 후 모두 함께 출발해요.');
    if (action === 'roomEnd') toast('게임을 종료했어요.');
    if (action === 'roomReset') { toast('새 판을 열었어요. 학생들이 다시 들어오면 대기 상태가 돼요.'); loadBoard(); }
  } catch (e) { $('roomErr').textContent = e.message; }
}
$('roomStart').addEventListener('click', () => roomAction('roomStart', room?.status === 'ended' ? '종료한 판을 다시 진행할까요?' : null));
$('roomEnd').addEventListener('click', () => roomAction('roomEnd', '게임을 종료할까요? 아직 탈출하지 못한 학생은 더 이상 문제를 풀 수 없어요.'));
$('roomReset').addEventListener('click', () => roomAction('roomReset', '새 판을 열까요? 지금 판은 끝나고, 학생들은 처음 화면에서 다시 들어와야 해요.'));


// 작성 중 초안 안내
try {
  const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  if (d && !d.code && d.cfg) $('draftInfo').textContent = `작성 중인 초안이 있어요 (${new Date(d.at).toLocaleString('ko-KR')})`;
} catch { /* 무시 */ }
