// throw.js — Stage 3: push sideways AND let gravity pull down, at once.
// Lesson FELT: two independent motions (steady sideways + accelerating down) = a parabola.
import { drawMote, drawTrailDot, drawGround, drawTarget, drawArrow, label, hexA } from '../render/draw.js';
import { G, projectile } from '../physics/sim.js';

const COL = '#aef0ff', GROUND = '#5fd6a0', TGT = '#ffd66b';
const STROBE = 0.12;
const MAX_SPEED = 26;          // m/s
const TARGET_M = 46;           // metres downrange

export class ThrowScene {
  constructor() { this.title = 'Throw'; this.id = 'throw'; }

  enter(game) { this.layout(game); this.reset(game); }
  resize(game) { this.layout(game); this.reset(game); }

  layout(game) {
    const W = game.W, H = game.H;
    this.groundY = H * 0.80;
    this.padX = W * 0.13;
    this.pxPerM = (W * 0.74) / 70;                  // ~70 m spans the play width
    this.targetX = this.padX + TARGET_M * this.pxPerM;
    this.tolPx = 24;
  }

  reset(game) {
    this.phase = 'aim';            // aim | fly | done
    this.aiming = false; this.aim = null;
    this.shot = null; this.flyT = 0; this.trail = [];
    this.hits = game.state.best.throw || 0;
    game.refreshGoals();
  }

  // convert SI (metres, +y up from pad) → screen px
  sx(xM) { return this.padX + xM * this.pxPerM; }
  sy(yM) { return this.groundY - yM * this.pxPerM; }

  // build a projectile from the current aim drag
  aimShot() {
    if (!this.aim) return null;
    const dx = this.aim.x - this.padX, dy = this.aim.y - this.groundY;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) return null;
    let deg = Math.atan2(-dy, dx) * 180 / Math.PI;   // above horizontal
    deg = Math.max(8, Math.min(82, deg));
    const speed = Math.min(MAX_SPEED, Math.max(6, dist / 7));
    return { deg, speed, proj: projectile({ x: 0, y: 0 }, speed, deg, G) };
  }

  onDown(x, y, game) {
    if (this.phase === 'aim') {
      this.aiming = true; this.aim = { x, y };
      game.coachOnce('throw_aim', { kind: 'hint', title: 'Aim the launch',
        sub: 'Drag to set the angle and the speed, then release. Higher and harder flies farther.' });
    } else if (this.phase === 'done') {
      // tapping after a miss re-arms (handled by reset on miss); ignore here
    }
  }
  onMove(x, y) { if (this.aiming) this.aim = { x, y }; }
  onUp(x, y, game) {
    if (!this.aiming) return;
    this.aiming = false;
    const s = this.aimShot();
    if (!s) { this.aim = null; return; }
    this.shot = s; this.phase = 'fly'; this.flyT = 0; this.trail = [];
    this.tLand = s.proj.flightTimeFlat;
    game.sfx.launch();
  }

  update(dt, game) {
    if (this.phase !== 'fly') return;
    this.flyT += dt;
    const p = this.shot.proj.pos(this.flyT);
    if (this.flyT >= this.tLand) {
      // landed — check against the target
      const land = this.shot.proj.pos(this.tLand);
      const landX = this.sx(land.x);
      const dxPx = landX - this.targetX;
      game.gl.burst(landX, this.groundY, 16, { color: [0.68, 0.94, 1], speed: 130, size: 14, life: 0.6, alpha: 0.8 });
      if (Math.abs(dxPx) < this.tolPx) {
        game.sfx.land(); game.celebrate(this.targetX, this.groundY, [1, 0.84, 0.42]);
        this.phase = 'done';
        const near45 = Math.abs(this.shot.deg - 45) < 7;
        import('../ui/hud.js').then(UI => {
          UI.toast(game, { kind: 'win', title: 'Direct hit',
            sub: 'A parabola: your sideways speed never changed, only the falling sped up. The two together make the curve.' });
          if (near45) UI.flash('Notice: around 45° carries the farthest — the best trade of “out” against “up”.');
        });
        game.completeStage('throw', (game.state.best.throw || 0) + 1);
      } else {
        const over = dxPx > 0;
        game.sfx.reject();
        import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: over ? 'Overshot' : 'Fell short',
          sub: over ? 'Too much range — ease off the speed, or raise the angle past 45° to drop it shorter.'
                    : 'Not enough range — more speed, or aim nearer 45° for the farthest carry.' }));
        this.phase = 'aim'; this.shot = null;
        game.refreshGoals();
      }
      return;
    }
    // strobe breadcrumb
    if (this.trail.length === 0 || this.flyT - this.trail[this.trail.length - 1].t >= STROBE)
      this.trail.push({ x: this.sx(p.x), y: this.sy(p.y), t: this.flyT });
  }

  render(ctx, game) {
    const t = game.time;
    drawGround(ctx, game.W, this.groundY, GROUND);
    drawTarget(ctx, this.targetX, this.groundY, 16, TGT, { time: t });

    // launch pad
    ctx.save(); ctx.fillStyle = hexA('#aef0ff', 0.85);
    ctx.fillRect(this.padX - 16, this.groundY - 6, 32, 8); ctx.restore();

    // predicted arc while aiming (the real parabola for the current aim)
    if (this.phase === 'aim' && this.aiming) {
      const s = this.aimShot();
      if (s) {
        const tEnd = s.proj.flightTimeFlat;
        ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = COL; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const tt = tEnd * i / 40; const p = s.proj.pos(tt);
          const X = this.sx(p.x), Y = this.sy(p.y);
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke(); ctx.restore();
        // launch velocity vector + readout
        const vx = Math.cos(s.deg * Math.PI / 180), vy = Math.sin(s.deg * Math.PI / 180);
        const mag = 20 + s.speed * 2.2;
        drawArrow(ctx, this.padX, this.groundY, this.padX + vx * mag, this.groundY - vy * mag, '#fff', { width: 3, head: 11 });
        label(ctx, this.padX + 4, this.groundY - mag - 22, `${Math.round(s.deg)}°  ·  ${s.speed.toFixed(0)} m/s`,
          { color: '#fff', size: 13, align: 'left' });
      }
    }

    // flight trail (stroboscopic dots — even spacing across, widening vertical drop)
    for (const d of this.trail) drawTrailDot(ctx, d.x, d.y, 6, COL, 0.55);

    // the flying mote
    if (this.phase === 'fly') {
      const p = this.shot.proj.pos(this.flyT);
      drawMote(ctx, this.sx(p.x), this.sy(p.y), 11, COL, { time: t });
    } else if (this.phase === 'aim' && !this.aiming) {
      drawMote(ctx, this.padX, this.groundY - 12, 11, COL, { time: t, pulse: 1 });
      label(ctx, this.padX, this.groundY - 40, 'drag to aim ⤴', { color: hexA(COL, 0.8), size: 12.5 });
    }
  }

  objectives(game) {
    return {
      title: 'Throw — hit the mark',
      goals: [
        { text: 'Land a mote on the glowing target', done: game.state.stagesDone.throw },
        { text: 'Feel the curve: steady across, falling faster down', done: game.state.stagesDone.throw },
      ],
    };
  }
}
