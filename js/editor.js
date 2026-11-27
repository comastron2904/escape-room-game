// 교사용 편집 모드
import { STORIES, STORY_IDS } from './game/stories.js';
import { SPOTS, DIRS, PUZZLE_COUNT, DEMO_CONFIG } from './game/content.js';
import { validatePuzzles, normalizeDirection } from './game/answer.js';
import { formatTime } from './game/state.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DRAFT_KEY = 'hanok.editor.draft';

const blankPuzzle = () => ({ q: '', image: '', type: 'number', answer: '', hint: '' });
let cfg = { title: '', story: 'seolhwa', puzzles: Array.from({ length: PUZZLE_COUNT }, blankPuzzle) };
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
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ cfg, code: loaded?.code || null, at: Date.now() })); } catch { /* 무시 */ }
}

// ---------------- 이야기 ----------------
function renderStories() {
  $('stories').innerHTML = STORY_IDS.map((id) => {
    const s = STORIES[id];
    return `<button type="button" class="story-card" role="radio" aria-checked="${cfg.story === id}" data-story="${id}">
      <span class="hj">${esc(s.hanja)}</span><h3>${esc(s.name)}</h3><p>${esc(s.synopsis)}</p><div class="tr">보물: ${esc(s.treasure)}</div></button>`;
  }).join('');
  $('stories').querySelectorAll('[data-story]').forEach((b) => b.addEventListener('click', () => {
    cfg.story = b.dataset.story;
    renderStories();
    saveDraft();
  }));
  renderStoryboard();
}
function renderStoryboard() {
  const s = STORIES[cfg.story];
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
  $('puzzles').innerHTML = cfg.puzzles.map((p, i) => `
    <div class="pz" data-i="${i}">
      <div class="pz-head"><span class="pn">${i + 1}</span><div><b>${esc(SPOTS[i].name)}</b><div class="loc">${esc(SPOTS[i].where)}</div></div>${NOTES[i] ? `<span class="pz-note">${esc(NOTES[i])}</span>` : ''}</div>
      <label class="lbl">문제</label>
      <textarea data-f="q" maxlength="1500" placeholder="예: 3 × 4 + 5 의 값은?">${esc(p.q)}</textarea>
      <div class="pz-grid">
        <div>
          <label class="lbl">정답 종류</label>
          <div class="type-tog"><button type="button" data-type="number" aria-pressed="${p.type !== 'direction'}">🔢 숫자</button><button type="button" data-type="direction" aria-pressed="${p.type === 'direction'}">🧭 방향</button></div>
          <label class="lbl">정답</label>
          <div data-answer></div>
        </div>
        <div>
          <label class="lbl">그림 주소 (선택, https://…)</label>
          <input type="url" data-f="image" maxlength="500" value="${esc(p.image || '')}" placeholder="https://example.com/그림.png" />
          ${p.image ? `<img class="img-prev" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer" onerror="this.hidden=true" />` : ''}
          <label class="lbl">힌트 (선택 · 학생이 보면 +1분)</label>
          <input type="text" data-f="hint" maxlength="500" value="${esc(p.hint || '')}" placeholder="예: 곱셈을 먼저 계산해요" />
        </div>
      </div>
    </div>`).join('');
  $('puzzles').querySelectorAll('.pz').forEach((el) => {
    const i = +el.dataset.i;
    el.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('input', () => {
      cfg.puzzles[i][inp.dataset.f] = inp.value;
      saveDraft();
    }));
    el.querySelector('[data-f="image"]').addEventListener('change', () => renderPuzzles());
    el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      if (cfg.puzzles[i].type === b.dataset.type) return;
      cfg.puzzles[i].type = b.dataset.type;
      cfg.puzzles[i].answer = '';
      saveDraft();
      renderPuzzles();
    }));
    renderAnswer(el.querySelector('[data-answer]'), i);
  });
}
function renderAnswer(box, i) {
  const p = cfg.puzzles[i];
  if (p.type !== 'direction') {
    box.innerHTML = `<input type="text" inputmode="decimal" maxlength="12" value="${esc(p.answer)}" placeholder="예: 17 · 3.5 · 3/4 · -2" />
      <p class="muted tiny">정수, 소수, 분수(3/4), 음수 가능. 0.50 과 0.5 는 같은 답으로 봐요.</p>`;
    box.querySelector('input').addEventListener('input', (e) => { p.answer = e.target.value; saveDraft(); });
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

// ---------------- 시작 ----------------
function openEditor() {
  $('entry').hidden = true;
  $('editor').hidden = false;
  $('title').value = cfg.title;
  $('pwNew').hidden = !!loaded;
  $('pwLoaded').hidden = !loaded;
  $('codeBadge').hidden = !loaded;
  if (loaded) $('codeBadge').textContent = loaded.code;
  $('boardSec').hidden = !loaded;
  renderStories();
  renderPuzzles();
  if (loaded) { showResult(loaded.code); loadBoard(); }
  window.scrollTo(0, 0);
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
    cfg = { title: '', story: 'seolhwa', puzzles: DEMO_CONFIG.puzzles.map((p) => ({ image: '', ...p })) };
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
    cfg = { title: c.title, story: c.story, puzzles: c.puzzles.map((p) => ({ image: '', hint: '', ...p })) };
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
  if (errs.length) { $('saveErr').textContent = `미리 해보기 전에 고쳐 주세요:\n${errs.join('\n')}`; return; }
  $('saveErr').textContent = '';
  localStorage.setItem('hanok.preview', JSON.stringify({ code: 'PREVIEW', title: cfg.title, story: cfg.story, puzzles: cfg.puzzles }));
  window.open('./?preview=1', '_blank');
});

$('editor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errs = collect();
  $('saveErr').textContent = '';
  if (errs.length) { $('saveErr').textContent = errs.join('\n'); return; }
  const btn = $('saveBtn');
  btn.disabled = true; btn.textContent = '저장하는 중…';
  try {
    if (loaded) {
      await api('update', { code: loaded.code, password: loaded.password, ...cfg });
      toast('저장했어요. 학생 화면에는 새로 시작할 때부터 반영돼요.');
    } else {
      const pw = $('pw1').value;
      if (pw.length < 4) throw new Error('편집 비밀번호를 4자 이상으로 정해 주세요.');
      if (pw !== $('pw2').value) throw new Error('비밀번호 확인이 맞지 않아요.');
      const r = await api('create', { ...cfg, password: pw });
      loaded = { code: r.code, password: pw };
      $('pwNew').hidden = true; $('pwLoaded').hidden = false;
      $('codeBadge').hidden = false; $('codeBadge').textContent = r.code;
      $('boardSec').hidden = false;
      toast(`구성 코드 ${r.code} 가 만들어졌어요!`);
      loadBoard();
    }
    saveDraft();
    showResult(loaded.code);
    $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
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

// 작성 중 초안 안내
try {
  const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  if (d && !d.code && d.cfg) $('draftInfo').textContent = `작성 중인 초안이 있어요 (${new Date(d.at).toLocaleString('ko-KR')})`;
} catch { /* 무시 */ }
