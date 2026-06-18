// light.js — Stage 7 (finale): light as rays & colour. Three challenges.
//   1) REFLECT — bounce a beam off a mirror onto the target (angle in = angle out).
//   2) REFRACT — aim a beam into water: it BENDS because it slows; hit the sunk target.
//   3) PRISM   — split white light into the spectrum (violet bends most). Colour floods in.
//
// Pure geometric optics (no time-stepping). Honest details kept: Snell from the NORMAL,
// frequency/colour unchanged when light slows, white = all colours. Dispersion is gently
// exaggerated so the fan is visible on a phone.
import { drawTrailDot, label, hexA } from '../render/draw.js';

const BEAM = '#fff3c4', MIRROR = '#9fe6ff', WATER = '#3a78c8', TGT = '#ffd66b';
// visible spectrum, violet→red; n exaggerated for a clear fan (real glass spreads ~1.51–1.53)
const SPECTRUM = [
  { c: '#ff4d4d', n: 1.50, name: 'red' },
  { c: '#ff9a3d', n: 1.52 },
  { c: '#ffe24d', n: 1.55 },
  { c: '#5dff7a', n: 1.58 },
  { c: '#4da6ff', n: 1.62 },
  { c: '#b14dff', n: 1.66, name: 'violet' },
];

// --- vector helpers ---
function reflect(dx, dy, nx, ny) { const d = dx * nx + dy * ny; return [dx - 2 * d * nx, dy - 2 * d * ny]; }
function refract(dx, dy, nx, ny, eta) {           // n points AGAINST the incoming ray
  const cosi = -(dx * nx + dy * ny);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;                          // total internal reflection
  const cost = Math.sqrt(k);
  return [eta * dx + (eta * cosi - cost) * nx, eta * dy + (eta * cosi - cost) * ny];
}
// ray (p,d) vs segment (a,b) → distance t along ray, or Infinity
function raySeg(px, py, dx, dy, ax, ay, bx, by) {
  const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return Infinity;
  const t = ((ax - px) * ey - (ay - py) * ex) / den;
  const u = ((ax - px) * dy - (ay - py) * dx) / den;
  return (t > 1e-6 && u >= -0.001 && u <= 1.001) ? t : Infinity;
}
function segDist(px, py, ax, ay, bx, by) {          // point→segment distance
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
  let t = l2 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + ex * t), py - (ay + ey * t));
}

export class LightScene {
  constructor() {
    this.title = 'Light'; this.id = 'light';
    this.challenges = [
      { type: 'reflect', prompt: 'Bounce the beam off the mirror onto the target' },
      { type: 'refract', prompt: 'Aim into the water — it bends — to light the sunk target' },
      { type: 'prism',   prompt: 'Which colour bends the most through the prism?' },
    ];
  }

  enter(game) { this.layout(game); this.ci = Math.min(game.state.progress.light || 0, this.challenges.length - 1); this.startChallenge(game); }
  resize(game) { this.layout(game); this.startChallenge(game); }
  layout(game) { this.W = game.W; this.H = game.H; }

  startChallenge(game) {
    const c = this.challenges[this.ci]; this.type = c.type;
    const W = this.W, H = this.H;
    this.phase = 'aim'; this.aiming = false; this.locked = false; this.guess = null; this.litT = 0;
    if (this.type === 'reflect') {
      this.src = { x: W * 0.16, y: H * 0.70 };
      this.dir = this.norm(0.7, -0.7);
      this.mirror = { a: { x: W * 0.08, y: H * 0.22 }, b: { x: W * 0.92, y: H * 0.22 } };   // mirror across the top
      this.wall = { a: { x: W * 0.5, y: H * 0.45 }, b: { x: W * 0.5, y: H * 0.92 } };        // blocks the direct path
      this.target = { x: W * 0.84, y: H * 0.70, r: 22 };
    } else if (this.type === 'refract') {
      this.src = { x: W * 0.30, y: H * 0.16 };
      this.dir = this.norm(0.45, 0.9);
      this.surfaceY = H * 0.46; this.n1 = 1.0; this.n2 = 1.33;                                // air → water
      this.target = { x: W * 0.70, y: H * 0.80, r: 22 };
    } else if (this.type === 'prism') {
      const cx = W * 0.54, cy = H * 0.5, s = Math.min(W, H) * 0.17;
      this.prism = [{ x: cx, y: cy - s }, { x: cx - s * 0.9, y: cy + s * 0.7 }, { x: cx + s * 0.9, y: cy + s * 0.7 }];
      this.src = { x: W * 0.06, y: cy + s * 0.12 };
      this.dir = this.norm(1, 0);
      this.buildChips(game);
    }
    game.refreshGoals();
  }
  norm(x, y) { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; }

  buildChips(game) {
    const W = game.W, cy = game.H * 0.86, h = 40;
    const labels = [['red', 'Red'], ['same', 'Same'], ['violet', 'Violet']];
    const w = Math.min(110, (W - 40) / 3 - 8); const total = w * 3 + 16; let x = (W - total) / 2;
    this.chips = labels.map(([id, l]) => { const c = { id, label: l, x, y: cy - h / 2, w, h }; x += w + 8; return c; });
  }

  clearChallenge(game) {
    const last = this.ci >= this.challenges.length - 1;
    game.noteProgress('light', this.ci + 1);
    if (last) { game.state.feltLight = true; game.persist(); game.completeStage('light'); }
    else { game.award(6); this.ci++; import('../ui/hud.js').then(UI => UI.flash('Challenge cleared — next one.')); this.startChallenge(game); }
  }

  // ---- ray tracing per challenge ----
  // reflect: from src in dir, bounce off mirror, stop at wall. returns {pts, blocked, angI, angR}
  traceReflect() {
    const pts = [{ x: this.src.x, y: this.src.y }]; let x = this.src.x, y = this.src.y, dx = this.dir.x, dy = this.dir.y;
    let blocked = false, angI = null, angR = null;
    for (let b = 0; b < 4; b++) {
      const tm = raySeg(x, y, dx, dy, this.mirror.a.x, this.mirror.a.y, this.mirror.b.x, this.mirror.b.y);
      const tw = raySeg(x, y, dx, dy, this.wall.a.x, this.wall.a.y, this.wall.b.x, this.wall.b.y);
      const t = Math.min(tm, tw);
      if (!isFinite(t)) { pts.push({ x: x + dx * 2000, y: y + dy * 2000 }); break; }
      const hx = x + dx * t, hy = y + dy * t; pts.push({ x: hx, y: hy });
      if (tw < tm) { blocked = true; break; }
      // reflect off the (horizontal) mirror: normal (0,1). Angle from the normal = acos(|dy|).
      angI = Math.acos(Math.min(1, Math.abs(dy))) * 180 / Math.PI;
      [dx, dy] = reflect(dx, dy, 0, 1); angR = Math.acos(Math.min(1, Math.abs(dy))) * 180 / Math.PI;
      x = hx + dx * 0.01; y = hy + dy * 0.01;
    }
    const hit = !blocked && this.hitsTarget(pts);
    return { pts, blocked, hit, angI, angR };
  }
  // refract: straight to the water surface, bend, continue. returns {pts, hit, angI, angR}
  traceRefract() {
    const s = this.src, dx = this.dir.x, dy = this.dir.y;
    if (dy <= 0.02) return { pts: [{ x: s.x, y: s.y }, { x: s.x + dx * 2000, y: s.y + dy * 2000 }], hit: false };
    const t = (this.surfaceY - s.y) / dy; const px = s.x + dx * t, py = this.surfaceY;
    const angI = Math.acos(Math.min(1, Math.abs(dy))) * 180 / Math.PI;
    const rd = refract(dx, dy, 0, -1, this.n1 / this.n2);
    const pts = [{ x: s.x, y: s.y }, { x: px, y: py }];
    let hit = false, angR = null;
    if (rd) { pts.push({ x: px + rd[0] * 2000, y: py + rd[1] * 2000 }); angR = Math.acos(Math.min(1, Math.abs(rd[1]))) * 180 / Math.PI;
      hit = segDist(this.target.x, this.target.y, pts[1].x, pts[1].y, pts[2].x, pts[2].y) < this.target.r; }
    return { pts, hit, angI, angR };
  }
  hitsTarget(pts) { for (let i = 0; i < pts.length - 1; i++) if (segDist(this.target.x, this.target.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < this.target.r) return true; return false; }

  // prism: trace one colour (index n) through the triangle — entry refraction, exit refraction
  tracePrismColor(n) {
    const s = this.src; let x = s.x, y = s.y, dx = this.dir.x, dy = this.dir.y;
    const tri = this.prism, pts = [{ x, y }];
    const edges = [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]];
    // entry: nearest edge from outside
    let best = Infinity, bi = -1;
    for (let i = 0; i < 3; i++) { const t = raySeg(x, y, dx, dy, edges[i][0].x, edges[i][0].y, edges[i][1].x, edges[i][1].y); if (t < best) { best = t; bi = i; } }
    if (!isFinite(best)) { pts.push({ x: x + dx * 2000, y: y + dy * 2000 }); return pts; }
    x += dx * best; y += dy * best; pts.push({ x, y });
    let nrm = this.edgeNormalToward(edges[bi], x, y, dx, dy);
    let rd = refract(dx, dy, nrm.x, nrm.y, 1 / n); if (!rd) return pts; dx = rd[0]; dy = rd[1];
    x += dx * 0.02; y += dy * 0.02;
    // exit: next edge hit from inside
    best = Infinity; bi = -1;
    for (let i = 0; i < 3; i++) { const t = raySeg(x, y, dx, dy, edges[i][0].x, edges[i][0].y, edges[i][1].x, edges[i][1].y); if (t < best) { best = t; bi = i; } }
    if (!isFinite(best)) { pts.push({ x: x + dx * 2000, y: y + dy * 2000 }); return pts; }
    x += dx * best; y += dy * best; pts.push({ x, y });
    nrm = this.edgeNormalToward(edges[bi], x, y, dx, dy);
    rd = refract(dx, dy, nrm.x, nrm.y, n / 1); if (!rd) { rd = reflect(dx, dy, nrm.x, nrm.y); } // TIR → reflect
    dx = rd[0]; dy = rd[1]; pts.push({ x: x + dx * 1600, y: y + dy * 1600 });
    return pts;
  }
  edgeNormalToward(edge, x, y, dx, dy) {   // unit normal of edge pointing AGAINST the ray dir
    const ex = edge[1].x - edge[0].x, ey = edge[1].y - edge[0].y; let nx = -ey, ny = ex; const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
    if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
    return { x: nx, y: ny };
  }

  // ---- input ----
  onDown(x, y, game) {
    if (this.type === 'prism') {
      if (this.phase === 'aim') { for (const c of this.chips) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.guess = c.id; game.sfx.pickup(); this.phase = 'lit'; this.litT = 0; this.prismReveal(game); return; } }
      else if (this.phase === 'done2') this.clearChallenge(game);
      return;
    }
    if (this.phase === 'aim') { this.aiming = true; this.setDir(x, y);
      game.coachOnce('light_aim', { kind: 'hint', title: 'Aim the beam', sub: 'Drag to point the beam of light. Watch where it bounces or bends.' }); }
  }
  onMove(x, y) { if (this.aiming) this.setDir(x, y); }
  onUp(x, y, game) {
    if (this.type === 'prism' || !this.aiming) return;
    this.aiming = false;
    const res = this.type === 'reflect' ? this.traceReflect() : this.traceRefract();
    if (res.hit) { this.phase = 'done'; this.locked = true; game.sfx.win(); game.celebrate(this.target.x, this.target.y, [1, 0.84, 0.42]);
      import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'win', title: this.type === 'reflect' ? 'Bounced home' : 'Bent on target',
        sub: this.type === 'reflect' ? 'The beam bounced off the mirror at the very same angle it struck — angle in equals angle out.' : 'The beam bent as it crossed into the water — because light slows there. It slows, so it bends toward the straight-down line.' }));
      setTimeout(() => this.clearChallenge(game), 1000);
    } else { game.sfx.reject();
      import('../ui/hud.js').then(UI => UI.toast(game, { kind: 'fail', title: 'Missed', sub: this.type === 'reflect'
        ? (res.blocked ? 'The wall blocked it. Send the beam UP to the mirror and bounce it over the wall.' : 'Adjust the angle — it bounces off the mirror at the same angle it arrives.')
        : 'Remember it BENDS at the surface — aim so the bent beam lands on the target, not the straight line.' }));
    }
  }
  setDir(x, y) { const d = this.norm(x - this.src.x, y - this.src.y); if (Math.hypot(x - this.src.x, y - this.src.y) > 8) this.dir = d; }

  prismReveal(game) {
    const correct = this.guess === 'violet';
    import('../ui/hud.js').then(UI => {
      if (correct) { game.awardReason(); game.state.predictedRight.light = true; UI.toast(game, { kind: 'win', title: 'You called it — violet', sub: 'White light is every colour at once. The prism bends violet hardest and red least — so they fan apart into a rainbow.' }); }
      else UI.toast(game, { kind: 'fail', title: 'Violet bends the most', sub: 'Each colour bends a little differently — violet most, red least. That spread is what fans white light into a rainbow.' });
      UI.flash('White light was every colour all along — now you can see them.');
    });
  }

  update(dt, game) {
    if (this.phase === 'lit') { this.litT += dt; if (this.litT > 1.6) this.phase = 'done2'; }
  }

  // ---- render ----
  render(ctx, game) {
    const t = game.time;
    if (this.type === 'reflect') this.renderReflect(ctx, game, t);
    else if (this.type === 'refract') this.renderRefract(ctx, game, t);
    else this.renderPrism(ctx, game, t);
  }

  beam(ctx, pts, color, glow = 14) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = glow; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    ctx.restore();
  }
  source(ctx, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(this.src.x, this.src.y, 0, this.src.x, this.src.y, 22);
    g.addColorStop(0, '#fff'); g.addColorStop(1, hexA(BEAM, 0)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.src.x, this.src.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  drawTarget(ctx, tg, lit, t) { ctx.save(); ctx.translate(tg.x, tg.y); ctx.globalCompositeOperation = 'lighter';
    const r = tg.r * (1 + 0.1 * Math.sin(t * 4)); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
    g.addColorStop(0, hexA(lit ? '#ffffff' : TGT, lit ? 0.8 : 0.35)); g.addColorStop(1, hexA(TGT, 0)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hexA(TGT, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, tg.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }

  renderReflect(ctx, game, t) {
    // mirror
    ctx.save(); ctx.strokeStyle = MIRROR; ctx.lineWidth = 4; ctx.shadowColor = MIRROR; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(this.mirror.a.x, this.mirror.a.y); ctx.lineTo(this.mirror.b.x, this.mirror.b.y); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.shadowBlur = 0; ctx.strokeStyle = hexA(MIRROR, 0.4);
    for (let x = this.mirror.a.x; x < this.mirror.b.x; x += 14) { ctx.beginPath(); ctx.moveTo(x, this.mirror.a.y); ctx.lineTo(x - 8, this.mirror.a.y - 8); ctx.stroke(); }
    ctx.restore();
    // wall
    ctx.save(); ctx.strokeStyle = '#ff9a8a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(this.wall.a.x, this.wall.a.y); ctx.lineTo(this.wall.b.x, this.wall.b.y); ctx.stroke(); ctx.restore();
    const res = this.traceReflect();
    const onTarget = this.aiming && res.hit;                 // telegraph success while aiming
    this.drawTarget(ctx, this.target, this.locked || onTarget, t);
    this.beam(ctx, res.pts, this.locked || onTarget ? '#7dffb0' : BEAM, onTarget ? 20 : 14);
    this.source(ctx, t);
    if (this.phase !== 'done') label(ctx, this.src.x - 8, this.src.y - 26, 'drag to aim the beam', { color: hexA(BEAM, 0.8), size: 12, align: 'left' });
  }

  renderRefract(ctx, game, t) {
    // water
    ctx.save(); const g = ctx.createLinearGradient(0, this.surfaceY, 0, game.H);
    g.addColorStop(0, hexA(WATER, 0.32)); g.addColorStop(1, hexA(WATER, 0.12)); ctx.fillStyle = g;
    ctx.fillRect(0, this.surfaceY, game.W, game.H - this.surfaceY);
    ctx.strokeStyle = hexA('#aee0ff', 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, this.surfaceY); ctx.lineTo(game.W, this.surfaceY); ctx.stroke();
    ctx.restore();
    label(ctx, game.W * 0.12, this.surfaceY - 14, 'air', { color: 'rgba(255,255,255,.5)', size: 11 });
    label(ctx, game.W * 0.12, this.surfaceY + 18, 'water', { color: hexA('#aee0ff', .7), size: 11 });
    const res = this.traceRefract();
    const onTarget = this.aiming && res.hit;                 // telegraph success while aiming
    this.drawTarget(ctx, this.target, this.locked || onTarget, t);
    // draw the normal at the entry point (dashed)
    if (res.pts.length > 1) { const p = res.pts[1]; ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 34); ctx.lineTo(p.x, p.y + 34); ctx.stroke(); ctx.restore(); }
    this.beam(ctx, res.pts, this.locked || onTarget ? '#7dffb0' : BEAM, onTarget ? 20 : 14);
    this.source(ctx, t);
    if (this.phase !== 'done') label(ctx, this.src.x - 8, this.src.y - 24, 'drag to aim into the water', { color: hexA(BEAM, 0.8), size: 12, align: 'left' });
  }

  renderPrism(ctx, game, t) {
    // white beam up to the prism entry
    const entry = this.tracePrismColor(1.55)[1];
    this.beam(ctx, [this.src, entry], '#ffffff', 16);
    this.source(ctx, t);
    // the prism
    ctx.save(); ctx.fillStyle = 'rgba(180,210,255,.12)'; ctx.strokeStyle = hexA('#cfe0ff', 0.7); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(this.prism[0].x, this.prism[0].y); ctx.lineTo(this.prism[1].x, this.prism[1].y); ctx.lineTo(this.prism[2].x, this.prism[2].y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // the dispersed colours (after answering, fan them out and brighten)
    if (this.phase === 'lit' || this.phase === 'done2') {
      const a = this.phase === 'done2' ? 1 : Math.min(1, this.litT / 0.8);
      for (const col of SPECTRUM) { const pts = this.tracePrismColor(col.n); ctx.globalAlpha = a; this.beam(ctx, pts, col.c, 12); ctx.globalAlpha = 1; }
    }
    if (this.type === 'prism' && this.phase === 'aim') {
      label(ctx, game.W / 2, this.chips[0].y - 22, 'White light hits the prism. Which colour bends the most?', { size: 14, color: '#fff' });
      for (const c of this.chips) this.drawChip(ctx, c);
    } else if (this.phase === 'done2') label(ctx, game.W / 2, game.H * 0.9, 'tap to continue', { color: 'rgba(255,255,255,.6)', size: 12.5 });
  }

  drawChip(ctx, c) {
    ctx.save(); const r = 13;
    ctx.beginPath();
    ctx.moveTo(c.x + r, c.y); ctx.arcTo(c.x + c.w, c.y, c.x + c.w, c.y + c.h, r);
    ctx.arcTo(c.x + c.w, c.y + c.h, c.x, c.y + c.h, r); ctx.arcTo(c.x, c.y + c.h, c.x, c.y, r);
    ctx.arcTo(c.x, c.y, c.x + c.w, c.y, r); ctx.closePath();
    ctx.fillStyle = 'rgba(255,243,196,.12)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,243,196,.5)'; ctx.stroke();
    ctx.fillStyle = '#fff7e0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 13.5px "Outfit", system-ui, sans-serif';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2); ctx.restore();
  }

  // live formula
  mathLayer(game) {
    if (this.type === 'reflect') {
      const r = this.traceReflect();
      if (r.angI == null) return null;
      return { x: game.W / 2, y: game.H * 0.88, size: 21, cells: [
        { sym: 'θ', sub: 'in', val: Math.round(r.angI) + '°', color: '#ffd66b' }, { op: '=' },
        { sym: 'θ', sub: 'out', val: Math.round(r.angR) + '°', color: '#aef0ff' },
      ] };
    }
    if (this.type === 'refract') {
      const r = this.traceRefract();
      if (r.angR == null) return null;
      return { x: game.W / 2, y: game.H * 0.90, size: 19, cells: [
        { sym: 'n', sub: '1', val: '1.0', color: '#ffd66b' }, { txt: 'sin' }, { sym: 'θ', sub: '1', val: Math.round(r.angI) + '°', color: '#ffd66b' }, { op: '=' },
        { sym: 'n', sub: '2', val: '1.33', color: '#aee0ff' }, { txt: 'sin' }, { sym: 'θ', sub: '2', val: Math.round(r.angR) + '°', color: '#aee0ff' },
      ] };
    }
    return null;
  }

  objectives(game) {
    const n = this.challenges.length;
    return {
      title: `Light — challenge ${Math.min(this.ci + 1, n)} / ${n}`,
      goals: [
        { text: this.challenges[this.ci].prompt, done: this.phase === 'done' || this.phase === 'done2' },
        { text: 'Bring light — and colour — into the world', done: game.state.feltLight },
      ],
    };
  }
}
