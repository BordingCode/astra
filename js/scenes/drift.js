// drift.js — Stage 1: empty space. A push starts motion; nothing here ever stops it.
// The lesson the player FEELS: with no force, motion is a straight line, forever (Newton 1).
import { drawMote, drawRing, drawArrow, hexA, label } from '../render/draw.js';

const COL = '#6be4ff';

export class DriftScene {
  constructor() { this.title = 'Drift'; this.id = 'drift'; }

  enter(game) { this.layout(game); this.reset(game); }
  resize(game) { this.layout(game); if (this.phase === 'aim') this.reset(game); }

  layout(game) {
    const W = game.W, H = game.H;
    this.sx = W * 0.15; this.sy = H * 0.58;
    // two gates on a single ray from the mote — so one straight push can thread both.
    // Placed by x-fraction (with y from the aim angle) so both stay comfortably on screen.
    const ang = -0.34;                       // up-and-to-the-right
    const tan = Math.tan(ang);
    const g1x = W * 0.52, g2x = W * 0.80;
    this.gates = [
      { x: g1x, y: this.sy + (g1x - this.sx) * tan, r: 30 },
      { x: g2x, y: this.sy + (g2x - this.sx) * tan, r: 25 },
    ];
  }

  reset(game) {
    this.phase = 'aim';                      // aim | fly | clear
    this.mote = { x: this.sx, y: this.sy, vx: 0, vy: 0 };
    this.aiming = false; this.aim = null;
    this.gates.forEach(g => g.passed = false);
    this.trail = []; this.flyT = 0; this.clearT = 0;
    game.refreshGoals();
  }

  onDown(x, y, game) {
    if (this.phase !== 'aim') { if (this.phase === 'clear') return; this.reset(game); return; }
    this.aiming = true; this.aim = { x, y };
    game.coachOnce('drift_aim', { kind: 'hint', title: 'Aim, then let go',
      sub: 'Drag out from the mote to point it, then release to give it one push.' });
  }
  onMove(x, y) { if (this.aiming) this.aim = { x, y }; }
  onUp(x, y, game) {
    if (!this.aiming) return;
    this.aiming = false;
    const dx = this.aim.x - this.sx, dy = this.aim.y - this.sy;
    const d = Math.hypot(dx, dy);
    if (d < 14) { this.aim = null; return; }                 // too small a drag = cancel
    const speed = Math.min(700, Math.max(150, d * 2.4));     // px/s — constant, forever
    this.mote.vx = (dx / d) * speed; this.mote.vy = (dy / d) * speed;
    this.phase = 'fly'; this.flyT = 0; this.trail = [];
    game.sfx.launch();
  }

  update(dt, game) {
    if (this.phase === 'fly') {
      // pure constant velocity — no friction, no gravity (Euler is exact here)
      this.mote.x += this.mote.vx * dt; this.mote.y += this.mote.vy * dt;
      this.flyT += dt;
      // breadcrumb trail
      if (this.trail.length === 0 || Math.hypot(this.mote.x - this.trail[this.trail.length - 1].x, this.mote.y - this.trail[this.trail.length - 1].y) > 16)
        this.trail.push({ x: this.mote.x, y: this.mote.y });
      if (this.trail.length > 60) this.trail.shift();
      // gate passes
      for (const g of this.gates) {
        if (!g.passed && Math.hypot(this.mote.x - g.x, this.mote.y - g.y) < g.r) {
          g.passed = true; game.sfx.tick();
          game.gl.burst(g.x, g.y, 18, { color: [0.42, 0.9, 1], speed: 120, size: 14, life: 0.6, alpha: 0.8 });
          game.refreshGoals();
        }
      }
      if (this.gates.every(g => g.passed)) {
        this.phase = 'clear'; this.clearT = 0;
        game.state.feltDrift = true; game.persist();
        game.refreshGoals();
        import('../ui/hud.js').then(UI => UI.flash('It sailed through — and it’s still going. Nothing out here will ever slow it down.'));
        return;
      }
      // off-screen without threading both → it won't come back on its own (that's the point)
      const m = 80;
      if (this.mote.x < -m || this.mote.x > game.W + m || this.mote.y < -m || this.mote.y > game.H + m) {
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'It drifted off',
          sub: 'No friction out here to bend its path — only a new push can. Line up the gates and try again.' }));
        game.sfx.reject();
        this.reset(game);
      }
    } else if (this.phase === 'clear') {
      // let it keep gliding a beat, then hand off to the lesson screen
      this.mote.x += this.mote.vx * dt; this.mote.y += this.mote.vy * dt;
      this.clearT += dt;
      if (this.clearT > 1.4) { this.phase = 'done'; game.completeStage('drift'); }
    }
  }

  render(ctx, game) {
    const t = game.time;
    // gates
    for (const g of this.gates) drawRing(ctx, g.x, g.y, g.r, COL, { lit: g.passed, time: t });
    // aim preview: a straight ray to the screen edge + the launch vector
    if (this.phase === 'aim' && this.aiming && this.aim) {
      const dx = this.aim.x - this.sx, dy = this.aim.y - this.sy;
      const d = Math.hypot(dx, dy) || 1;
      const far = Math.max(game.W, game.H) * 1.5;
      const ex = this.sx + dx / d * far, ey = this.sy + dy / d * far;
      ctx.save();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = COL; ctx.lineWidth = 2; ctx.setLineDash([5, 9]);
      ctx.beginPath(); ctx.moveTo(this.sx, this.sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
      const mag = Math.min(70, d);
      drawArrow(ctx, this.sx, this.sy, this.sx + dx / d * mag, this.sy + dy / d * mag, '#fff', { width: 3, head: 11 });
    }
    // flight trail
    if (this.trail.length > 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.trail.length; i++) {
        const a = (i / this.trail.length) * 0.5;
        ctx.fillStyle = hexA(COL, a);
        ctx.beginPath(); ctx.arc(this.trail[i].x, this.trail[i].y, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // the mote
    if (this.phase !== 'done') drawMote(ctx, this.mote.x, this.mote.y, 13, COL, { time: t, pulse: this.phase === 'aim' ? 1 : 0 });
    if (this.phase === 'aim' && !this.aiming)
      label(ctx, this.sx, this.sy - 34, 'drag to aim →', { color: hexA(COL, 0.8), size: 12.5 });
  }

  objectives(game) {
    const passed = this.gates ? this.gates.filter(g => g.passed).length : 0;
    return {
      title: 'Drift — one push',
      goals: [
        { text: `Thread the mote through both gates with a single push`, sub: `${passed} / 2 passed`, done: passed === 2 },
        { text: 'See that it never slows down', done: game.state.feltDrift },
      ],
    };
  }
}
