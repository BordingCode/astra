// force.js — Stage 4: Newton's 2nd & 3rd laws, in three challenges.
//   1) RACE   — same push on heavy vs light: a = F/m (this CHALLENGES Fall's "they tie").
//   2) DOCK   — hold a thrust: a steady force keeps ADDING speed; you must push back to stop.
//   3) RECOIL — no engine: throw mass one way, recoil the other (every push pushes back).
import { drawMote, drawTrailDot, drawRing, drawTarget, drawArrow, label, hexA } from '../render/draw.js';

const HEAVY = '#ffb27a', LIGHT = '#6be4ff', ACC = '#ff9a6b';
const STROBE = 0.13;

export class ForceScene {
  constructor() {
    this.title = 'Force'; this.id = 'force';
    this.challenges = [
      { type: 'race',   prompt: 'Same push, two masses — which reaches the line first?' },
      { type: 'dock',   prompt: 'Hold a thrust to dock gently on the pad' },
      { type: 'recoil', prompt: 'No engine — throw mass away to move yourself to the gate' },
    ];
  }

  enter(game) {
    this.layout(game);
    this.ci = Math.min(game.state.progress.force || 0, this.challenges.length - 1);
    this.startChallenge(game);
  }
  resize(game) { this.layout(game); this.startChallenge(game); }

  layout(game) {
    const W = game.W, H = game.H;
    // race
    this.startX = W * 0.16; this.finishX = W * 0.86;
    this.laneH = H * 0.42; this.laneL = H * 0.56;
    this.raceDist = 13;                                   // metres
    this.racePxM = (this.finishX - this.startX) / this.raceDist;
    this.F = 8;                                           // newtons (same push on both)
    // dock
    this.trackY = H * 0.46; this.dockStartX = W * 0.15; this.dockX = W * 0.80; this.dockR = 34;
    this.btnL = { x: 14, y: H * 0.80, w: 132, h: 56, label: '◀ Push' };
    this.btnR = { x: W - 146, y: H * 0.80, w: 132, h: 56, label: 'Push ▶' };
    // recoil
    this.rStart = { x: W * 0.30, y: H * 0.40 };
    this.rGate = { x: W * 0.78, y: H * 0.60, r: 30 };
  }

  startChallenge(game) {
    const c = this.challenges[this.ci]; this.type = c.type;
    if (this.type === 'race') {
      this.phase = 'predict'; this.guess = null; this.t = 0;
      this.buildChips(game);
    } else if (this.type === 'dock') {
      this.phase = 'play'; this.mote = { x: this.dockStartX, v: 0 }; this.thrustDir = 0; this.held = null;
    } else if (this.type === 'recoil') {
      this.phase = 'play'; this.mote = { x: this.rStart.x, y: this.rStart.y, vx: 0, vy: 0 };
      this.throwsLeft = 7; this.puffs = [];
    }
    game.refreshGoals();
  }

  buildChips(game) {
    const W = game.W, cy = game.H * 0.90, h = 40;
    if (game.state.predictMode) {
      const labels = [['heavy', 'Heavy first'], ['same', 'Same time'], ['light', 'Light first']];
      const w = Math.min(120, (W - 40) / 3 - 8); const total = w * 3 + 16; let x = (W - total) / 2;
      this.chips = labels.map(([id, label]) => { const c = { id, label, x, y: cy - h / 2, w, h }; x += w + 8; return c; });
    } else {
      const w = 160; this.chips = [{ id: 'go', label: 'Push both ▶', x: (W - w) / 2, y: cy - h / 2, w, h }];
    }
  }

  // advance past the current challenge; the stage's lesson fires only after the last one
  clearChallenge(game) {
    const last = this.ci >= this.challenges.length - 1;
    game.noteProgress('force', this.ci + 1);
    if (last) {
      game.state.feltForce = true; game.persist();
      game.completeStage('force');
    } else {
      game.award(6); this.ci++;
      import('../ui/hud.js').then(UI => UI.flash('Challenge cleared — next one.'));
      this.startChallenge(game);
    }
  }

  // ---------- input ----------
  onDown(x, y, game) {
    if (this.type === 'race') {
      if (this.phase === 'predict') {
        for (const c of this.chips) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          this.guess = c.id === 'go' ? null : c.id; game.sfx.pickup(); this.phase = 'run'; this.t = 0; game.refreshGoals(); return;
        }
      } else if (this.phase === 'done') { this.clearChallenge(game); }
    } else if (this.type === 'dock') {
      if (this.phase !== 'play') return;
      if (this.hit(this.btnL, x, y)) { this.thrustDir = -1; this.held = 'L'; game.sfx.tick(); }
      else if (this.hit(this.btnR, x, y)) { this.thrustDir = 1; this.held = 'R'; game.sfx.tick(); }
    } else if (this.type === 'recoil') {
      if (this.phase !== 'play' || this.throwsLeft <= 0) return;
      // throw mass toward the tap; recoil pushes the mote the opposite way
      const dx = this.mote.x - x, dy = this.mote.y - y; const d = Math.hypot(dx, dy) || 1;
      const imp = 120;
      this.mote.vx += dx / d * imp; this.mote.vy += dy / d * imp;
      this.puffs.push({ x: this.mote.x, y: this.mote.y, vx: -dx / d * 220, vy: -dy / d * 220, life: 0.7 });
      this.throwsLeft--; game.sfx.launch();
      game.refreshGoals();
    }
  }
  onMove() {}
  onUp() { if (this.type === 'dock') { this.thrustDir = 0; this.held = null; } }
  hit(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }

  // ---------- update ----------
  update(dt, game) {
    if (this.type === 'race' && this.phase === 'run') {
      this.t += dt;
      const aL = this.F / 1, aH = this.F / 3;
      const dL = 0.5 * aL * this.t * this.t, dH = 0.5 * aH * this.t * this.t;
      if (dL * this.racePxM >= (this.finishX - this.startX)) {
        this.t = Math.sqrt(2 * this.raceDist / aL);     // exact finish time for the light one
        this.phase = 'done'; game.sfx.land();
        game.gl.burst(this.finishX, this.laneL, 20, { color: [0.42, 0.9, 1], speed: 140, size: 14, life: 0.7, alpha: 0.85 });
        import('../ui/hud.js').then(UI => {
          if (this.guess === 'light' || this.guess === null) {
            if (this.guess === 'light') game.award(8);
            UI.toast(game, { kind: 'win', title: 'The light one wins',
              sub: 'Same push, but a = F ÷ m — less mass means more acceleration. The heavy one is sluggish.' });
          } else if (this.guess === 'same') {
            UI.toast(game, { kind: 'fail', title: 'Not the same this time',
              sub: 'In Fall they tied — but that was gravity, which pulls heavier things harder in exact step. A plain push gets no such help: a = F ÷ m, so the light one pulls ahead.' });
          } else {
            UI.toast(game, { kind: 'fail', title: 'The heavy one is the slow one',
              sub: 'More mass resists the same push more. a = F ÷ m — double the mass, half the acceleration.' });
          }
        });
        game.refreshGoals();
      }
    } else if (this.type === 'dock' && this.phase === 'play') {
      const A = 300;                                      // px/s² while thrusting
      this.mote.v += this.thrustDir * A * dt;             // velocity first (Euler–Cromer)
      this.mote.x += this.mote.v * dt;
      const onPad = Math.abs(this.mote.x - this.dockX) < this.dockR;
      if (onPad && Math.abs(this.mote.v) < 46) {
        this.phase = 'done'; game.sfx.win(); game.celebrate(this.dockX, this.trackY, [1, 0.7, 0.42]);
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'win', title: 'Docked',
          sub: 'A steady push never sets a speed — it keeps adding it. To stop, you had to push back the other way.' }));
        setTimeout(() => this.clearChallenge(game), 900);
      } else if (this.mote.x < -60 || this.mote.x > game.W + 60) {
        game.sfx.reject();
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'Sailed past the pad',
          sub: 'No friction to save you — a forward push only speeds you up. Push the OTHER way in time to slow down.' }));
        this.startChallenge(game);
      }
    } else if (this.type === 'recoil' && this.phase === 'play') {
      this.mote.x += this.mote.vx * dt; this.mote.y += this.mote.vy * dt;
      for (const p of this.puffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      this.puffs = this.puffs.filter(p => p.life > 0);
      if (Math.hypot(this.mote.x - this.rGate.x, this.mote.y - this.rGate.y) < this.rGate.r) {
        this.phase = 'done'; game.sfx.win(); game.celebrate(this.rGate.x, this.rGate.y, [1, 0.6, 0.42]);
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'win', title: 'You moved yourself',
          sub: 'Nothing to push against — yet throwing mass one way drove you the other. Every push pushes back. That’s a rocket.' }));
        setTimeout(() => this.clearChallenge(game), 900);
      } else {
        const m = 70;
        if ((this.mote.x < -m || this.mote.x > game.W + m || this.mote.y < -m || this.mote.y > game.H + m) || (this.throwsLeft <= 0 && Math.hypot(this.mote.vx, this.mote.vy) < 6)) {
          game.sfx.reject();
          import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'Out of mass to throw',
            sub: 'Each throw shoves you the opposite way and the pushes add up. Aim your throws so the recoil carries you to the gate.' }));
          this.startChallenge(game);
        }
      }
    }
  }

  // ---------- render ----------
  render(ctx, game) {
    const t = game.time;
    if (this.type === 'race') this.renderRace(ctx, game, t);
    else if (this.type === 'dock') this.renderDock(ctx, game, t);
    else if (this.type === 'recoil') this.renderRecoil(ctx, game, t);
  }

  renderRace(ctx, game, t) {
    // finish line
    ctx.save(); ctx.strokeStyle = hexA('#ffffff', 0.5); ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(this.finishX, this.laneH - 50); ctx.lineTo(this.finishX, this.laneL + 50); ctx.stroke(); ctx.restore();
    label(ctx, this.finishX, this.laneH - 64, 'finish', { color: 'rgba(255,255,255,.6)', size: 11.5 });

    const aL = this.F / 1, aH = this.F / 3;
    const xH = this.startX + Math.min(this.finishX - this.startX, 0.5 * aH * this.t * this.t * this.racePxM);
    const xL = this.startX + Math.min(this.finishX - this.startX, 0.5 * aL * this.t * this.t * this.racePxM);
    // strobe trails (both speed up; the light one's gaps widen faster)
    if (this.phase === 'run' || this.phase === 'done') {
      for (let k = 1; ; k++) { const tk = k * STROBE; if (tk > this.t) break;
        drawTrailDot(ctx, this.startX + 0.5 * aH * tk * tk * this.racePxM, this.laneH, 8, HEAVY, 0.5);
        drawTrailDot(ctx, this.startX + 0.5 * aL * tk * tk * this.racePxM, this.laneL, 8, LIGHT, 0.5);
      }
    }
    // constant push arrows
    if (this.phase !== 'predict') {
      drawArrow(ctx, xH - 34, this.laneH, xH - 10, this.laneH, ACC, { width: 3, head: 9, alpha: 0.9 });
      drawArrow(ctx, xL - 34, this.laneL, xL - 10, this.laneL, ACC, { width: 3, head: 9, alpha: 0.9 });
    }
    drawMote(ctx, xH, this.laneH, 17, HEAVY, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    drawMote(ctx, xL, this.laneL, 10, LIGHT, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    label(ctx, xH, this.laneH - 30, 'heavy · m = 3', { color: hexA(HEAVY, 0.85), size: 12 });
    label(ctx, xL, this.laneL - 24, 'light · m = 1', { color: hexA(LIGHT, 0.85), size: 12 });
    // each mote's live acceleration: same push F, but a = F/m → light accelerates more
    if (game.state.showMath && this.phase !== 'predict') {
      label(ctx, xH, this.laneH + 32, `a = ${aH.toFixed(1)} m/s²`, { color: hexA(HEAVY, 0.95), size: 12.5 });
      label(ctx, xL, this.laneL + 28, `a = ${aL.toFixed(1)} m/s²`, { color: hexA(LIGHT, 0.95), size: 12.5 });
    }

    if (this.phase === 'predict') {
      label(ctx, game.W / 2, this.chips[0].y - 22, game.state.predictMode ? 'Same push on both — who reaches the line first?' : 'Give both the same push', { size: 14.5, color: '#fff' });
      for (const c of this.chips) this.drawChip(ctx, c);
    } else if (this.phase === 'done') {
      label(ctx, game.W / 2, game.H * 0.90, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
    }
  }

  renderDock(ctx, game, t) {
    drawTarget(ctx, this.dockX, this.trackY, 18, '#ffd66b', { time: t });
    label(ctx, this.dockX, this.trackY - 40, 'DOCK', { color: 'rgba(255,214,107,.85)', size: 12 });
    // mote + velocity arrow + speed readout
    const m = this.mote;
    if (Math.abs(m.v) > 2) {
      const dir = Math.sign(m.v), mag = Math.min(70, 14 + Math.abs(m.v) * 0.12);
      drawArrow(ctx, m.x, this.trackY, m.x + dir * mag, this.trackY, '#fff', { width: 3, head: 10 });
    }
    drawMote(ctx, m.x, this.trackY, 13, ACC, { time: t, pulse: this.thrustDir ? 1 : 0 });
    label(ctx, m.x, this.trackY - 30, `${(Math.abs(m.v) / 24).toFixed(1)} m/s`, { color: 'rgba(255,255,255,.8)', size: 12 });
    // thrust buttons
    this.drawBtn(ctx, this.btnL, this.held === 'L');
    this.drawBtn(ctx, this.btnR, this.held === 'R');
    if (this.phase === 'play') label(ctx, game.W / 2, this.trackY - 80, 'Hold a side to thrust — coast, then push back to stop', { size: 13, color: '#fff' });
  }

  renderRecoil(ctx, game, t) {
    drawRing(ctx, this.rGate.x, this.rGate.y, this.rGate.r, '#ffd66b', { time: t });
    label(ctx, this.rGate.x, this.rGate.y - this.rGate.r - 14, 'reach the gate', { color: 'rgba(255,214,107,.8)', size: 11.5 });
    // expelled mass puffs (flying the opposite way to the recoil)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.puffs) { ctx.globalAlpha = Math.max(0, p.life / 0.7) * 0.8;
      ctx.fillStyle = hexA('#ffcaa0', 0.9); ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    drawMote(ctx, this.mote.x, this.mote.y, 13, ACC, { time: t, pulse: 1 });
    label(ctx, this.mote.x, this.mote.y - 30, `${this.throwsLeft} throws`, { color: 'rgba(255,255,255,.8)', size: 12 });
    if (this.phase === 'play') label(ctx, game.W / 2, game.H * 0.88, 'Tap to throw mass away — you recoil the opposite way', { size: 13, color: '#fff' });
  }

  drawChip(ctx, c) {
    ctx.save(); const r = 13;
    ctx.beginPath();
    ctx.moveTo(c.x + r, c.y); ctx.arcTo(c.x + c.w, c.y, c.x + c.w, c.y + c.h, r);
    ctx.arcTo(c.x + c.w, c.y + c.h, c.x, c.y + c.h, r); ctx.arcTo(c.x, c.y + c.h, c.x, c.y, r);
    ctx.arcTo(c.x, c.y, c.x + c.w, c.y, r); ctx.closePath();
    ctx.fillStyle = 'rgba(255,154,107,.14)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,154,107,.5)'; ctx.stroke();
    ctx.fillStyle = '#ffe8da'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 13.5px "Outfit", system-ui, sans-serif';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2); ctx.restore();
  }
  drawBtn(ctx, b, held) {
    ctx.save(); const r = 16;
    ctx.beginPath();
    ctx.moveTo(b.x + r, b.y); ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, r);
    ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, r); ctx.arcTo(b.x, b.y + b.h, b.x, b.y, r);
    ctx.arcTo(b.x, b.y, b.x + b.w, b.y, r); ctx.closePath();
    ctx.fillStyle = held ? 'rgba(255,154,107,.32)' : 'rgba(255,154,107,.12)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,154,107,.6)'; ctx.stroke();
    ctx.fillStyle = '#ffe8da'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 16px "Outfit", system-ui, sans-serif';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2); ctx.restore();
  }

  // live formula: a = F ÷ m  (same push F on both; bigger m → smaller a)
  mathLayer(game) {
    if (this.type !== 'race' || this.phase === 'predict') return null;
    return { x: game.W / 2, y: game.H * 0.70, size: 24, cells: [
      { sym: 'a', color: '#aef0ff' }, { op: '=' },
      { frac: { num: [{ sym: 'F', val: '8', unit: 'N', color: '#ff9a6b' }], den: [{ sym: 'm', unit: 'kg', color: '#ffffff' }] }, color: '#cfe0ff' },
    ] };
  }

  objectives(game) {
    const n = this.challenges.length;
    return {
      title: `Force — challenge ${Math.min(this.ci + 1, n)} / ${n}`,
      goals: [
        { text: this.challenges[this.ci].prompt, done: this.phase === 'done' },
        { text: 'Learn what a force really changes', sub: 'speed & direction — not position', done: game.state.feltForce },
      ],
    };
  }
}
