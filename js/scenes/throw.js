// throw.js — Stage 3: projectile motion. Three challenges.
//   1) TARGET   — hit a mark: a steady sideways speed + accelerating fall = a parabola.
//   2) WALL     — arc OVER a wall onto the target (the height of the arc is yours to choose).
//   3) DROPFIRE — drop one and fire one at the same instant: they land TOGETHER (axes are independent).
import { drawMote, drawTrailDot, drawGround, drawTarget, drawArrow, label, hexA } from '../render/draw.js';
import { G, projectile } from '../physics/sim.js';

const COL = '#aef0ff', GROUND = '#5fd6a0', TGT = '#ffd66b', WALLC = '#ff9a8a';
const STROBE = 0.12, MAX_SPEED = 30;

export class ThrowScene {
  constructor() {
    this.title = 'Throw'; this.id = 'throw';
    this.challenges = [
      { type: 'target',   prompt: 'Land a mote on the glowing target' },
      { type: 'wall',     prompt: 'Arc OVER the wall onto the target' },
      { type: 'dropfire', prompt: 'Drop one, fire one — which lands first?' },
    ];
  }

  enter(game) { this.layout(game); this.ci = Math.min(game.state.progress.throw || 0, this.challenges.length - 1); this.startChallenge(game); }
  resize(game) { this.layout(game); this.startChallenge(game); }

  layout(game) {
    const W = game.W, H = game.H;
    this.groundY = H * 0.80; this.padX = W * 0.13;
    this.pxPerM = (W * 0.74) / 70; this.tolPx = 24;
  }

  startChallenge(game) {
    const c = this.challenges[this.ci]; this.type = c.type;
    const W = game.W;
    if (this.type === 'target') { this.phase = 'aim'; this.targetX = this.padX + 46 * this.pxPerM; this.wall = null; this.resetAim(); }
    else if (this.type === 'wall') {
      this.phase = 'aim'; this.targetX = this.padX + 58 * this.pxPerM;
      this.wall = { x: this.padX + 30 * this.pxPerM, top: this.groundY - 22 * this.pxPerM }; // 22 m tall
      this.resetAim();
    } else if (this.type === 'dropfire') {
      this.phase = 'predict'; this.guess = null; this.dfT = 0;
      this.dfTop = game.H * 0.26; this.dfX = W * 0.22;
      this.dfg = 355; this.dfv = (W * 0.58) / 1.6;            // px-gravity & sideways speed (land together by design)
      this.dfEnd = Math.sqrt(2 * (this.groundY - this.dfTop) / this.dfg);
      this.buildChips(game);
    }
    game.refreshGoals();
  }

  resetAim() { this.aiming = false; this.aim = null; this.shot = null; this.flyT = 0; this.trail = []; this.blocked = false; }

  buildChips(game) {
    const W = game.W, cy = game.H * 0.90, h = 40;
    if (game.state.predictMode) {
      const labels = [['drop', 'Dropped first'], ['same', 'Same time'], ['fire', 'Fired first']];
      const w = Math.min(120, (W - 40) / 3 - 8); const total = w * 3 + 16; let x = (W - total) / 2;
      this.chips = labels.map(([id, label]) => { const c = { id, label, x, y: cy - h / 2, w, h }; x += w + 8; return c; });
    } else { const w = 160; this.chips = [{ id: 'go', label: 'Release ▶', x: (W - w) / 2, y: cy - h / 2, w, h }]; }
  }

  sx(xM) { return this.padX + xM * this.pxPerM; }
  sy(yM) { return this.groundY - yM * this.pxPerM; }

  aimShot() {
    if (!this.aim) return null;
    const dx = this.aim.x - this.padX, dy = this.aim.y - this.groundY, dist = Math.hypot(dx, dy);
    if (dist < 12) return null;
    let deg = Math.atan2(-dy, dx) * 180 / Math.PI; deg = Math.max(8, Math.min(82, deg));
    const speed = Math.min(MAX_SPEED, Math.max(6, dist / 7));
    return { deg, speed, proj: projectile({ x: 0, y: 0 }, speed, deg, G) };
  }

  clearChallenge(game) {
    const last = this.ci >= this.challenges.length - 1;
    game.noteProgress('throw', this.ci + 1);
    if (last) { game.completeStage('throw'); }
    else { game.award(6); this.ci++; import('../ui/hud.js').then(UI => UI.flash('Challenge cleared — next one.')); this.startChallenge(game); }
  }

  onDown(x, y, game) {
    if (this.type === 'dropfire') {
      if (this.phase === 'predict') { for (const c of this.chips) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.guess = c.id === 'go' ? null : c.id; game.sfx.pickup(); this.phase = 'drop'; this.dfT = 0; game.refreshGoals(); return; } }
      else if (this.phase === 'land') this.clearChallenge(game);
      return;
    }
    if (this.phase === 'aim') {
      this.aiming = true; this.aim = { x, y };
      game.coachOnce('throw_aim', { kind: 'hint', title: 'Aim the launch', sub: 'Drag to set the angle and the speed, then release. Higher and harder flies farther.' });
    }
  }
  onMove(x, y) { if (this.aiming) this.aim = { x, y }; }
  onUp(x, y, game) {
    if (!this.aiming) return; this.aiming = false;
    const s = this.aimShot(); if (!s) { this.aim = null; return; }
    this.shot = s; this.phase = 'fly'; this.flyT = 0; this.trail = []; this.blocked = false;
    this.tLand = s.proj.flightTimeFlat; game.sfx.launch();
  }

  update(dt, game) {
    if (this.type === 'dropfire') { this.updateDropfire(dt, game); return; }
    if (this.phase !== 'fly') return;
    this.flyT += dt;
    const p = this.shot.proj.pos(this.flyT);
    const X = this.sx(p.x), Y = this.sy(p.y);
    // wall collision
    if (this.wall && !this.blocked && X >= this.wall.x) {
      if (Y > this.wall.top) {            // below the wall's top edge → blocked
        this.blocked = true; game.sfx.reject();
        game.gl.burst(this.wall.x, Y, 14, { color: [1, 0.6, 0.5], speed: 110, size: 12, life: 0.5, alpha: 0.8 });
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'Blocked by the wall', sub: 'Your arc was too low. A steeper angle (or more speed) lifts the peak higher to clear it.' }));
        this.phase = 'aim'; this.shot = null; game.refreshGoals(); return;
      } else this.blocked = 'cleared';
    }
    if (this.flyT >= this.tLand) {
      const land = this.shot.proj.pos(this.tLand); const landX = this.sx(land.x); const dxPx = landX - this.targetX;
      game.gl.burst(landX, this.groundY, 16, { color: [0.68, 0.94, 1], speed: 130, size: 14, life: 0.6, alpha: 0.8 });
      if (Math.abs(dxPx) < this.tolPx) {
        game.sfx.land(); game.celebrate(this.targetX, this.groundY, [1, 0.84, 0.42]);
        const near45 = Math.abs(this.shot.deg - 45) < 7;
        import('../ui/hud.js').then(UI => {
          UI.toast(game, { kind: 'win', title: 'Direct hit', sub: this.type === 'wall'
            ? 'Over the wall and onto the mark — you chose an arc high enough to clear it and long enough to reach.'
            : 'A parabola: your sideways speed never changed, only the falling sped up. Together they make the curve.' });
          if (near45 && this.type === 'target') UI.flash('Notice: around 45° carries the farthest — the best trade of “out” against “up”.');
        });
        this.phase = 'done'; this.clearChallenge(game);
      } else {
        const over = dxPx > 0; game.sfx.reject();
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: over ? 'Overshot' : 'Fell short',
          sub: over ? 'Too much range — ease off the speed, or raise the angle past 45° to drop it shorter.' : 'Not enough range — more speed, or aim nearer 45° for the farthest carry.' }));
        this.phase = 'aim'; this.shot = null; game.refreshGoals();
      }
      return;
    }
    if (this.trail.length === 0 || this.flyT - this.trail[this.trail.length - 1].t >= STROBE) this.trail.push({ x: X, y: Y, t: this.flyT });
  }

  updateDropfire(dt, game) {
    if (this.phase !== 'drop') return;
    this.dfT += dt;
    if (this.dfT >= this.dfEnd) {
      this.dfT = this.dfEnd; this.phase = 'land'; game.sfx.land();
      game.gl.burst(this.dfX, this.groundY, 14, { color: [0.68, 0.94, 1], speed: 120, size: 13, life: 0.6, alpha: 0.8 });
      game.gl.burst(this.dfX + this.dfv * this.dfEnd, this.groundY, 14, { color: [0.68, 0.94, 1], speed: 120, size: 13, life: 0.6, alpha: 0.8 });
      import('../ui/hud.js').then(UI => {
        if (this.guess === 'same' || this.guess === null) { if (this.guess === 'same') game.award(8);
          UI.toast(game, { kind: 'win', title: 'They land together', sub: 'Sideways motion doesn’t change the falling. Each one’s drop is identical — so they touch down at the same instant.' }); }
        else UI.toast(game, { kind: 'fail', title: 'Actually — together', sub: 'The fired one travels far sideways, yet it falls at exactly the same rate as the dropped one. Up-down and side-to-side are independent.' });
        UI.flash('Drop and fire from the same height — they hit the ground at the very same moment.');
      });
    }
  }

  render(ctx, game) {
    const t = game.time;
    if (this.type === 'dropfire') { this.renderDropfire(ctx, game, t); return; }
    drawGround(ctx, game.W, this.groundY, GROUND);
    drawTarget(ctx, this.targetX, this.groundY, 16, TGT, { time: t });
    if (this.wall) { ctx.save(); ctx.fillStyle = hexA(WALLC, 0.5); ctx.strokeStyle = hexA(WALLC, 0.9); ctx.lineWidth = 2;
      ctx.fillRect(this.wall.x - 5, this.wall.top, 10, this.groundY - this.wall.top);
      ctx.strokeRect(this.wall.x - 5, this.wall.top, 10, this.groundY - this.wall.top); ctx.restore(); }
    ctx.save(); ctx.fillStyle = hexA('#aef0ff', 0.85); ctx.fillRect(this.padX - 16, this.groundY - 6, 32, 8); ctx.restore();

    if (this.phase === 'aim' && this.aiming) {
      const s = this.aimShot();
      if (s) {
        const tEnd = s.proj.flightTimeFlat;
        ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = COL; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const p = s.proj.pos(tEnd * i / 40); const X = this.sx(p.x), Y = this.sy(p.y); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
        ctx.stroke(); ctx.restore();
        const vx = Math.cos(s.deg * Math.PI / 180), vy = Math.sin(s.deg * Math.PI / 180), mag = 20 + s.speed * 2.2;
        drawArrow(ctx, this.padX, this.groundY, this.padX + vx * mag, this.groundY - vy * mag, '#fff', { width: 3, head: 11 });
        label(ctx, this.padX + 4, this.groundY - mag - 22, `${Math.round(s.deg)}°  ·  ${s.speed.toFixed(0)} m/s`, { color: '#fff', size: 13, align: 'left' });
      }
    }
    for (const d of this.trail) drawTrailDot(ctx, d.x, d.y, 6, COL, 0.55);
    if (this.phase === 'fly') { const p = this.shot.proj.pos(this.flyT); drawMote(ctx, this.sx(p.x), this.sy(p.y), 11, COL, { time: t }); }
    else if (this.phase === 'aim' && !this.aiming) { drawMote(ctx, this.padX, this.groundY - 12, 11, COL, { time: t, pulse: 1 });
      label(ctx, this.padX, this.groundY - 40, 'drag to aim ⤴', { color: hexA(COL, 0.8), size: 12.5 }); }
  }

  renderDropfire(ctx, game, t) {
    drawGround(ctx, game.W, this.groundY, GROUND);
    // platform
    ctx.save(); ctx.fillStyle = hexA('#aef0ff', 0.7); ctx.fillRect(this.dfX - 22, this.dfTop + 12, 44, 7); ctx.restore();
    const yNow = this.phase === 'predict' ? this.dfTop : Math.min(this.groundY, this.dfTop + 0.5 * this.dfg * this.dfT * this.dfT);
    const bx = this.dfX + (this.phase === 'predict' ? 0 : this.dfv * this.dfT);
    if (this.phase !== 'predict') {
      for (let k = 1; ; k++) { const tk = k * STROBE; if (tk > this.dfT) break;
        const yk = this.dfTop + 0.5 * this.dfg * tk * tk; if (yk > this.groundY) break;
        drawTrailDot(ctx, this.dfX, yk, 8, '#ffb27a', 0.5);            // dropped
        drawTrailDot(ctx, this.dfX + this.dfv * tk, yk, 8, COL, 0.5);  // fired (same height each beat)
      }
    }
    drawMote(ctx, this.dfX, yNow, 12, '#ffb27a', { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    drawMote(ctx, bx, yNow, 12, COL, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    label(ctx, this.dfX, yNow - 28, 'dropped', { color: hexA('#ffb27a', 0.85), size: 11.5 });
    label(ctx, bx, yNow - 28, 'fired →', { color: hexA(COL, 0.85), size: 11.5 });
    if (this.phase === 'predict') { label(ctx, game.W / 2, this.chips[0].y - 22, this.challenges[this.ci].prompt, { size: 14, color: '#fff' });
      for (const c of this.chips) this.drawChip(ctx, c); }
    else if (this.phase === 'land') label(ctx, game.W / 2, this.groundY + 40, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
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

  objectives(game) {
    const n = this.challenges.length;
    return {
      title: `Throw — challenge ${Math.min(this.ci + 1, n)} / ${n}`,
      goals: [
        { text: this.challenges[this.ci].prompt, done: this.phase === 'done' || this.phase === 'land' },
        { text: 'Two independent motions make the curve', done: game.state.stagesDone.throw },
      ],
    };
  }
}
