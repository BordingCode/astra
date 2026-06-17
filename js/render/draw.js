// draw.js — shared 2D canvas drawing helpers for ASTRA scenes.
// The visual language: glowing motes on deep space, additive light, clean vectors.

// ---- colour ----
export function rgb01(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
export function hexA(hex, a) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// ---- a glowing mote (the player's matter) ----
export function drawMote(ctx, x, y, r, color, { time = 0, pulse = 0 } = {}) {
  const breath = 1 + pulse * 0.18 * Math.sin(time * 3);
  const rr = r * breath;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 3.2);
  g.addColorStop(0, hexA(color, 0.55));
  g.addColorStop(0.5, hexA(color, 0.18));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rr * 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // bright core
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(x, y, rr * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = hexA(color, 0.95);
  ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(x, y, rr * 0.4, 0, Math.PI * 2); ctx.fill();
}

// a faint after-image dot for the stroboscopic trail (acceleration made visible)
export function drawTrailDot(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, hexA(color, 0.8));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- a target gate / ring to thread or hit ----
export function drawRing(ctx, x, y, r, color, { lit = false, time = 0, dash = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (dash) ctx.setLineDash([6, 8]);
  ctx.lineWidth = lit ? 5 : 3;
  ctx.strokeStyle = lit ? '#fff' : hexA(color, 0.8);
  ctx.shadowColor = color; ctx.shadowBlur = lit ? 26 : 14;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  if (lit) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA(color, 0.12);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// a small target marker (a spot to land on / hit)
export function drawTarget(ctx, x, y, r, color, { hit = false, time = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + 0.12 * Math.sin(time * 4);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2 * pulse);
  g.addColorStop(0, hexA(color, hit ? 0.7 : 0.35));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = 2.5; ctx.strokeStyle = hexA(color, 0.9);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ---- an arrow / vector (force, velocity) ----
export function drawArrow(ctx, x1, y1, x2, y2, color, { width = 3, head = 10, alpha = 1, dash = false } = {}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  // arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// a dashed predicted path (the player's guess), drawn faintly
export function drawDashedPath(ctx, pts, color, { width = 2, alpha = 0.6 } = {}) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.setLineDash([5, 7]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

// the ground / a planet's surface across the bottom of the view
export function drawGround(ctx, W, y, color) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + 120);
  g.addColorStop(0, hexA(color, 0.5));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, 120);
  ctx.strokeStyle = hexA(color, 0.85); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  ctx.restore();
}

// soft prompt text centred at a point
export function label(ctx, x, y, text, { color = 'rgba(255,255,255,0.92)', size = 14, weight = 600, align = 'center' } = {}) {
  ctx.save();
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Outfit", system-ui, sans-serif`;
  ctx.fillText(text, x, y);
  ctx.restore();
}
