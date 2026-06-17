// equation.js — draw a LIVE, colour-coded formula on the canvas.
// The point: each symbol is tied (by colour) to a thing on screen, can carry a live
// value beneath it, and can pulse/scale when it changes — so a kid SEES the parts interact.
//
// A formula is an array of "cells". Supported cell shapes:
//   { sym:'a', sup:'2', val:'4.0', unit:'m/s²', color:'#6be4ff', emph:0 }  // a variable
//   { op:'=' }                                                              // an operator/symbol
//   { txt:'½', color:'#fff' }                                              // plain text
//   { frac:{ num:[...cells], den:[...cells] }, color:'#fff' }              // a fraction
//   { sqrt:[...cells] }                                                    // a square root
// emph (0..1) scales the symbol and adds glow — drive it from the sim for the "aha".

const FONT = '"Outfit", system-ui, sans-serif';

function font(ctx, px, weight = 600, italic = false) { ctx.font = `${italic ? 'italic ' : ''}${weight} ${px}px ${FONT}`; }

// measure one cell → { w, up, dn } (width, height above / below the symbol centre-line)
function measure(ctx, cell, S) {
  if (cell.op != null || cell.txt != null) {
    const s = cell.op != null ? cell.op : cell.txt;
    font(ctx, S); const w = ctx.measureText(s).width;
    return { w: w + S * 0.18, up: S * 0.62, dn: S * 0.42 };
  }
  if (cell.sym != null) {
    const e = 1 + (cell.emph || 0) * 0.35; const sz = S * e;
    font(ctx, sz, 600, true); let w = ctx.measureText(cell.sym).width;
    if (cell.sup || cell.sub) { font(ctx, sz * 0.62); w += ctx.measureText(cell.sup || cell.sub).width; }
    let dn = sz * 0.5 + (cell.sub ? sz * 0.18 : 0);
    if (cell.val != null) dn += S * 0.05 + S * 0.5;           // room for the live value line
    return { w: w + S * 0.16, up: sz * 0.55 + (cell.sup ? sz * 0.28 : 0), dn };
  }
  if (cell.frac) {
    const num = measureRow(ctx, cell.frac.num, S * 0.82);
    const den = measureRow(ctx, cell.frac.den, S * 0.82);
    const w = Math.max(num.w, den.w) + S * 0.3;
    return { w, up: num.h + S * 0.16, dn: den.h + S * 0.16, _num: num, _den: den };
  }
  if (cell.sqrt) {
    const inner = measureRow(ctx, cell.sqrt, S);
    return { w: inner.w + S * 0.5, up: inner.up + S * 0.16, dn: inner.dn, _inner: inner };
  }
  return { w: 0, up: 0, dn: 0 };
}

function measureRow(ctx, cells, S) {
  let w = 0, up = 0, dn = 0;
  for (const c of cells) { const m = measure(ctx, c, S); c._m = m; w += m.w; up = Math.max(up, m.up); dn = Math.max(dn, m.dn); }
  return { w, up, dn, h: up + dn };
}

// draw one cell with its centre-line at (x is the LEFT edge, cy the centre-line). returns width.
function drawCell(ctx, cell, x, cy, S) {
  const m = cell._m || measure(ctx, cell, S);
  if (cell.op != null || cell.txt != null) {
    const s = cell.op != null ? cell.op : cell.txt;
    font(ctx, S, cell.op != null ? 500 : 600);
    ctx.fillStyle = cell.color || 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x + S * 0.09, cy);
    return m.w;
  }
  if (cell.sym != null) {
    const e = 1 + (cell.emph || 0) * 0.35; const sz = S * e;
    const col = cell.color || '#fff';
    ctx.save();
    if (cell.emph) { ctx.shadowColor = col; ctx.shadowBlur = 8 + cell.emph * 16; }
    font(ctx, sz, 600, true);
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(cell.sym, x + S * 0.08, cy);
    const sw = ctx.measureText(cell.sym).width;
    if (cell.sup) { font(ctx, sz * 0.62, 600, true); ctx.fillText(cell.sup, x + S * 0.08 + sw, cy - sz * 0.36); }
    if (cell.sub) { font(ctx, sz * 0.62, 600, true); ctx.fillText(cell.sub, x + S * 0.08 + sw, cy + sz * 0.30); }
    ctx.restore();
    if (cell.val != null) {                                    // live value beneath, in the token colour
      font(ctx, S * 0.46, 700);
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const cx = x + m.w / 2;
      ctx.fillText(cell.val + (cell.unit ? ' ' + cell.unit : ''), cx, cy + sz * 0.5 + S * 0.04);
    }
    return m.w;
  }
  if (cell.frac) {
    const w = m.w, barY = cy, S2 = S * 0.82;
    drawRow(ctx, cell.frac.num, x + (w - m._num.w) / 2, barY - S * 0.16 - m._num.dn, S2);
    drawRow(ctx, cell.frac.den, x + (w - m._den.w) / 2, barY + S * 0.16 + m._den.up, S2);
    ctx.strokeStyle = cell.color || 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + S * 0.1, barY); ctx.lineTo(x + w - S * 0.1, barY); ctx.stroke();
    return w;
  }
  if (cell.sqrt) {
    const inner = m._inner, lead = S * 0.42;
    const top = cy - inner.up - S * 0.12;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + S * 0.05, cy + inner.dn * 0.3);
    ctx.lineTo(x + lead * 0.45, cy + inner.dn);
    ctx.lineTo(x + lead * 0.8, top);
    ctx.lineTo(x + m.w, top);
    ctx.stroke();
    drawRow(ctx, cell.sqrt, x + lead, cy, S);
    return m.w;
  }
  return 0;
}

function drawRow(ctx, cells, x, cy, S) {
  measureRow(ctx, cells, S);
  let cx = x;
  for (const c of cells) cx += drawCell(ctx, c, cx, cy, S);
  return cx - x;
}

// Public: draw a formula centred at (cx, cy). size S ~ font px. Returns its bounding box.
export function drawEquation(ctx, cx, cy, cells, { size = 26, card = true } = {}) {
  const row = measureRow(ctx, cells, size);
  const x = cx - row.w / 2;
  if (card) {
    const padX = 18, padY = 12;
    const bx = x - padX, by = cy - row.up - padY, bw = row.w + padX * 2, bh = row.up + row.dn + padY * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(10,16,32,0.62)'; ctx.strokeStyle = 'rgba(150,190,255,0.18)'; ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  drawRow(ctx, cells, x, cy, size);
  return { w: row.w, up: row.up, dn: row.dn };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
