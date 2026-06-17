// fall.js — Stage 2: gravity. Three challenges deepening the same truths.
//   1) FIRST   — heavy vs light land together (mass doesn't change the fall).
//   2) HALFWAY — predict where it is at HALF the fall-time; it's only a QUARTER down (acceleration).
//   3) HEIGHTS — two heights: the shorter drop lands first (time depends on distance, not mass).
import { drawMote, drawTrailDot, drawGround, label, hexA } from '../render/draw.js';
import { G } from '../physics/sim.js';

const HEAVY = '#ffb27a', LIGHT = '#6be4ff', GROUND = '#7a6bff';
const STROBE = 0.13, DROP_M = 24;

export class FallScene {
  constructor() {
    this.title = 'Fall'; this.id = 'fall';
    this.challenges = [
      { type: 'first',   prompt: 'Predict which mote lands first, then drop them' },
      { type: 'halfway', prompt: 'Mark where it will be at HALF the fall time' },
      { type: 'heights', prompt: 'Two heights — which one lands first?' },
    ];
  }

  enter(game) { this.layout(game); this.ci = Math.min(game.state.progress.fall || 0, this.challenges.length - 1); this.startChallenge(game); }
  resize(game) { this.layout(game); this.startChallenge(game); }

  layout(game) {
    const W = game.W, H = game.H;
    this.topY = H * 0.22; this.groundY = H * 0.80;
    this.pxPerM = (this.groundY - this.topY) / DROP_M;
    this.tLand = Math.sqrt(2 * DROP_M / G);
  }

  startChallenge(game) {
    const c = this.challenges[this.ci]; this.type = c.type;
    const W = game.W;
    this.phase = 'predict'; this.guess = null; this.dropT = 0;
    if (this.type === 'first') { this.hx = W * 0.36; this.lx = W * 0.64; this.buildChips(game, [['heavy', 'Heavy first'], ['same', 'Same time'], ['light', 'Light first']]); }
    else if (this.type === 'halfway') { this.cx = W * 0.5; this.markerY = (this.topY + this.groundY) / 2; this.tHalf = this.tLand / 2; this.dragging = false; this.buildChips(game, null, 'Drop ▼'); }
    else if (this.type === 'heights') {
      this.hx = W * 0.36; this.lx = W * 0.64;
      this.aDist = DROP_M; this.bDist = DROP_M * 0.5;                 // tall vs short drop
      this.bTopY = this.groundY - this.bDist * this.pxPerM;
      this.buildChips(game, [['tall', 'Tall first'], ['same', 'Same time'], ['short', 'Short first']]);
    }
    game.refreshGoals();
  }

  buildChips(game, labels, single) {
    const W = game.W, cy = game.H * 0.86, h = 40;
    if (labels && game.state.predictMode) {
      const w = Math.min(120, (W - 40) / 3 - 8); const total = w * 3 + 16; let x = (W - total) / 2;
      this.chips = labels.map(([id, label]) => { const c = { id, label, x, y: cy - h / 2, w, h }; x += w + 8; return c; });
    } else {
      const w = 160; this.chips = [{ id: single ? 'go' : 'go', label: single || 'Drop ▼', x: (W - w) / 2, y: cy - h / 2, w, h }];
    }
  }

  onDown(x, y, game) {
    if (this.phase === 'predict') {
      // chip?
      for (const c of this.chips) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.guess = (c.id === 'go') ? null : c.id; game.sfx.pickup(); this.phase = 'drop'; this.dropT = 0; game.refreshGoals(); return;
      }
      // halfway: drag the marker
      if (this.type === 'halfway') { this.dragging = true; this.markerY = Math.max(this.topY, Math.min(this.groundY, y)); }
    } else if (this.phase === 'land') { this.clearChallenge(game); }
  }
  onMove(x, y) { if (this.type === 'halfway' && this.dragging) this.markerY = Math.max(this.topY, Math.min(this.groundY, y)); }
  onUp() { this.dragging = false; }

  clearChallenge(game) {
    const last = this.ci >= this.challenges.length - 1;
    game.noteProgress('fall', this.ci + 1);
    if (last) { game.state.feltFall = true; game.persist(); game.completeStage('fall'); }
    else { game.award(6); this.ci++; import('../ui/hud.js').then(UI => UI.flash('Challenge cleared — next one.')); this.startChallenge(game); }
  }

  fallenPx(t) { return Math.min(DROP_M, 0.5 * G * t * t) * this.pxPerM; }

  update(dt, game) {
    if (this.phase !== 'drop') return;
    this.dropT += dt;
    const endT = this.type === 'halfway' ? this.tHalf : this.tLand;
    if (this.dropT >= endT) {
      this.dropT = endT; this.phase = 'land';
      game.state.feltFall = true; game.persist(); game.sfx.land();
      game.refreshGoals();
      import('../ui/hud.js').then(UI => this.reveal(game, UI));
    }
  }

  reveal(game, UI) {
    if (this.type === 'first') {
      game.gl.burst(this.hx, this.groundY, 20, { color: [1, 0.7, 0.48], speed: 150, size: 16, life: 0.7, alpha: 0.85 });
      game.gl.burst(this.lx, this.groundY, 16, { color: [0.42, 0.9, 1], speed: 150, size: 14, life: 0.7, alpha: 0.85 });
      if (this.guess === 'same' || this.guess === null) { if (this.guess === 'same') { game.award(12); game.state.predictedRight.fall = true; }
        UI.toast(game, { kind: 'win', title: this.guess === 'same' ? 'You called it — together' : 'They touched down together', sub: 'Mass doesn’t change the fall — gravity adds speed to every mass equally.' }); }
      else UI.toast(game, { kind: 'fail', title: `You called the ${this.guess} one`, sub: 'But they hit the ground at the same instant. The heavy one is pulled harder, yet it’s also harder to speed up. Those cancel exactly.' });
      UI.flash('Look at the trail: the gaps grow each beat — that growing gap IS acceleration.');
    } else if (this.type === 'halfway') {
      const actualY = this.topY + this.fallenPx(this.tHalf);
      const err = Math.abs(this.markerY - actualY);
      if (err < 26) { game.award(12); game.state.predictedRight.fall = true; UI.toast(game, { kind: 'win', title: 'Spot on', sub: 'At HALF the time it has fallen only a QUARTER of the way — because it starts slow and keeps speeding up.' }); }
      else UI.toast(game, { kind: 'fail', title: 'Lower than you’d think', sub: 'At half the fall-time it’s only a QUARTER of the way down — not halfway. It starts slow, then accelerates: distance grows with time SQUARED.' });
    } else if (this.type === 'heights') {
      // run the short drop to its (earlier) landing for the visual; both share accel
      game.gl.burst(this.lx, this.groundY, 16, { color: [0.42, 0.9, 1], speed: 150, size: 14, life: 0.7, alpha: 0.85 });
      if (this.guess === 'short' || this.guess === null) { if (this.guess === 'short') { game.award(12); game.state.predictedRight.fall = true; }
        UI.toast(game, { kind: 'win', title: this.guess === 'short' ? 'You called it — the short drop' : 'The short drop lands first', sub: 'Same acceleration for both — the one with less distance to fall simply gets there sooner.' }); }
      else UI.toast(game, { kind: 'fail', title: 'The shorter drop wins', sub: 'Both speed up identically; the time to land depends on the DISTANCE, not the mass. Less height → lands first.' });
    }
  }

  render(ctx, game) {
    const t = game.time;
    drawGround(ctx, game.W, this.groundY, GROUND);

    if (this.type === 'halfway') { this.renderHalfway(ctx, game, t); return; }

    // FIRST and HEIGHTS share the two-mote layout
    const heights = this.type === 'heights';
    const aTopY = this.topY, bTopY = heights ? this.bTopY : this.topY;
    const aEnd = this.groundY, bEnd = this.groundY;
    const aY = this.phase === 'predict' ? aTopY : Math.min(aEnd, aTopY + this.fallenPx(this.dropT));
    const bY = this.phase === 'predict' ? bTopY : Math.min(bEnd, bTopY + this.fallenPx(this.dropT));

    if (this.phase === 'drop' || this.phase === 'land') {
      for (let k = 1; ; k++) { const tk = k * STROBE; if (tk > this.dropT) break;
        if (aTopY + this.fallenPx(tk) <= aEnd) drawTrailDot(ctx, this.hx, aTopY + this.fallenPx(tk), 9, HEAVY, 0.5);
        if (bTopY + this.fallenPx(tk) <= bEnd) drawTrailDot(ctx, this.lx, bTopY + this.fallenPx(tk), 8, LIGHT, 0.5);
      }
    }
    const aR = heights ? 13 : 17, bR = heights ? 13 : 10;
    drawMote(ctx, this.hx, aY, aR, HEAVY, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    drawMote(ctx, this.lx, bY, bR, LIGHT, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    label(ctx, this.hx, aY - 30, heights ? 'tall drop' : 'heavy', { color: hexA(HEAVY, 0.85), size: 12 });
    label(ctx, this.lx, bY - (heights ? 30 : 24), heights ? 'short drop' : 'light', { color: hexA(LIGHT, 0.85), size: 12 });

    if (this.phase === 'predict') {
      label(ctx, game.W / 2, this.chips[0].y - 22, this.challenges[this.ci].prompt, { size: 14.5, color: '#fff' });
      for (const c of this.chips) this.drawChip(ctx, c);
    } else if (this.phase === 'land') label(ctx, game.W / 2, this.groundY + 40, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
  }

  renderHalfway(ctx, game, t) {
    const x = this.cx;
    // the marker the player sets
    ctx.save(); ctx.strokeStyle = hexA('#ffd66b', 0.9); ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(x - 70, this.markerY); ctx.lineTo(x + 70, this.markerY); ctx.stroke(); ctx.restore();
    label(ctx, x + 96, this.markerY, 'your guess', { color: 'rgba(255,214,107,.9)', size: 11.5, align: 'left' });

    if (this.phase === 'drop' || this.phase === 'land') {
      for (let k = 1; ; k++) { const tk = k * STROBE; if (tk > this.dropT) break; drawTrailDot(ctx, x, this.topY + this.fallenPx(tk), 9, LIGHT, 0.5); }
    }
    if (this.phase === 'land') {
      const actualY = this.topY + this.fallenPx(this.tHalf);
      ctx.save(); ctx.strokeStyle = hexA('#6be4ff', 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 70, actualY); ctx.lineTo(x + 70, actualY); ctx.stroke(); ctx.restore();
      label(ctx, x - 96, actualY, 'actual', { color: 'rgba(110,228,255,.95)', size: 11.5, align: 'right' });
      label(ctx, game.W / 2, this.groundY + 40, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
    }
    const my = this.phase === 'predict' ? this.topY : Math.min(this.groundY, this.topY + this.fallenPx(this.dropT));
    drawMote(ctx, x, my, 12, LIGHT, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });

    if (this.phase === 'predict') {
      label(ctx, game.W / 2, this.chips[0].y - 22, 'Drag the line to where it’ll be at half the time', { size: 14, color: '#fff' });
      for (const c of this.chips) this.drawChip(ctx, c);
    }
  }

  drawChip(ctx, c) {
    ctx.save(); const r = 13;
    ctx.beginPath();
    ctx.moveTo(c.x + r, c.y); ctx.arcTo(c.x + c.w, c.y, c.x + c.w, c.y + c.h, r);
    ctx.arcTo(c.x + c.w, c.y + c.h, c.x, c.y + c.h, r); ctx.arcTo(c.x, c.y + c.h, c.x, c.y, r);
    ctx.arcTo(c.x, c.y, c.x + c.w, c.y, r); ctx.closePath();
    ctx.fillStyle = 'rgba(110,228,255,.12)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(110,228,255,.5)'; ctx.stroke();
    ctx.fillStyle = '#eaf2ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 13.5px "Outfit", system-ui, sans-serif';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2); ctx.restore();
  }

  // live formula: v = g · t  (the falling speed grows because t grows; g is fixed)
  mathLayer(game) {
    if (this.phase !== 'drop' && this.phase !== 'land') return null;
    const t = this.dropT, v = G * t, e = Math.min(1, t / this.tLand) * 0.7;
    return { x: game.W / 2, y: game.H * 0.25, size: 23, cells: [
      { sym: 'v', val: v.toFixed(0), unit: 'm/s', color: '#6be4ff', emph: e },
      { op: '=' },
      { sym: 'g', val: '9.8', color: '#ffd66b' },
      { op: '·' },
      { sym: 't', val: t.toFixed(1), unit: 's', color: '#ffffff', emph: e },
    ] };
  }

  objectives(game) {
    const n = this.challenges.length;
    return {
      title: `Fall — challenge ${Math.min(this.ci + 1, n)} / ${n}`,
      goals: [
        { text: this.challenges[this.ci].prompt, done: this.phase === 'land' },
        { text: 'Feel that falling means speeding up', done: game.state.feltFall },
      ],
    };
  }
}
