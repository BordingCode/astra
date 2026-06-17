// hud.js — all DOM UI for ASTRA: tabs, objectives, toasts, flash, how-it-works,
// the stage-clear lesson reveal, field notes, intro, menu.
import { STAGES, HOWTO, LESSON, TRUTH, QUIZ, FINALE_CHAIN } from '../data/stages.js';

const $ = (id) => document.getElementById(id);
let G = null;
let hooks = {};

export function init(game, h) {
  G = game; hooks = h || {};
  buildTabs(game);

  $('menuBtn').addEventListener('click', () => {
    $('journeyBtn').classList.toggle('hidden', !game.state.gameComplete);
    $('reviewBtn').classList.toggle('hidden', !hasReview(game));
    $('reviewBtn').textContent = dueCount(game) > 0 ? `✦ Review the laws (${dueCount(game)} due)` : '✦ Review the laws';
    $('menu').classList.remove('hidden');
  });
  $('journeyBtn').addEventListener('click', () => { $('menu').classList.add('hidden'); showFinale(game); });
  $('reviewBtn').addEventListener('click', () => { $('menu').classList.add('hidden'); showReview(game, () => updateReviewPrompt(game), false); });
  $('reviewPrompt').addEventListener('click', () => showReview(game, () => updateReviewPrompt(game), true));
  $('codexBtn').addEventListener('click', () => { renderCodex(game); $('codex').classList.remove('hidden'); });
  $('howtoBtn').addEventListener('click', () => openHowto(game.sceneName, true));
  $('restartBtn').addEventListener('click', () => { if (game.scene && game.scene.startChallenge) { game.scene.startChallenge(game); game.sfx.pickup(); } });
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

  const math = $('mathToggle');
  math.checked = game.state.showMath;
  math.addEventListener('change', () => { game.state.showMath = math.checked; game.persist(); });

  const motion = $('motionToggle');
  motion.checked = game.state.reduceMotion;
  motion.addEventListener('change', () => { game.state.reduceMotion = motion.checked; game.persist(); if (hooks.setReduceMotion) hooks.setReduceMotion(motion.checked); });
  if (hooks.setReduceMotion) hooks.setReduceMotion(game.state.reduceMotion);

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
  wrap.querySelectorAll('.toast').forEach(c => c.remove());   // only ever ONE toast — never stack
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
  // credit the player's reasoning, not just the sensation, when they nailed the key prediction
  $('clearTitle').textContent = game.state.predictedRight[stageId] ? 'You called it.' : 'You felt it.';
  $('clearBody').innerHTML =
    `<p class="clear-lesson">${LESSON[stageId] || ''}</p>` +
    (TRUTH[stageId] ? `<div class="clear-truth"><b>True story:</b> ${TRUTH[stageId]}</div>` : '');
  const ov = $('clear'); ov.classList.remove('hidden');
  const btn = $('clearNext');
  btn.onclick = () => { ov.classList.add('hidden'); onNext && onNext(); };
}

// ---------------- quick-check quiz (between stages) ----------------
// Conceptual multiple-choice — distractors are real misconceptions; answering either way shows
// a one-line "why". Powers BOTH the after-stage quiz and the spaced review.
const DAY = 86400000;
const REVIEW_DAYS = [1, 3, 7, 14, 30, 90];   // Leitner-style widening intervals (the spacing curve)

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// every concept the player has earned: one card per quiz question of each cleared stage
function reviewPool(game) {
  const out = [];
  STAGES.forEach(st => { if (game.state.stagesDone[st.id] && QUIZ[st.id]) QUIZ[st.id].forEach((q, qi) => out.push({ ...q, cardId: st.id + '#' + qi, stage: st.id })); });
  return out;
}
// ensure every earned card has a schedule entry (new ones first come due after the opening gap)
export function syncReview(game) {
  let changed = false;
  reviewPool(game).forEach(c => { if (!game.state.review[c.cardId]) { game.state.review[c.cardId] = { box: 0, due: Date.now() + DAY }; changed = true; } });
  if (changed) game.persist();
}
export function dueCount(game) { const now = Date.now(); return reviewPool(game).filter(c => (game.state.review[c.cardId] ? game.state.review[c.cardId].due : Infinity) <= now).length; }
export function hasReview(game) { return reviewPool(game).length > 0; }
// average mastery (0..1) of a stage's cards — drives the "memory" bar in Field notes
export function stageStrength(game, stageId) {
  const cards = (QUIZ[stageId] || []).map((q, qi) => game.state.review[stageId + '#' + qi]);
  if (!cards.length || cards.some(c => !c)) return 0;
  return cards.reduce((s, c) => s + c.box, 0) / cards.length / (REVIEW_DAYS.length - 1);
}
function gradeCard(game, cardId, correct) {
  const r = game.state.review[cardId] || { box: 0, due: 0 };
  r.box = correct ? Math.min(r.box + 1, REVIEW_DAYS.length - 1) : Math.max(0, r.box - 1);
  r.due = Date.now() + REVIEW_DAYS[r.box] * DAY;            // right → wait longer; wrong → come back sooner
  game.state.review[cardId] = r; game.persist();
}

// the shared MCQ runner
function runQuestions(game, items, onDone, { head, reward, review }) {
  const ov = $('quiz'); let i = 0;
  function renderQ() {
    const item = items[i];
    $('quizHead').textContent = head;
    $('quizProg').textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
    $('quizQ').textContent = item.q;
    const why = $('quizWhy'); why.classList.add('hidden'); why.classList.remove('ok');
    const next = $('quizNext'); next.classList.add('hidden');
    const box = $('quizOpts'); box.innerHTML = '';
    shuffle(item.options.slice()).forEach(opt => {            // shuffle order → recall the idea, not a position
      const b = document.createElement('button'); b.className = 'quiz-opt'; b.textContent = opt.t; b._opt = opt;
      b.addEventListener('click', () => answer(item, opt, box, why, next), { once: true });
      box.appendChild(b);
    });
    ov.classList.remove('hidden');
  }
  function answer(item, opt, box, why, next) {
    const correctOpt = item.options.find(o => o.correct);
    [...box.children].forEach(b => { b.disabled = true; const o = b._opt;
      if (o.correct) b.classList.add('correct'); else if (o === opt) b.classList.add('wrong'); else b.classList.add('dim'); });
    if (opt.correct) { game.award(reward); game.sfx.tick(); } else game.sfx.reject();
    if (review && item.cardId) gradeCard(game, item.cardId, !!opt.correct);
    why.innerHTML = (opt.correct ? '✓ ' : '') + (opt.why || (correctOpt && correctOpt.why) || item.explain || '');
    why.classList.toggle('ok', !!opt.correct); why.classList.remove('hidden');
    next.textContent = i < items.length - 1 ? 'Next ›' : (review ? 'Done ›' : 'Onward ›');
    next.classList.remove('hidden');
    next.onclick = () => { i++; if (i < items.length) renderQ(); else { ov.classList.add('hidden'); onDone && onDone(); } };
  }
  renderQ();
}

export function showQuiz(game, stageId, onDone) {
  const qs = QUIZ[stageId];
  if (!qs || !qs.length) { onDone && onDone(); return; }
  runQuestions(game, qs.map(q => ({ ...q })), onDone, { head: qs.length > 1 ? 'Quick check' : 'One quick check', reward: 6, review: false });
}

// Spaced, INTERLEAVED retrieval of earlier laws. onlyDue → just the cards that have come due;
// otherwise the most-due handful regardless (always-available practice). Mixing stages is the point.
export function showReview(game, onDone, onlyDue = false) {
  const now = Date.now();
  let pool = reviewPool(game).map(c => ({ ...c, _due: game.state.review[c.cardId] ? game.state.review[c.cardId].due : 0 }));
  if (onlyDue) pool = pool.filter(c => c._due <= now);
  pool.sort((a, b) => a._due - b._due);
  const items = shuffle(pool.slice(0, 6));                  // up to 6, mixed across stages
  if (!items.length) { onDone && onDone(); return; }
  runQuestions(game, items, () => { updateReviewPrompt(game); flash('Nice — those laws are a little sharper now.'); onDone && onDone(); }, { head: 'Review the laws', reward: 4, review: true });
}

let _revTimer = null;
export function updateReviewPrompt(game) {
  const n = dueCount(game), el = $('reviewPrompt'); if (!el) return;
  // a persistent dot on the menu button keeps it discoverable…
  $('menuBtn').classList.toggle('has-due', n > 0);
  // …while the floating nudge is transient so it never sits on the controls
  clearTimeout(_revTimer);
  if (n === 0) { el.classList.add('hidden'); return; }
  el.textContent = `✦ ${n} ${n === 1 ? 'law' : 'laws'} to review ›`;
  el.classList.remove('hidden');
  _revTimer = setTimeout(() => el.classList.add('hidden'), 6500);
}

// ---------------- field notes ----------------
export function renderCodex(game) {
  const body = $('codexBody'); body.innerHTML = '';
  STAGES.forEach(st => {
    const done = !!game.state.stagesDone[st.id];
    const c = document.createElement('div');
    c.className = 'note-card' + (done ? '' : ' locked');
    const str = Math.round(stageStrength(game, st.id) * 100);
    c.innerHTML = done
      ? `<h3>${st.ico} ${st.label}</h3><p>${LESSON[st.id]}</p><p class="truth">✦ ${TRUTH[st.id]}</p>
         <div class="note-strength" title="how well-practised this law is"><i style="width:${str}%"></i></div>`
      : `<h3>${st.ico} ${st.label}</h3><p class="dim">Locked — clear this stage to record what you learned.</p>`;
    body.appendChild(c);
  });
}

// ---------------- finale: the journey-complete recap ----------------
// The player RETRACES the whole story, one link at a time — assembling how each law led to the
// next, rather than reading a finished list. That retelling-by-doing is the deepest "I get it".
export function showFinale(game) {
  const body = $('finaleBody'); body.innerHTML = '';
  const stats = $('finaleStats'); stats.classList.add('hidden');
  const btn = $('finaleClose');
  let i = 0;
  function reveal() {
    const step = FINALE_CHAIN[i++];
    const d = document.createElement('div'); d.className = 'fin-law';
    d.innerHTML = `<span class="fin-ico">${step.ico}</span><span>${step.line}</span>`;
    body.appendChild(d); body.scrollTop = body.scrollHeight;
    if (i < FINALE_CHAIN.length) { btn.textContent = i === 1 ? 'Then… ›' : 'And then… ›'; }
    else {
      btn.textContent = 'Wander freely ›';
      stats.textContent = `${STAGES.length} laws · ${STAGES.length * 3} challenges · ✦ ${game.state.insight} insight`;
      stats.classList.remove('hidden');
      btn.onclick = () => $('finale').classList.add('hidden');
    }
  }
  btn.onclick = reveal;
  $('finale').classList.remove('hidden');
  reveal();                       // show the opening "a speck in the dark" line straight away
}

// ---------------- intro ----------------
export function showIntro(game, onBegin) {
  const intro = $('intro');
  const begin = () => { intro.classList.add('hidden'); onBegin && onBegin(); };
  $('beginBtn').addEventListener('click', begin);
  $('beginBtn').addEventListener('touchend', begin);
}
