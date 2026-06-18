// system.js — Stage 6: a family of worlds. Three challenges.
//   1) POPULATE  — add a 2nd world into a stable orbit beside an existing one (a system!).
//   2) KEPLER3   — inner vs outer planet: which finishes its year first? (T² ∝ r³)
//   3) SLINGSHOT — fly a probe past a MOVING world to steal speed and reach a far gate (Voyager).
//
// Display planets move ANALYTICALLY on circular orbits with ω = √(GM/r³) — exact Kepler, and
// perfectly stable. The player's body is stepped with the symplectic stepper (sim.js).
import { drawMote, drawTrailDot, drawRing, drawArrow, label, hexA } from '../render/draw.js';
import { stepEulerCromer } from '../physics/sim.js';

const COL = '#aef0ff', STARC = '#ffd98a', P1 = '#7aa0ff', P2 = '#ff9a6b', GATE = '#ffd66b';
const DT = 1 / 120;

export class SystemScene {
  constructor() {
    this.title = 'System'; this.id = 'system';
    this.challenges = [
      { type: 'populate',  prompt: 'Add a new world into a steady orbit — clear of the other one' },
      { type: 'kepler3',   prompt: 'Inner or outer — which finishes its year first?' },
      { type: 'slingshot', prompt: 'Skim the moving world to fling the probe 1.5× faster' },
    ];
  }

  enter(game) { this.layout(game); this.ci = Math.min(game.state.progress.system || 0, this.challenges.length - 1); this.startChallenge(game); }
  resize(game) { this.layout(game); this.startChallenge(game); }

  layout(game) {
    const W = game.W, H = game.H;
    this.star = { x: W / 2, y: H * 0.50, R: 24 };
    this.GM = 150 * 150 * 110;                 // circular speed ≈150 px/s at r=110
    this.soft2 = 16 * 16;
    this.escR = Math.min(W, H) * 0.62;
  }

  omega(r) { return Math.sqrt(this.GM / (r * r * r)); }     // exact Kepler angular speed
  vCircAt(r) { return Math.sqrt(this.GM / r); }

  startChallenge(game) {
    const c = this.challenges[this.ci]; this.type = c.type;
    const W = game.W, H = game.H, S = this.star;
    this.t = 0; this.trail = []; this.sweep = 0; this.lastAng = null; this.body = null;
    this.aiming = false; this.aim = null; this.preview = null; this.guess = null;

    if (this.type === 'populate') {
      this.planets = [{ r: H * 0.20, ang: -0.6, R: 12, color: P1, trail: [] }];   // the existing world
      this.newR = H * 0.12;                                                        // launch radius (inner)
      this.start = { x: S.x, y: S.y - this.newR };
      this.phase = 'aim';
    } else if (this.type === 'kepler3') {
      this.planets = [
        { r: H * 0.11, ang: 0, R: 11, color: P2, trail: [], name: 'inner' },
        { r: H * 0.21, ang: 0, R: 13, color: P1, trail: [], name: 'outer' },
      ];
      this.phase = 'predict'; this.buildChips(game);
    } else if (this.type === 'slingshot') {
      this.start = { x: W * 0.13, y: H * 0.56 };
      this.mover = { x: W * 0.55, y: H * 0.82, vx: 0, vy: -H * 0.12, R: 18, GM: 150 * 150 * 95 }; // heavy moving world
      this.mover0 = { x: this.mover.x, y: this.mover.y };
      this.needBoost = 1.4; this.maxSpeed = 0;
      this.phase = 'aim';
    }
    game.refreshGoals();
  }

  buildChips(game) {
    const W = game.W, cy = game.H * 0.86, h = 40;
    const labels = [['inner', 'Inner first'], ['same', 'Same time'], ['outer', 'Outer first']];
    const w = Math.min(120, (W - 40) / 3 - 8); const total = w * 3 + 16; let x = (W - total) / 2;
    this.chips = labels.map(([id, label]) => { const c = { id, label, x, y: cy - h / 2, w, h }; x += w + 8; return c; });
  }

  // ---- gravity / integration ----
  pull(b, ax, ay, gx, gy, GM) {
    const dx = gx - b.x, dy = gy - b.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2), a = GM / (r2 + this.soft2);
    return [ax + a * dx / r, ay + a * dy / r];
  }
  moverAt(t) { return { x: this.mover0.x + this.mover.vx * t, y: this.mover0.y + this.mover.vy * t }; }
  accel(b, t) {
    let ax = 0, ay = 0;
    if (this.type === 'slingshot') { const m = this.moverAt(t); [ax, ay] = this.pull(b, ax, ay, m.x, m.y, this.mover.GM); }
    else { [ax, ay] = this.pull(b, ax, ay, this.star.x, this.star.y, this.GM); }
    return { ax, ay };
  }
  rOfStar(b) { return Math.hypot(b.x - this.star.x, b.y - this.star.y); }

  tracePath(vx, vy) {
    const b = { x: this.start.x, y: this.start.y, vx, vy };
    const pts = [{ x: b.x, y: b.y }]; let end = 'open';
    const startSp = Math.hypot(vx, vy); let peak = startSp;
    for (let i = 0; i < Math.floor(9 / DT); i++) {
      const t = i * DT;
      stepEulerCromer(b, bb => this.accel(bb, t), DT);
      if (this.type === 'slingshot') {
        peak = Math.max(peak, Math.hypot(b.vx, b.vy));
        const m = this.moverAt(t); if (Math.hypot(b.x - m.x, b.y - m.y) < this.mover.R + 4) { end = 'hit'; break; }
        if (peak >= startSp * this.needBoost) { pts.push({ x: b.x, y: b.y }); end = 'boost'; break; }
        if (b.x < -60 || b.x > 9999 || b.y < -300 || b.y > 9999) { end = 'weak'; break; }
      } else {
        const r = this.rOfStar(b);
        if (r < this.star.R + 10) { pts.push({ x: b.x, y: b.y }); end = 'crash'; break; }
        if (r > this.escR) { pts.push({ x: b.x, y: b.y }); end = 'escape'; break; }
      }
      if (i % 2 === 0) pts.push({ x: b.x, y: b.y });
    }
    pts.end = end; return pts;
  }

  clearChallenge(game) {
    const last = this.ci >= this.challenges.length - 1;
    game.noteProgress('system', this.ci + 1);
    if (last) { game.state.feltSystem = true; game.persist(); game.completeStage('system'); }
    else { game.award(6); this.ci++; import('../ui/hud.js').then(UI => UI.flash('Challenge cleared — next one.')); this.startChallenge(game); }
  }

  // ---- input ----
  onDown(x, y, game) {
    if (this.type === 'kepler3') {
      if (this.phase === 'predict') { for (const c of this.chips) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.guess = c.id; game.sfx.pickup(); this.phase = 'run'; this.t = 0; this.planets.forEach(p => { p.ang = 0; p.trail = []; }); game.refreshGoals(); return; } }
      else if (this.phase === 'reveal') this.clearChallenge(game);
      return;
    }
    if (this.phase === 'aim') {
      this.aiming = true; this.aim = { x, y }; this.recompute();
      game.coachOnce('system_aim', { kind: 'hint', title: this.type === 'slingshot' ? 'Aim the probe' : 'Launch a world',
        sub: this.type === 'slingshot' ? 'Drag to fling the probe. Skim past the moving world to steal its speed.' : 'Drag to set speed & direction. The faint path shows the orbit you’d make.' });
    }
  }
  onMove(x, y) { if (this.aiming) { this.aim = { x, y }; this.recompute(); } }
  onUp(x, y, game) {
    if (this.type === 'kepler3' || !this.aiming) return;
    this.aiming = false;
    const v = this.aimVel(); if (!v) { this.aim = null; this.preview = null; return; }
    this.body = { x: this.start.x, y: this.start.y, vx: v.vx, vy: v.vy };
    this.phase = 'run'; this.t = 0; this.trail = []; this.sweep = 0; this.lastAng = null; this.startSpeed = v.speed;
    game.sfx.launch();
  }
  aimVel() {
    if (!this.aim) return null;
    const dx = this.aim.x - this.start.x, dy = this.aim.y - this.start.y, d = Math.hypot(dx, dy);
    if (d < 12) return null;
    const cap = this.type === 'slingshot' ? 140 : 360;       // engine alone can't reach 1.5× — you must steal speed
    const speed = Math.min(cap, Math.max(40, d * 2.2));
    return { vx: dx / d * speed, vy: dy / d * speed, speed };
  }
  recompute() { const v = this.aimVel(); this.preview = v ? this.tracePath(v.vx, v.vy) : null; }

  // ---- update ----
  update(dt, game) {
    // advance display planets analytically (exact, stable)
    if (this.planets) for (const p of this.planets) {
      p.ang += this.omega(p.r) * dt;
      p.x = this.star.x + Math.cos(p.ang) * p.r; p.y = this.star.y + Math.sin(p.ang) * p.r;
      if (this.phase === 'run' || this.type === 'populate') { if (!p.trail.length || (p.ang) - (p._lt || -9) > 0.18) { p.trail.push({ x: p.x, y: p.y }); p._lt = p.ang; if (p.trail.length > 80) p.trail.shift(); } }
    }
    if (this.type === 'kepler3' && this.phase === 'run') {
      this.t += dt;
      if (this.planets[0].ang >= Math.PI * 2) { this.phase = 'reveal'; this.keplerReveal(game); }
      return;
    }
    if (this.phase !== 'run' || !this.body) return;

    const steps = Math.max(1, Math.round(dt / DT));
    for (let i = 0; i < steps; i++) {
      stepEulerCromer(this.body, b => this.accel(b, this.t), DT);
      this.t += DT;
      if (this.type === 'slingshot') {
        const m = this.moverAt(this.t);
        this.maxSpeed = Math.max(this.maxSpeed, Math.hypot(this.body.vx, this.body.vy));
        if (Math.hypot(this.body.x - m.x, this.body.y - m.y) < this.mover.R + 4) return this.fail(game, 'You crashed into the world. Skim PAST it — don’t hit it.');
        if (this.maxSpeed >= this.startSpeed * this.needBoost) return this.win(game, 'boost');
        if (this.body.x < -70 || this.body.x > game.W + 70 || this.body.y < -200 || this.body.y > game.H + 70) return this.fail(game, 'It flew off without a boost. Pass CLOSER behind the moving world — let its gravity catch and fling you.');
        if (this.t > 14) return this.fail(game, 'No boost yet. Skim right behind the moving world, in the direction it’s heading.');
      } else {
        const r = this.rOfStar(this.body);
        const ang = Math.atan2(this.body.y - this.star.y, this.body.x - this.star.x);
        if (this.lastAng !== null) { let da = ang - this.lastAng; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; this.sweep += da; }
        this.lastAng = ang;
        if (r < this.star.R + 10) return this.fail(game, 'It fell into the star. Fling it faster so it falls past, not in.');
        if (r > this.escR) return this.fail(game, 'It escaped the star. Ease the speed down until the path closes into a loop.');
        // collide with existing world?
        for (const p of this.planets) if (Math.hypot(this.body.x - p.x, this.body.y - p.y) < p.R + 9) return this.fail(game, 'The two worlds collided! Aim for a clear orbit at a different distance.');
        if (Math.abs(this.sweep) >= Math.PI * 2) return this.win(game, 'orbit');
      }
    }
    if (!this.trail.length || this.t - this.trail[this.trail.length - 1].t > 0.05) {
      this.trail.push({ x: this.body.x, y: this.body.y, t: this.t, sp: Math.hypot(this.body.vx, this.body.vy) });
      if (this.trail.length > 240) this.trail.shift();
    }
  }

  win(game, kind) {
    this.phase = 'done'; game.sfx.win(); game.celebrate(this.body.x, this.body.y, [1, 0.84, 0.42]);
    import('../ui/hud.js').then(UI => {
      if (kind === 'orbit') UI.toast(game, { kind: 'win', title: 'A system!', sub: 'Two worlds now circle the same star — each falling around it forever, at its own distance.' });
      else { const boost = this.startSpeed ? (this.maxSpeed / this.startSpeed) : 1;
        UI.toast(game, { kind: 'win', title: 'Slingshot!', sub: `You skimmed the moving world and came away ${boost.toFixed(1)}× faster — that extra speed was stolen from the planet’s own motion. Real spacecraft do exactly this.` }); }
    });
    setTimeout(() => this.clearChallenge(game), 1100);
  }
  fail(game, sub) { game.sfx.reject(); import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'Try again', sub })); this.startChallenge(game); }
  keplerReveal(game) {
    const correct = this.guess === 'inner';
    import('../ui/hud.js').then(UI => {
      if (correct) { game.awardReason(); game.state.predictedRight.system = true; UI.toast(game, { kind: 'win', title: 'You called it — the inner world', sub: 'Closer in means faster AND a smaller loop — so it laps the star first. Farther out = slower and a much longer year. (Kepler’s 3rd law.)' }); }
      else UI.toast(game, { kind: 'fail', title: 'The INNER world finishes first', sub: 'It’s both faster and has less distance to cover. Farther planets are slower and have far longer years — T² grows with r³.' });
    });
  }

  // ---- render ----
  render(ctx, game) {
    const t = game.time;
    if (this.type !== 'slingshot') this.drawStar(ctx, t);   // the slingshot is about the moving world, not the star
    // orbit rings for the display worlds
    if (this.planets) for (const p of this.planets) {
      ctx.save(); ctx.strokeStyle = hexA(p.color, 0.18); ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.arc(this.star.x, this.star.y, p.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      for (const d of p.trail) drawTrailDot(ctx, d.x, d.y, 3, p.color, 0.4);
      drawMote(ctx, p.x, p.y, p.R, p.color, { time: t });
      if (this.type === 'kepler3') label(ctx, p.x, p.y - p.R - 12, p.name, { color: hexA(p.color, 0.85), size: 11 });
    }
    // slingshot: the moving world + a live boost meter
    if (this.type === 'slingshot') {
      const m = this.phase === 'run' ? this.moverAt(this.t) : this.mover0;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, this.mover.R * 2.4);
      gg.addColorStop(0, hexA(P2, 0.5)); gg.addColorStop(1, hexA(P2, 0)); ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(m.x, m.y, this.mover.R * 2.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      drawMote(ctx, m.x, m.y, this.mover.R, P2, { time: t });
      drawArrow(ctx, m.x, m.y + 24, m.x, m.y - 20, hexA(P2, 0.85), { width: 2, head: 8 });   // it's moving up
      label(ctx, m.x, m.y + 40, 'moving world ↑', { color: hexA(P2, 0.8), size: 11 });
      this.drawBoost(ctx, game);
    }
    // aim preview, coloured by outcome
    if (this.phase === 'aim' && this.aiming && this.preview) {
      const end = this.preview.end;
      const good = end === 'boost' || end === 'orbit' || end === 'open';
      const bad = end === 'hit' || end === 'weak' || end === 'crash' || end === 'escape';
      const c = bad ? '#ff9a8a' : good ? COL : '#ffd66b';
      this.drawPath(ctx, this.preview, hexA(c, 0.7));
      const v = this.aimVel();
      if (v) { const mag = Math.min(64, 18 + v.speed * 0.18);
        drawArrow(ctx, this.start.x, this.start.y, this.start.x + v.vx / v.speed * mag, this.start.y + v.vy / v.speed * mag, '#fff', { width: 3, head: 10 }); }
    }
    // player body + trail
    for (const d of this.trail) { const f = Math.min(1, (d.sp || 0) / 240); drawTrailDot(ctx, d.x, d.y, 3 + f * 4, COL, 0.3 + f * 0.5); }
    if (this.body && this.phase !== 'done') drawMote(ctx, this.body.x, this.body.y, this.type === 'slingshot' ? 8 : 11, COL, { time: t });
    if (this.phase === 'aim' && !this.aiming && this.start) {
      drawMote(ctx, this.start.x, this.start.y, this.type === 'slingshot' ? 8 : 11, COL, { time: t, pulse: 1 });
      const lbl = this.type === 'slingshot' ? 'drag to launch the probe →' : 'drag to launch →';
      const leftEdge = this.start.x < game.W * 0.28;
      label(ctx, this.start.x - (leftEdge ? 6 : 0), this.start.y - 26, lbl, { color: hexA(COL, 0.8), size: 12, align: leftEdge ? 'left' : 'center' });
    }
    // chips
    if (this.type === 'kepler3' && this.phase === 'predict') {
      label(ctx, game.W / 2, this.chips[0].y - 22, 'Which finishes its lap first?', { size: 14.5, color: '#fff' });
      for (const c of this.chips) this.drawChip(ctx, c);
    }
    if (this.phase === 'reveal') label(ctx, game.W / 2, game.H * 0.9, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
  }

  drawStar(ctx, t) {
    const s = this.star;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.R * 3.4);
    g.addColorStop(0, hexA(STARC, 0.6)); g.addColorStop(1, hexA(STARC, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.R * 3.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); const g2 = ctx.createRadialGradient(s.x - s.R * 0.3, s.y - s.R * 0.3, s.R * 0.2, s.x, s.y, s.R);
    g2.addColorStop(0, '#fff7e0'); g2.addColorStop(1, '#ffb24a');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(s.x, s.y, s.R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  drawPath(ctx, pts, color) {
    if (!pts || pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke(); ctx.restore();
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

  drawBoost(ctx, game) {
    if (this.phase !== 'run' || !this.startSpeed || !this.body) return;
    const ratio = Math.hypot(this.body.vx, this.body.vy) / this.startSpeed;
    const w = 200, h = 14, x = game.W / 2 - w / 2, y = game.H * 0.86, span = this.needBoost * 1.3 - 1;
    ctx.save();
    ctx.fillStyle = 'rgba(150,190,255,.12)'; this._rr(ctx, x, y, w, h, 7); ctx.fill();
    const f = Math.max(0, Math.min(1, (ratio - 1) / span)), reached = ratio >= this.needBoost;
    ctx.fillStyle = reached ? 'rgba(75,224,138,.85)' : 'rgba(110,228,255,.7)';
    this._rr(ctx, x, y, Math.max(8, w * f), h, 7); ctx.fill();
    const mx = x + w * Math.min(1, (this.needBoost - 1) / span);
    ctx.strokeStyle = '#ffd66b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, y - 3); ctx.lineTo(mx, y + h + 3); ctx.stroke();
    ctx.restore();
    label(ctx, game.W / 2, y - 12, `speed ${ratio.toFixed(1)}×   ·   need ${this.needBoost.toFixed(1)}×`, { color: '#fff', size: 12 });
  }
  _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // live formula: orbit speed falls off with distance — v = √(GM ÷ r)
  mathLayer(game) {
    if (this.type === 'slingshot' || this.phase === 'done') return null;
    if (this.type === 'kepler3' && this.phase === 'predict') return null;   // the chips live here — don't cover them
    return { x: game.W / 2, y: game.H * 0.88, size: 21, cells: [
      { sym: 'v', color: '#aef0ff' }, { op: '=' },
      { sqrt: [{ frac: { num: [{ sym: 'G' }, { sym: 'M' }], den: [{ sym: 'r' }] }, color: '#cfe0ff' }] },
      { txt: '   ' }, { txt: 'farther = slower', color: '#9fb0cc' },
    ] };
  }

  objectives(game) {
    const n = this.challenges.length;
    return {
      title: `System — challenge ${Math.min(this.ci + 1, n)} / ${n}`,
      goals: [
        { text: this.challenges[this.ci].prompt, done: this.phase === 'done' || this.phase === 'reveal' },
        { text: 'Build a family of worlds around one star', done: game.state.feltSystem },
      ],
    };
  }
}
