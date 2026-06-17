// hud.js — all DOM UI for ASTRA: tabs, objectives, toasts, flash, how-it-works,
// the stage-clear lesson reveal, field notes, intro, menu.
import { STAGES, HOWTO, LESSON, TRUTH } from '../data/stages.js';

const $ = (id) => document.getElementById(id);
let G = null;
let hooks = {};

export function init(game, h) {
  G = game; hooks = h || {};
  buildTabs(game);

  $('menuBtn').addEventListener('click', () => $('menu').classList.remove('hidden'));
  $('codexBtn').addEventListener('click', () => { renderCodex(game); $('codex').classList.remove('hidden'); });
  $('howtoBtn').addEventListener('click', () => openHowto(game.sceneName, true));
  $('objToggle').addEventListener('click', () => {
    const o = $('objectives'); o.classList.toggle('collapsed');
    $('objToggle').textContent = o.classList.contains('collapsed') ? '+' : '–';
  });
  document.querySelectorAll('[data-close]').forEach(b =>
    b.addEventListener('click', () => b.closest('.overlay').classList.add('hidden')));
  // tap the dim backdrop to close a sheet
  document.querySelectorAll('.overlay').forEach(o =>
    o.addEventListener('click', (e) => { if (e.target === o && o.id !== 'intro' && o.id !== 'clear') o.classList.add('hidden'); }));

  const sound = $('soundToggle');
  sound.checked = game.state.soundOn;
  sound.addEventListener('change', () => { game.state.soundOn = sound.checked; game.persist(); hooks.setAudioEnabled && hooks.setAudioEnabled(sound.checked); });
  hooks.setAudioEnabled && hooks.setAudioEnabled(game.state.soundOn);

  const pred = $('predictToggle');
  pred.checked = game.state.predictMode;
  pred.addEventListener('change', () => { game.state.predictMode = pred.checked; game.persist(); });

  $('resetBtn').addEventListener('click', () => { if (confirm('Reset all progress?')) hooks.resetSave && hooks.resetSave(); });

  $('howtoOk').addEventListener('click', () => $('howto').classList.add('hidden'));
}

// ---------------- tabs ----------------
function buildTabs(game) {
  const nav = $('tabs'); nav.innerHTML = '';
  STAGES.forEach(st => {
    const b = document.createElement('button');
    b.className = 'tab'; b.dataset.tab = st.id;
    b.innerHTML = `<span class="t-ico">${st.ico}</span><span class="t-lab">${st.label}</span>`;
    b.addEventListener('click', () => {
      if (!game.stageUnlocked(st.id)) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400);
        flash('Locked — clear the earlier stages first'); game.sfx.reject(); return; }
      game.go(st.id);
    });
    nav.appendChild(b);
  });
}
export function setActiveTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
}
export function refreshGates(game) {
  STAGES.forEach(st => {
    const b = document.querySelector(`[data-tab="${st.id}"]`);
    if (b) b.classList.toggle('locked', !game.stageUnlocked(st.id));
  });
}
export function setSceneTitle(t) { $('sceneTitle').textContent = t || ''; }
export function setInsight(n) { $('insightVal').textContent = n; }

// ---------------- objectives ----------------
// Each scene exposes objectives() -> { title, goals:[{text, sub?, done?}] }
export function refreshGoals(game) {
  const scene = game.scene;
  if (!scene || !scene.objectives) { $('objList').innerHTML = ''; return; }
  const { title, goals } = scene.objectives(game);
  $('objTitle').textContent = title || 'Objective';
  const list = $('objList'); list.innerHTML = '';
  (goals || []).forEach(g => {
    const d = document.createElement('div');
    d.className = 'goal' + (g.done ? ' done' : '');
    d.innerHTML = `<span class="dot"></span><span>${g.text}${g.sub ? `<br/><span class="g-sub">${g.sub}</span>` : ''}</span>`;
    list.appendChild(d);
  });
}

// ---------------- toasts ----------------
// A glance, not a wall of text. The coaching kinds (fail/hint) stay long enough to
// READ and think — dwell scales with word count — and say so. (Lifted from the fix that
// made Primordia's Lab hints readable.)
const TGLYPH = { win: '✦', fail: '⚐', hint: '✦', info: '◈' };
const TCOL = { win: '#ffd66b', fail: '#ff9a8a', hint: '#ffd66b', info: '#6be4ff' };
export function toast(game, { kind = 'info', title, sub, fact, glyph }) {
  const wrap = $('toasts');
  const card = document.createElement('div'); card.className = 'toast ' + kind;
  card.style.setProperty('--c', TCOL[kind] || '#6be4ff');
  const coaching = kind === 'fail' || kind === 'hint';
  card.innerHTML = `<div class="t-glyph">${glyph || TGLYPH[kind] || '◈'}</div><div class="t-body">
    <div class="t-title">${title}</div>${sub ? `<div class="t-sub">${sub}</div>` : ''}
    ${fact ? `<div class="t-fact">${fact}</div>` : ''}${coaching ? `<div class="t-dismiss">tap to dismiss</div>` : ''}</div>`;
  wrap.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  const kill = () => { card.classList.remove('show'); setTimeout(() => card.remove(), 400); };
  card.addEventListener('click', kill);
  const words = `${title || ''} ${sub || ''} ${fact || ''}`.trim().split(/\s+/).length;
  const dwell = coaching
    ? Math.min(16000, Math.max(7000, 2200 + words * 600))
    : Math.min(8000, Math.max(4000, 1500 + words * 380));
  setTimeout(kill, dwell);
}

// ---------------- flash banner ----------------
export function flash(msg) {
  let f = $('flash');
  if (!f) { f = document.createElement('div'); f.id = 'flash'; $('stage').appendChild(f); }
  f.textContent = msg; f.classList.add('show');
  const words = String(msg).trim().split(/\s+/).length;
  const dwell = Math.min(13000, Math.max(3000, 1600 + words * 480));
  clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove('show'), dwell);
}

// ---------------- how-it-works ----------------
export function maybeHowto(game, name) {
  if (game.state.howtoSeen[name]) return;
  game.state.howtoSeen[name] = true; game.persist();
  openHowto(name, false);
}
export function openHowto(name, force) {
  const h = HOWTO[name]; if (!h) return;
  $('howtoTitle').textContent = h.title;
  $('howtoBody').innerHTML = h.body.map(p => `<p>${p}</p>`).join('') +
    (h.tip ? `<div class="howto-tip">✦ ${h.tip}</div>` : '');
  $('howto').classList.remove('hidden');
}

// ---------------- stage clear: the lesson + a true fact ----------------
export function showClear(game, stageId, onNext) {
  $('clearTitle').textContent = 'You felt it.';
  $('clearBody').innerHTML =
    `<p class="clear-lesson">${LESSON[stageId] || ''}</p>` +
    (TRUTH[stageId] ? `<div class="clear-truth"><b>True story:</b> ${TRUTH[stageId]}</div>` : '');
  const ov = $('clear'); ov.classList.remove('hidden');
  const btn = $('clearNext');
  btn.onclick = () => { ov.classList.add('hidden'); onNext && onNext(); };
}

// ---------------- field notes ----------------
export function renderCodex(game) {
  const body = $('codexBody'); body.innerHTML = '';
  STAGES.forEach(st => {
    const done = !!game.state.stagesDone[st.id];
    const c = document.createElement('div');
    c.className = 'note-card' + (done ? '' : ' locked');
    c.innerHTML = done
      ? `<h3>${st.ico} ${st.label}</h3><p>${LESSON[st.id]}</p><p class="truth">✦ ${TRUTH[st.id]}</p>`
      : `<h3>${st.ico} ${st.label}</h3><p class="dim">Locked — clear this stage to record what you learned.</p>`;
    body.appendChild(c);
  });
}

// ---------------- intro ----------------
export function showIntro(game, onBegin) {
  const intro = $('intro');
  const begin = () => { intro.classList.add('hidden'); onBegin && onBegin(); };
  $('beginBtn').addEventListener('click', begin);
  $('beginBtn').addEventListener('touchend', begin);
}
