// drift.js — Stage 1: empty space, frictionless constant motion (Newton's 1st law).
// Three challenges that hammer the same truth from different angles:
//   1) THREAD — one straight push threads two gates; it never slows.
//   2) NUDGE  — gates off the line: ONLY a force bends the path (velocities add).
//   3) LEAD   — intercept a gate drifting at a steady speed (predict constant motion).
import { drawMote, drawRing, drawArrow, hexA, label } from '../render/draw.js';

const COL = '#6be4ff';

export class DriftScene {
  constructor() {
    this.title = 'Drift'; this.id = 'drift';
    this.challenges = [
      { type: 'thread', prompt: 'Thread both gates with a single push' },
      { type: 'nudge',  prompt: 'Bend your path with ONE mid-flight nudge' },
      { type: 'lead',   prompt: 'Lead the drifting gate — it moves at a steady speed' },
    ];
  }

  enter(game) { this.layout(game); this.ci = Math.min(game.state.progress.drift || 0, this.challenges.length - 1); this.startChallenge(game); }
  resize(game) { this.layout(game); this.startChallenge(game); }

  layout(game) { this.W = game.W; this.H = game.H; this.sx = game.W * 0.15; this.sy = game.H * 0.58; }

  startChallenge(game) {
    const c = this.challenges[this.ci]; this.type = c.type;
    const W = this.W, H = this.H;
    if (this.type === 'thread') {
      const ang = -0.34, tan = Math.tan(ang), g1x = W * 0.52, g2x = W * 0.80;
      this.gates = [
        { x: g1x, y: this.sy + (g1x - this.sx) * tan, r: 30, vx: 0, vy: 0 },
        { x: g2x, y: this.sy + (g2x - this.sx) * tan, r: 25, vx: 0, vy: 0 },
      ];
      this.nudges = 0;
    } else if (this.type === 'nudge') {
      this.gates = [
        { x: W * 0.42, y: this.sy, r: 32, vx: 0, vy: 0 },              // straight ahead, on the launch line
        { x: W * 0.66, y: this.sy - H * 0.12, r: 58, vx: 0, vy: 0 },   // up-and-right & large: bend into it
      ];
      this.nudges = 1;
    } else if (this.type === 'lead') {
      this.gates = [{ x: W * 0.78, y: H * 0.26, r: 34, vx: 0, vy: 78 }]; // drifting downward, clear of the panel
      this.nudges = 0;
    }
    this.reset(game);
  }

  reset(game) {
    this.phase = 'aim';
    this.mote = { x: this.sx, y: this.sy, vx: 0, vy: 0 };
    this.aiming = false; this.aim = null;
    this.gates.forEach(g => { g.passed = false; g.x0 = g.x; g.y0 = g.y; });
    this.nudgesLeft = this.nudges;
    this.trail = []; this.flyT = 0; this.clearT = 0;
    game.refreshGoals();
  }

  onDown(x, y, game) {
    if (this.phase === 'aim') {
      this.aiming = true; this.aim = { x, y };
      game.coachOnce('drift_aim', { kind: 'hint', title: 'Aim, then let go',
        sub: 'Drag out from the mote to point it, then release to give it one push.' });
    } else if (this.phase === 'fly' && this.type === 'nudge' && this.nudgesLeft > 0) {
      // a mid-flight push: change the velocity toward the tap (a force bends the path; speeds add)
      const dx = x - this.mote.x, dy = y - this.mote.y, d = Math.hypot(dx, dy) || 1;
      const imp = 450;
      this.mote.vx += dx / d * imp; this.mote.vy += dy / d * imp;
      this.nudgesLeft--;
      game.sfx.launch();
      game.gl.burst(this.mote.x, this.mote.y, 14, { color: [0.42, 0.9, 1], speed: 120, size: 12, life: 0.5, alpha: 0.8 });
      game.refreshGoals();
    }
  }
  onMove(x, y) { if (this.aiming) this.aim = { x, y }; }
  onUp(x, y, game) {
    if (!this.aiming) return;
    this.aiming = false;
    const dx = this.aim.x - this.sx, dy = this.aim.y - this.sy, d = Math.hypot(dx, dy);
    if (d < 14) { this.aim = null; return; }
    // the nudge challenge launches slower, so the mid-flight push can actually redirect it
    const maxSp = this.type === 'nudge' ? 230 : 700;
    const speed = Math.min(maxSp, Math.max(150, d * 2.4));
    this.mote.vx = (dx / d) * speed; this.mote.vy = (dy / d) * speed;
    this.phase = 'fly'; this.flyT = 0; this.trail = [];
    game.sfx.launch();
  }

  clearChallenge(game) {
    const last = this.ci >= this.challenges.length - 1;
    game.noteProgress('drift', this.ci + 1);
    if (last) { game.state.feltDrift = true; game.persist(); game.completeStage('drift'); }
    else { game.award(6); this.ci++; import('../ui/hud.js').then(UI => UI.flash('Challenge cleared — next one.')); this.startChallenge(game); }
  }

  update(dt, game) {
    if (this.phase === 'fly') {
      this.mote.x += this.mote.vx * dt; this.mote.y += this.mote.vy * dt;
      this.flyT += dt;
      for (const g of this.gates) { g.x += g.vx * dt; g.y += g.vy * dt; }   // moving gates drift
      if (this.trail.length === 0 || Math.hypot(this.mote.x - this.trail[this.trail.length - 1].x, this.mote.y - this.trail[this.trail.length - 1].y) > 16)
        this.trail.push({ x: this.mote.x, y: this.mote.y });
      if (this.trail.length > 60) this.trail.shift();
      for (const g of this.gates) {
        if (!g.passed && Math.hypot(this.mote.x - g.x, this.mote.y - g.y) < g.r) {
          g.passed = true; game.sfx.tick();
          game.gl.burst(g.x, g.y, 18, { color: [0.42, 0.9, 1], speed: 120, size: 14, life: 0.6, alpha: 0.8 });
          game.refreshGoals();
        }
      }
      if (this.gates.every(g => g.passed)) {
        this.phase = 'clear'; this.clearT = 0; game.refreshGoals();
        const msg = this.type === 'nudge' ? 'One push set it going — your nudge BENT it. Only a force can change a path.'
          : this.type === 'lead' ? 'Caught it — you led a moving target by predicting its steady drift.'
          : 'It sailed through — and it’s still going. Nothing out here will ever slow it down.';
        import('../ui/hud.js').then(UI => UI.flash(msg));
        return;
      }
      const m = 90;
      const lost = this.mote.x < -m || this.mote.x > game.W + m || this.mote.y < -m || this.mote.y > game.H + m;
      const gateGone = this.gates.some(g => !g.passed && (g.y > game.H + m || g.x > game.W + m || g.x < -m || g.y < -m));
      if (lost || gateGone) {
        const sub = this.type === 'lead' ? 'The gate drifted past — aim where it WILL be, not where it is.'
          : this.type === 'nudge' ? 'Missed — line up the first gate, then tap to nudge toward the second.'
          : 'No friction out here to bend its path — only a new push can. Line up the gates and try again.';
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'It drifted off', sub }));
        game.sfx.reject(); this.startChallenge(game);
      }
    } else if (this.phase === 'clear') {
      this.mote.x += this.mote.vx * dt; this.mote.y += this.mote.vy * dt;
      this.clearT += dt;
      if (this.clearT > 1.4) { this.phase = 'done'; this.clearChallenge(game); }
    }
  }

  render(ctx, game) {
    const t = game.time;
    for (const g of this.gates) drawRing(ctx, g.x, g.y, g.r, COL, { lit: g.passed, time: t, dash: g.vy !== 0 || g.vx !== 0 });
    if (this.phase === 'aim' && this.aiming && this.aim) {
      const dx = this.aim.x - this.sx, dy = this.aim.y - this.sy, d = Math.hypot(dx, dy) || 1;
      const far = Math.max(game.W, game.H) * 1.5, ex = this.sx + dx / d * far, ey = this.sy + dy / d * far;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = COL; ctx.lineWidth = 2; ctx.setLineDash([5, 9]);
      ctx.beginPath(); ctx.moveTo(this.sx, this.sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
      const mag = Math.min(70, d);
      drawArrow(ctx, this.sx, this.sy, this.sx + dx / d * mag, this.sy + dy / d * mag, '#fff', { width: 3, head: 11 });
    }
    if (this.trail.length > 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.trail.length; i++) { ctx.fillStyle = hexA(COL, (i / this.trail.length) * 0.5);
        ctx.beginPath(); ctx.arc(this.trail[i].x, this.trail[i].y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (this.phase !== 'done') drawMote(ctx, this.mote.x, this.mote.y, 13, COL, { time: t, pulse: this.phase === 'aim' ? 1 : 0 });
    if (this.phase === 'aim' && !this.aiming) label(ctx, this.sx, this.sy - 34, 'drag to aim →', { color: hexA(COL, 0.8), size: 12.5 });
    if (this.phase === 'fly' && this.type === 'nudge' && this.nudgesLeft > 0) label(ctx, game.W / 2, game.H * 0.88, 'tap to nudge — bend toward the second gate', { color: '#fff', size: 13 });
  }

  // live formula: v = constant (the speed doesn't change without a force — Newton 1)
  mathLayer(game) {
    if (this.phase !== 'fly' && this.phase !== 'clear') return null;
    const sp = Math.hypot(this.mote.vx, this.mote.vy);
    return { x: game.W / 2, y: game.H * 0.25, size: 22, cells: [
      { sym: 'v', val: sp.toFixed(0), color: '#6be4ff' }, { op: '=' }, { txt: 'constant', color: '#ffffff' },
    ] };
  }

  objectives(game) {
    const n = this.challenges.length, passed = this.gates ? this.gates.filter(g => g.passed).length : 0, total = this.gates ? this.gates.length : 0;
    return {
      title: `Drift — challenge ${Math.min(this.ci + 1, n)} / ${n}`,
      goals: [
        { text: this.challenges[this.ci].prompt, sub: `${passed} / ${total} gate${total > 1 ? 's' : ''} passed`, done: this.phase === 'clear' || this.phase === 'done' },
        { text: 'See that motion needs no force to continue', done: game.state.feltDrift },
      ],
    };
  }
}
