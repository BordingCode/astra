// orbit.js — Stage 5: gravity that curves. Three challenges.
//   1) CANNONBALL — fling it sideways: too slow crashes, too fast escapes, just right ORBITS.
//   2) KEPLER     — on an ellipse, predict WHERE it moves fastest (closest in: perihelion).
//   3) ESCAPE     — give it escape speed (only √2× the circular speed) so it never returns.
//
// Built on the SYMPLECTIC Euler–Cromer stepper (sim.js): plain Euler would inject energy and
// make every orbit spiral outward — teaching the opposite of what an orbit is. A live predicted
// path (integrated forward as you aim) lets you SEE the orbit before you commit.
import { drawMote, drawTrailDot, drawRing, drawArrow, label, hexA } from '../render/draw.js';
import { stepEulerCromer } from '../physics/sim.js';

const COL = '#aef0ff', PLANET = '#7aa0ff', CRASHC = '#ff9a8a', ESCC = '#ffd66b';
const DT = 1 / 120;                 // small fixed step for a clean orbit

export class OrbitScene {
  constructor() {
    this.title = 'Orbit'; this.id = 'orbit';
    this.challenges = [
      { type: 'cannonball', prompt: 'Fling it so it falls round the world — not into it, not away' },
      { type: 'kepler',     prompt: 'On this ellipse, tap where it moves FASTEST' },
      // The flagship cross-stage refusal (curriculum physics-astra.md ORBIT + §4/§5): the player
      // COMMITS to "thrust forward to climb higher → stay faster" — the sim then violates it: the
      // craft climbs but arrives SLOWER, reaching back to the energy axis (kinetic ↔ height).
      { type: 'climb',      prompt: 'Thrust forward to climb to a higher orbit — then watch your speed' },
      { type: 'escape',     prompt: 'Give it enough speed to break free forever' },
    ];
  }

  enter(game) { this.layout(game); this.ci = Math.min(game.state.progress.orbit || 0, this.challenges.length - 1); this.startChallenge(game); }
  resize(game) { this.layout(game); this.startChallenge(game); }

  layout(game) {
    const W = game.W, H = game.H;
    this.planet = { x: W / 2, y: H * 0.52, R: 34 };
    this.r0 = Math.min(160, H * 0.22);                 // launch distance from the planet
    this.GM = 150 * 150 * this.r0;                     // so circular speed at r0 ≈ 150 px/s
    this.vCirc = Math.sqrt(this.GM / this.r0);
    this.vEsc = Math.SQRT2 * this.vCirc;
    this.soft2 = 18 * 18;                              // softening: tame the 1/r² spike near the core
    this.crashR = this.planet.R + 9;
    this.escR = this.r0 * 3.0;
    this.start = { x: this.planet.x, y: this.planet.y - this.r0 };
  }

  startChallenge(game) {
    const c = this.challenges[this.ci]; this.type = c.type;
    this.trail = []; this.runT = 0; this.sweep = 0; this.lastAng = null; this.maxR = this.r0; this.wentOut = false;
    if (this.type === 'kepler') {
      // a fixed ellipse: launch slower than circular → start is the far point (apoapsis)
      this.mote = { x: this.start.x, y: this.start.y, vx: this.vCirc * 0.78, vy: 0 };
      this.path = this.tracePath(this.mote, 14, 3);
      this.peri = this.perihelion(this.path);
      this.guess = null; this.phase = 'predict';
    } else if (this.type === 'climb') {
      // Already in a clean circular orbit, coasting. Player commits a prediction, THEN we fire a
      // prograde (forward) burn. Prograde thrust raises the OPPOSITE side: the craft climbs to a
      // higher orbit but arrives moving SLOWER than it started — the speed-up-to-go-up paradox.
      this.mote = { x: this.start.x, y: this.start.y, vx: this.vCirc, vy: 0 };  // circular, moving +x
      this.guess = null; this.phase = 'predict'; this.burned = false;
      this.startSpeed = this.vCirc; this.apoSpeed = null; this.peakR = this.r0; this.prevR = this.r0;
      this.trail = []; this.runT = 0; this.lastAng = null; this.sweep = 0;
      this.buildClimbChips(game);
    } else {
      this.mote = { x: this.start.x, y: this.start.y, vx: 0, vy: 0 };
      this.aiming = false; this.aim = null; this.preview = null; this.phase = 'aim';
    }
    game.refreshGoals();
  }

  grav(b) {
    const dx = this.planet.x - b.x, dy = this.planet.y - b.y;
    const r2 = dx * dx + dy * dy, r = Math.sqrt(r2), a = this.GM / (r2 + this.soft2);
    return { ax: a * dx / r, ay: a * dy / r };
  }
  rOf(b) { return Math.hypot(b.x - this.planet.x, b.y - this.planet.y); }

  // integrate forward and return the trajectory (for the aim preview & the ellipse)
  tracePath(from, seconds, every = 3) {
    const b = { x: from.x, y: from.y, vx: from.vx, vy: from.vy };
    const pts = [{ x: b.x, y: b.y }]; const steps = Math.floor(seconds / DT);
    let end = 'orbit';
    for (let i = 0; i < steps; i++) {
      stepEulerCromer(b, bb => this.grav(bb), DT);
      const r = this.rOf(b);
      if (r < this.crashR) { pts.push({ x: b.x, y: b.y }); end = 'crash'; break; }
      if (r > this.escR) { pts.push({ x: b.x, y: b.y }); end = 'escape'; break; }
      if (i % every === 0) pts.push({ x: b.x, y: b.y });
    }
    pts.end = end; return pts;
  }
  perihelion(path) { let best = path[0], bd = Infinity; for (const p of path) { const d = Math.hypot(p.x - this.planet.x, p.y - this.planet.y); if (d < bd) { bd = d; best = p; } } return best; }

  // two prediction chips for the climb refusal: faster vs slower at the higher orbit
  buildClimbChips(game) {
    const W = game.W, cy = game.H * 0.88, h = 42, w = Math.min(150, (W - 40) / 2 - 8);
    const total = w * 2 + 14; let x = (W - total) / 2;
    this.chips = [['faster', 'Faster up there'], ['slower', 'Slower up there']].map(([id, label]) => { const c = { id, label, x, y: cy - h / 2, w, h }; x += w + 14; return c; });
  }
  drawClimbChip(ctx, c) {
    ctx.save(); const r = 13;
    ctx.beginPath();
    ctx.moveTo(c.x + r, c.y); ctx.arcTo(c.x + c.w, c.y, c.x + c.w, c.y + c.h, r);
    ctx.arcTo(c.x + c.w, c.y + c.h, c.x, c.y + c.h, r); ctx.arcTo(c.x, c.y + c.h, c.x, c.y, r);
    ctx.arcTo(c.x, c.y, c.x + c.w, c.y, r); ctx.closePath();
    ctx.fillStyle = 'rgba(174,240,255,.12)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(174,240,255,.5)'; ctx.stroke();
    ctx.fillStyle = '#e8f8ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 14px "Outfit", system-ui, sans-serif';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2); ctx.restore();
  }

  clearChallenge(game) {
    const last = this.ci >= this.challenges.length - 1;
    game.noteProgress('orbit', this.ci + 1);
    if (last) { game.state.feltOrbit = true; game.persist(); game.completeStage('orbit'); }
    else { game.award(6); this.ci++; import('../ui/hud.js').then(UI => UI.flash('Challenge cleared — next one.')); this.startChallenge(game); }
  }

  // ---------- input ----------
  onDown(x, y, game) {
    if (this.type === 'kepler') {
      if (this.phase === 'predict') { this.guess = { x, y }; game.sfx.pickup(); this.launch(game); }
      else if (this.phase === 'reveal') this.clearChallenge(game);
      return;
    }
    if (this.type === 'climb') {
      if (this.phase === 'predict') {
        for (const c of this.chips) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          this.guess = c.id; game.sfx.pickup();
          // fire the prograde (forward) burn: add speed along the current motion
          const sp = Math.hypot(this.mote.vx, this.mote.vy) || 1;
          // +17% prograde: lifts apoapsis to ~2.2× the start radius (stays on-screen, well below
          // the 3× escape ring) and the apoapsis speed lands near ~0.5× the start speed — a clear,
          // honest "climbed higher, arrived slower" without ever escaping.
          const boost = this.vCirc * 0.17;
          this.mote.vx += this.mote.vx / sp * boost; this.mote.vy += this.mote.vy / sp * boost;
          this.burned = true; this.launch(game);
          game.coachOnce('orbit_climb', { kind: 'hint', title: 'Burn lit',
            sub: 'You just thrust forward. Watch the speed readout as it coasts up to the new high point.' });
          return;
        }
      } else if (this.phase === 'reveal') { this.clearChallenge(game); }
      return;
    }
    if (this.phase === 'aim') {
      this.aiming = true; this.aim = { x, y }; this.recompute();
      game.coachOnce('orbit_aim', { kind: 'hint', title: 'Fling it sideways',
        sub: 'Drag from the mote to set its speed and direction. The faint path shows where it’ll go.' });
    } else if (this.phase === 'done') { /* transient */ }
  }
  onMove(x, y) { if (this.aiming) { this.aim = { x, y }; this.recompute(); } }
  onUp(x, y, game) {
    if (this.type === 'kepler' || !this.aiming) return;
    this.aiming = false;
    const v = this.aimVel(); if (!v) { this.aim = null; this.preview = null; return; }
    this.mote.vx = v.vx; this.mote.vy = v.vy;
    this.launch(game);
  }

  aimVel() {
    if (!this.aim) return null;
    const dx = this.aim.x - this.start.x, dy = this.aim.y - this.start.y, d = Math.hypot(dx, dy);
    if (d < 12) return null;
    const speed = Math.min(this.vEsc * 1.6, Math.max(40, d * 2.2));
    return { vx: dx / d * speed, vy: dy / d * speed, speed };
  }
  recompute() { const v = this.aimVel(); this.preview = v ? this.tracePath({ x: this.start.x, y: this.start.y, vx: v.vx, vy: v.vy }, 9, 2) : null; }

  launch(game) { this.phase = 'run'; this.trail = []; this.runT = 0; this.sweep = 0; this.lastAng = null; this.maxR = this.rOf(this.mote); this.wentOut = false; game.sfx.launch(); }

  // ---------- update ----------
  update(dt, game) {
    // the climb challenge keeps orbiting LIVE even while the player is committing a prediction,
    // so the steady circular speed is felt before the burn changes it.
    const climbing = this.type === 'climb' && (this.phase === 'predict' || this.phase === 'run');
    if (this.phase !== 'run' && !climbing) return;
    const steps = Math.max(1, Math.round(dt / DT));
    for (let i = 0; i < steps; i++) {
      stepEulerCromer(this.mote, b => this.grav(b), DT);
      this.runT += DT;
      const r = this.rOf(this.mote);
      // track swept angle (for "completed a loop")
      const ang = Math.atan2(this.mote.y - this.planet.y, this.mote.x - this.planet.x);
      if (this.lastAng !== null) { let da = ang - this.lastAng; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; this.sweep += da; }
      this.lastAng = ang;
      this.maxR = Math.max(this.maxR, r);
      if (r > this.r0 * 1.15) this.wentOut = true;
      if (r < this.crashR) return this.crash(game);
      // the climb burn is sub-escape by design; don't treat its high apoapsis as an "escape"
      if (r > this.escR && this.type !== 'climb') return this.escaped(game);
    }
    // trail breadcrumbs
    if (this.trail.length === 0 || this.runT - this.trail[this.trail.length - 1].t > 0.05) {
      const sp = Math.hypot(this.mote.vx, this.mote.vy);
      this.trail.push({ x: this.mote.x, y: this.mote.y, t: this.runT, sp });
      if (this.trail.length > 220) this.trail.shift();
    }
    // success / fail conditions per challenge
    if (this.type === 'cannonball') {
      if (Math.abs(this.sweep) >= 2 * Math.PI * 1.0) return this.orbited(game);
    } else if (this.type === 'kepler') {
      if (Math.abs(this.sweep) >= 2 * Math.PI * 1.0) return this.keplerDone(game);
    } else if (this.type === 'escape') {
      // bound orbit that came back without escaping → fail
      if (this.wentOut && this.rOf(this.mote) < this.r0 * 0.9 && this.runT > 0.5) return this.cameBack(game);
      if (this.runT > 16) return this.cameBack(game);
    } else if (this.type === 'climb' && this.burned) {
      // detect apoapsis: the high point of the new orbit, where it is moving SLOWEST. The craft
      // rose after the burn; the instant r starts shrinking again is the top of the climb.
      const r = this.rOf(this.mote);
      this.peakR = Math.max(this.peakR, r);
      const rising = r >= this.prevR;
      if (!rising && this.peakR > this.r0 * 1.1 && this.runT > 0.4) {
        this.apoSpeed = Math.hypot(this.mote.vx, this.mote.vy);
        return this.climbDone(game);
      }
      this.prevR = r;
    }
  }

  crash(game) {
    game.sfx.reject(); game.gl.burst(this.mote.x, this.mote.y, 26, { color: [1, 0.6, 0.5], speed: 160, size: 16, life: 0.7, alpha: 0.85 });
    const sub = this.type === 'escape' ? 'It fell straight back in — that’s nowhere near enough. Escape needs about √2 times the orbiting speed.'
      : 'Too slow — it fell into the world. Fling it FASTER so it falls past the edge instead of onto it.';
    import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'Crashed', sub }));
    this.startChallenge(game);
  }
  escaped(game) {
    if (this.type === 'escape') {
      game.sfx.win(); game.celebrate(this.mote.x, this.mote.y, [1, 0.84, 0.42]);
      this.phase = 'done';
      import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'win', title: 'Escaped',
        sub: 'Free forever — and it only took about √2 (1.41×) the circular speed. A little extra is all it takes to never fall back.' }));
      this.clearChallenge(game);
    } else {
      game.sfx.reject();
      import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'Flew off into space',
        sub: 'Too fast — it broke free instead of circling. Ease the speed down until the path closes into a loop.' }));
      this.startChallenge(game);
    }
  }
  cameBack(game) {
    game.sfx.reject();
    import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'It came back around',
      sub: 'Still captured — a bound orbit always returns. Add more speed: escape is about √2 × the circular speed.' }));
    this.startChallenge(game);
  }
  orbited(game) {
    game.sfx.win(); game.state.feltOrbit = true; game.persist();
    this.phase = 'done';
    import('../ui/hud.js').then(UI => {
      UI.toast(game, { kind: 'win', title: 'In orbit', sub: 'It’s falling the whole time — but moving sideways so fast the world curves away just as quickly. It never lands.' });
      UI.flash('That’s an orbit: endless falling, endlessly missing the ground.');
    });
    setTimeout(() => this.clearChallenge(game), 1200);
  }
  keplerDone(game) {
    this.phase = 'reveal';
    const gd = this.guess ? Math.hypot(this.guess.x - this.peri.x, this.guess.y - this.peri.y) : 999;
    import('../ui/hud.js').then(UI => {
      if (gd < 60) { game.awardReason(); game.state.predictedRight.orbit = true; UI.toast(game, { kind: 'win', title: 'You called it — fastest at its closest', sub: 'A moon or planet races at its nearest point and dawdles when far. Equal areas in equal times (Kepler).' }); }
      else UI.toast(game, { kind: 'fail', title: 'Fastest when CLOSEST', sub: 'It moves quickest at the point nearest the world, and slowest when far out — gravity is strongest up close. (Kepler’s 2nd law.)' });
    });
  }

  // The flagship cross-stage refusal. A forward burn DID raise the orbit — but at the new high
  // point the craft is moving SLOWER than before, not faster. Honest framing per curriculum §5:
  // the burn added a brief speed boost, but that energy went into HEIGHT; up high, with the same
  // bound orbit, the speed is lower than the circle it left. (Climbed higher → arrived slower.)
  climbDone(game) {
    this.phase = 'reveal'; game.sfx.win();
    const climbed = this.peakR > this.r0 * 1.05;
    const slower = this.apoSpeed != null && this.apoSpeed < this.startSpeed;
    import('../ui/hud.js').then(UI => {
      if (this.guess === 'slower') {
        game.awardReason(); game.state.predictedRight.orbit = true;
        UI.toast(game, { kind: 'win', title: 'You called it — slower up high',
          sub: 'Counter-intuitive but true: the forward burn lifted it to a higher orbit, and up there it moves SLOWER, not faster. The extra push turned into HEIGHT, not lasting speed — climb traded speed for altitude.' });
      } else {
        UI.toast(game, { kind: 'fail', title: 'You sped up — then you slowed and dropped back',
          sub: 'The burn gave a quick boost, but it climbed to a higher orbit and arrived SLOWER than it started — then falls back. To go up you slow down; the push became HEIGHT, not speed. (That’s the orbit paradox.)' });
      }
      UI.flash(climbed && slower ? 'Thrust to climb → you end up higher AND slower. Speed became height.' : 'Watch: it climbed, then slowed at the top.');
    });
  }

  // ---------- render ----------
  render(ctx, game) {
    const t = game.time;
    this.drawPlanet(ctx, t);

    // ellipse / target path
    if (this.type === 'kepler') this.drawPath(ctx, this.path, hexA(COL, 0.4));

    // aim preview, coloured by outcome
    if (this.phase === 'aim' && this.aiming && this.preview) {
      const end = this.preview.end;
      const c = end === 'crash' ? CRASHC : end === 'escape' ? ESCC : COL;
      this.drawPath(ctx, this.preview, hexA(c, 0.7));
      const v = this.aimVel();
      if (v) { const mag = Math.min(70, 20 + v.speed * 0.18);
        drawArrow(ctx, this.start.x, this.start.y, this.start.x + v.vx / v.speed * mag, this.start.y + v.vy / v.speed * mag, '#fff', { width: 3, head: 10 });
        label(ctx, this.start.x, this.start.y - 26, `${(v.speed / this.vCirc).toFixed(2)}× circular`, { color: c, size: 12 }); }
    }

    // live trail, brighter where faster (Kepler made visible)
    for (const d of this.trail) { const f = Math.min(1, d.sp / (this.vCirc * 1.8)); drawTrailDot(ctx, d.x, d.y, 4 + f * 4, COL, 0.3 + f * 0.5); }

    // guess marker (kepler)
    if (this.type === 'kepler' && this.guess) drawRing(ctx, this.guess.x, this.guess.y, 16, ESCC, { time: t, dash: true });
    // reveal the true fastest point (kepler only)
    if (this.type === 'kepler' && this.phase === 'reveal') { drawRing(ctx, this.peri.x, this.peri.y, 18, '#fff', { time: t, lit: true });
      label(ctx, this.peri.x, this.peri.y - 28, 'fastest here', { color: '#fff', size: 12 }); }

    // climb refusal: starting-circle reference + live speed vs the original circular speed
    if (this.type === 'climb') {
      drawRing(ctx, this.planet.x, this.planet.y, this.r0, hexA(COL, 0.18), { time: t });   // the orbit it left
      const sp = Math.hypot(this.mote.vx, this.mote.vy);
      const ratio = sp / this.startSpeed;
      const col = ratio < 0.99 ? ESCC : COL;                  // gold once it has actually SLOWED
      label(ctx, this.mote.x, this.mote.y - 26, `${ratio.toFixed(2)}× start speed`, { color: col, size: 12 });
      if (this.phase === 'predict') {
        label(ctx, game.W / 2, this.chips[0].y - 44, 'Thrust forward to climb to a higher orbit.', { color: 'rgba(255,255,255,.8)', size: 12.5 });
        label(ctx, game.W / 2, this.chips[0].y - 24, 'Faster or slower up there?', { color: '#fff', size: 14 });
        for (const c of this.chips) this.drawClimbChip(ctx, c);
      } else if (this.phase === 'run' && this.burned) {
        label(ctx, game.W / 2, game.H * 0.9, 'climbing — watch the speed…', { color: hexA(COL, 0.8), size: 12.5 });
      }
    }

    // the mote
    if (this.phase !== 'done' || this.type === 'escape') drawMote(ctx, this.mote.x, this.mote.y, 11, COL, { time: t, pulse: this.phase === 'aim' ? 1 : 0 });

    // prompts
    if (this.phase === 'aim' && !this.aiming) label(ctx, this.start.x, this.start.y - 30, 'drag to fling →', { color: hexA(COL, 0.8), size: 12.5 });
    if (this.type === 'kepler' && this.phase === 'predict') label(ctx, game.W / 2, game.H * 0.9, 'tap the fastest point on the loop', { color: '#fff', size: 13.5 });
    if (this.phase === 'reveal') label(ctx, game.W / 2, game.H * 0.9, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
  }

  drawPlanet(ctx, t) {
    const p = this.planet;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, p.R * 0.4, p.x, p.y, p.R * 2.6);
    g.addColorStop(0, hexA(PLANET, 0.5)); g.addColorStop(1, hexA(PLANET, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.R * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    const g2 = ctx.createRadialGradient(p.x - p.R * 0.3, p.y - p.R * 0.3, p.R * 0.2, p.x, p.y, p.R);
    g2.addColorStop(0, '#cfe0ff'); g2.addColorStop(1, '#3a5aa8');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(p.x, p.y, p.R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  drawPath(ctx, pts, color) {
    if (!pts || pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke(); ctx.restore();
  }

  // live formula: circular-orbit speed, and the escape relation in the escape challenge
  mathLayer(game) {
    if (this.phase === 'done') return null;
    if (this.type === 'climb' && this.phase === 'predict') return null;   // the chips live here — don't cover them
    if (this.type === 'escape') {
      return { x: game.W / 2, y: game.H * 0.88, size: 21, cells: [
        { sym: 'v', sub: 'esc', color: '#ffd66b' }, { op: '=' }, { txt: '√2', color: '#ffffff' }, { op: '·' },
        { sym: 'v', sub: 'c', color: '#aef0ff' }, { op: '≈' }, { txt: '1.41×', color: '#ffd66b' },
      ] };
    }
    return { x: game.W / 2, y: game.H * 0.88, size: 21, cells: [
      { sym: 'v', sub: 'c', color: '#aef0ff' }, { op: '=' },
      { sqrt: [{ frac: { num: [{ sym: 'G' }, { sym: 'M' }], den: [{ sym: 'r' }] }, color: '#cfe0ff' }] },
    ] };
  }

  objectives(game) {
    const n = this.challenges.length;
    return {
      title: `Orbit — challenge ${Math.min(this.ci + 1, n)} / ${n}`,
      goals: [
        { text: this.challenges[this.ci].prompt, done: this.phase === 'done' || this.phase === 'reveal' },
        { text: 'See that an orbit is endless falling', done: game.state.feltOrbit },
      ],
    };
  }
}
