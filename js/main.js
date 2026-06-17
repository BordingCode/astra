// main.js — bootstrap, shared game context, stage routing, the loop.
import { GLLayer } from './render/gl.js';
import { createInput } from './engine/input.js';
import { createLoop } from './engine/loop.js';
import * as Save from './engine/save.js';
import { unlock as audioUnlock, sfx, setEnabled as setAudioEnabled } from './engine/audio.js';
import { STAGES, NEBULA, LESSON } from './data/stages.js';
import * as UI from './ui/hud.js';
import { DriftScene } from './scenes/drift.js';
import { FallScene } from './scenes/fall.js';
import { ThrowScene } from './scenes/throw.js';
import { ForceScene } from './scenes/force.js';

const glCanvas = document.getElementById('gl');
const fxCanvas = document.getElementById('fx');
const ctx = fxCanvas.getContext('2d');
const stage = document.getElementById('stage');

const gl = new GLLayer(glCanvas);
const input = createInput(fxCanvas);

const game = {
  W: 0, H: 0, dpr: 1, time: 0,
  gl, ctx, input, sfx, STAGES,
  state: Save.load(),
  scene: null, sceneName: null, scenes: {},

  persist() { Save.save(this.state); },
  award(n) { this.state.insight += n; UI.setInsight(this.state.insight); this.persist(); },
  spend(n) { if (this.state.insight < n) return false; this.state.insight -= n; UI.setInsight(this.state.insight); this.persist(); return true; },

  // one-time coaching toast
  coachOnce(id, opts) {
    if (this.state.coachSeen[id]) return;
    this.state.coachSeen[id] = true; this.persist();
    UI.toast(this, opts);
  },

  celebrate(x, y, color) {
    gl.burst(x, y, 54, { color, speed: 200, size: 26, life: 1.1, alpha: 0.9 });
    gl.burst(x, y, 26, { color: [1, 1, 1], speed: 80, size: 16, life: 0.8, alpha: 0.85 });
  },

  // ---- navigation ----
  go(name) {
    if (this.sceneName === name || !this.scenes[name]) return;
    this._activate(name);
    UI.setActiveTab(name);
  },
  _activate(name) {
    if (this.scene && this.scene.exit) this.scene.exit(this);
    this.scene = this.scenes[name];
    this.sceneName = name;
    this.state.scene = name;
    const neb = NEBULA[name]; if (neb) gl.setNebula(neb);
    if (this.scene.enter) this.scene.enter(this);
    UI.setSceneTitle(this.scene.title || name);
    UI.refreshGoals(this);
    UI.maybeHowto(this, name);
    this.persist();
  },

  // ---- gates ----
  stageUnlocked(id) {
    if (id === 'drift') return true;
    if (id === 'fall') return !!this.state.stagesDone.drift;
    if (id === 'throw') return !!this.state.stagesDone.fall;
    if (id === 'force') return !!this.state.stagesDone.throw;
    return false;
  },
  checkGates() { UI.refreshGates(this); },

  // ---- per-challenge progress within a stage ----
  // A scene calls this when it clears one of its several challenges. The big "you felt it"
  // lesson screen only fires once the LAST challenge of a stage is cleared.
  noteProgress(id, cleared) {
    this.state.progress[id] = Math.max(this.state.progress[id] || 0, cleared);
    this.persist();
  },

  // ---- finishing a stage ----
  completeStage(id, score) {
    const firstTime = !this.state.stagesDone[id];
    this.state.stagesDone[id] = true;
    if (score != null && (this.state.best[id] == null || score > this.state.best[id])) this.state.best[id] = score;
    if (firstTime) this.award(20);
    this.persist();
    this.checkGates();
    sfx.win();
    // show the lesson + the true fact, then auto-advance to the next stage if there is one
    const idx = STAGES.findIndex(s => s.id === id);
    const next = STAGES[idx + 1];
    UI.showClear(this, id, () => { if (next && this.stageUnlocked(next.id)) this.go(next.id); });
  },

  refreshGoals() { UI.refreshGoals(this); },
};

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  game.W = w; game.H = h; game.dpr = dpr;
  fxCanvas.width = Math.floor(w * dpr); fxCanvas.height = Math.floor(h * dpr);
  fxCanvas.style.width = w + 'px'; fxCanvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gl.resize(w, h, dpr);
  if (game.scene && game.scene.resize) game.scene.resize(game);
}
window.addEventListener('resize', resize);

input.on('down', (s) => { audioUnlock(); if (game.scene && game.scene.onDown) game.scene.onDown(s.x, s.y, game); });
input.on('move', (s) => { if (game.scene && game.scene.onMove) game.scene.onMove(s.x, s.y, game); });
input.on('up',   (s) => { if (game.scene && game.scene.onUp) game.scene.onUp(s.x, s.y, game); });

const loop = createLoop({
  update(dt) {
    game.time += dt;
    gl.update(dt);
    if (game.scene && game.scene.update) game.scene.update(dt, game);
  },
  render() {
    gl.render(game.time);
    ctx.clearRect(0, 0, game.W, game.H);
    if (game.scene && game.scene.render) game.scene.render(ctx, game);
    input.endFrame();
  },
});

function boot() {
  game.scenes.drift = new DriftScene();
  game.scenes.fall = new FallScene();
  game.scenes.throw = new ThrowScene();
  game.scenes.force = new ForceScene();
  UI.init(game, { setAudioEnabled, resetSave: () => { Save.resetSave(); location.reload(); } });
  resize();
  game.checkGates();
  const saved = game.state.scene;
  game._activate(saved && game.scenes[saved] && game.stageUnlocked(saved) ? saved : 'drift');
  UI.setInsight(game.state.insight);
  loop.start();
  if (!game.state.introSeen) UI.showIntro(game, () => { game.state.introSeen = true; game.persist(); });
}

boot();
window.__astra = game;
