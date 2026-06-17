// fall.js — Stage 2: a world appears and pulls. The centerpiece.
// Lessons FELT: (1) heavy and light fall the SAME; (2) the widening trail = acceleration.
import { drawMote, drawTrailDot, drawGround, label, hexA } from '../render/draw.js';
import { G } from '../physics/sim.js';

const HEAVY = '#ffb27a', LIGHT = '#6be4ff', GROUND = '#7a6bff';
const STROBE = 0.13;          // seconds between after-images
const DROP_M = 24;            // metres of fall

export class FallScene {
  constructor() { this.title = 'Fall'; this.id = 'fall'; }

  enter(game) { this.layout(game); this.reset(game); }
  resize(game) { this.layout(game); this.buildChips(game); }

  layout(game) {
    const W = game.W, H = game.H;
    this.topY = H * 0.20; this.groundY = H * 0.80;
    this.pxPerM = (this.groundY - this.topY) / DROP_M;
    this.hx = W * 0.36; this.lx = W * 0.64;     // heavy / light columns
    this.tLand = Math.sqrt(2 * DROP_M / G);     // ~2.21s
  }

  reset(game) {
    this.phase = 'predict';     // predict | drop | land
    this.guess = null; this.dropT = 0;
    this.buildChips(game);
    game.refreshGoals();
  }

  buildChips(game) {
    const W = game.W, cy = game.H * 0.90, h = 40;
    if (game.state.predictMode) {
      const labels = [['heavy', 'Heavy first'], ['same', 'Same time'], ['light', 'Light first']];
      const w = Math.min(120, (W - 40) / 3 - 8);
      const total = w * 3 + 16; let x = (W - total) / 2;
      this.chips = labels.map(([id, label]) => { const c = { id, label, x, y: cy - h / 2, w, h }; x += w + 8; return c; });
    } else {
      const w = 160; this.chips = [{ id: 'drop', label: 'Drop ▼', x: (W - w) / 2, y: cy - h / 2, w, h }];
    }
  }

  onDown(x, y, game) {
    if (this.phase === 'predict') {
      for (const c of this.chips) {
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          this.guess = c.id === 'drop' ? null : c.id;
          game.sfx.pickup();
          this.phase = 'drop'; this.dropT = 0;
          game.refreshGoals();
          return;
        }
      }
    } else if (this.phase === 'land') {
      game.completeStage('fall');
    }
  }

  update(dt, game) {
    if (this.phase !== 'drop') return;
    this.dropT += dt;
    if (this.dropT >= this.tLand) {
      this.dropT = this.tLand;
      this.phase = 'land';
      game.state.feltFall = true; game.persist();
      game.sfx.land();
      const gy = this.groundY;
      game.gl.burst(this.hx, gy, 22, { color: [1, 0.7, 0.48], speed: 150, size: 16, life: 0.7, alpha: 0.85 });
      game.gl.burst(this.lx, gy, 18, { color: [0.42, 0.9, 1], speed: 150, size: 14, life: 0.7, alpha: 0.85 });
      game.refreshGoals();
      import('../ui/hud.js').then(UI => {
        if (this.guess === 'same' || this.guess === null) {
          if (this.guess === 'same') game.award(8);
          UI.toast(game, { kind: 'win', title: 'They touched down together',
            sub: 'Mass doesn’t change the fall — gravity adds speed to every mass equally.' });
        } else {
          UI.toast(game, { kind: 'fail', title: `You called the ${this.guess} one`,
            sub: 'But watch the landing — they hit the ground at the very same instant. The heavy one is pulled harder, yet it’s also harder to speed up. The two cancel exactly.' });
        }
        UI.flash('Look at the trail: the gaps grow each beat — that growing gap IS acceleration.');
      });
    }
  }

  // height fallen (px) at elapsed time t
  fallenPx(t) { return Math.min(DROP_M, 0.5 * G * t * t) * this.pxPerM; }

  render(ctx, game) {
    const t = game.time;
    drawGround(ctx, game.W, this.groundY, GROUND);

    // strobe after-images up to current time (both columns) — the spreading dots
    if (this.phase === 'drop' || this.phase === 'land') {
      for (let k = 1; ; k++) {
        const tk = k * STROBE; if (tk > this.dropT) break;
        const y = this.topY + this.fallenPx(tk);
        drawTrailDot(ctx, this.hx, y, 9, HEAVY, 0.5);
        drawTrailDot(ctx, this.lx, y, 7, LIGHT, 0.5);
      }
    }
    // widening-gap callout after landing
    if (this.phase === 'land') {
      ctx.save(); ctx.strokeStyle = hexA('#ffffff', 0.35); ctx.lineWidth = 1;
      let prev = null;
      for (let k = 1; ; k++) {
        const tk = k * STROBE; if (tk > this.tLand) break;
        const y = this.topY + this.fallenPx(tk);
        if (prev != null) { ctx.beginPath(); ctx.moveTo(game.W * 0.5, prev); ctx.lineTo(game.W * 0.5, y); ctx.stroke(); }
        prev = y;
      }
      ctx.restore();
      label(ctx, game.W * 0.5, this.topY - 12, 'equal time, growing gaps', { color: 'rgba(255,255,255,.55)', size: 11.5 });
    }

    // the two motes (heavy bigger, light smaller) — fall identically
    const yNow = this.phase === 'predict' ? this.topY : this.topY + this.fallenPx(this.dropT);
    drawMote(ctx, this.hx, yNow, 17, HEAVY, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    drawMote(ctx, this.lx, yNow, 10, LIGHT, { time: t, pulse: this.phase === 'predict' ? 1 : 0 });
    label(ctx, this.hx, yNow - 30, 'heavy', { color: hexA(HEAVY, 0.85), size: 12 });
    label(ctx, this.lx, yNow - 24, 'light', { color: hexA(LIGHT, 0.85), size: 12 });

    // prediction chips
    if (this.phase === 'predict') {
      label(ctx, game.W / 2, this.chips[0].y - 22, game.state.predictMode ? 'Which one lands first?' : 'Release them together', { size: 15, color: '#fff' });
      for (const c of this.chips) this.drawChip(ctx, c);
    } else if (this.phase === 'land') {
      label(ctx, game.W / 2, this.groundY + 40, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
    }
  }

  drawChip(ctx, c) {
    ctx.save();
    const r = 13;
    ctx.beginPath();
    ctx.moveTo(c.x + r, c.y); ctx.arcTo(c.x + c.w, c.y, c.x + c.w, c.y + c.h, r);
    ctx.arcTo(c.x + c.w, c.y + c.h, c.x, c.y + c.h, r); ctx.arcTo(c.x, c.y + c.h, c.x, c.y, r);
    ctx.arcTo(c.x, c.y, c.x + c.w, c.y, r); ctx.closePath();
    ctx.fillStyle = 'rgba(110,228,255,.12)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(110,228,255,.5)'; ctx.stroke();
    ctx.fillStyle = '#eaf2ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 13.5px "Outfit", system-ui, sans-serif';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2);
    ctx.restore();
  }

  objectives(game) {
    return {
      title: 'Fall — who lands first?',
      goals: [
        { text: 'Predict which mote lands first, then drop them', done: this.phase === 'land' || game.state.stagesDone.fall },
        { text: 'Watch the after-image trail spread out', sub: 'spreading = speeding up', done: game.state.feltFall },
      ],
    };
  }
}
