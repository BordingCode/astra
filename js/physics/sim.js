// sim.js — the honest physics core of ASTRA. SI units (metres, seconds, m/s).
// No DOM, no rendering: scenes map metres → pixels themselves.
//
// Two truths the science panel insisted on, baked in here:
//   1. Projectiles use the EXACT closed-form parabola — cheaper AND exactly correct,
//      with NO horizontal-velocity decay (that decay is Aristotle's error).
//   2. Anything we must step live (drift, later orbits) uses a SYMPLECTIC integrator
//      (Euler–Cromer / semi-implicit), which conserves energy — plain Euler slowly
//      injects energy and would teach the opposite of conservation.

// Standard gravity near Earth's surface. (Defined as exactly 9.80665; 9.81 is the rounding.)
export const G = 9.81;

// ---- constant-acceleration closed form (the whole of kinematics) ----
// Convention used throughout ASTRA's SI space: +x right, +y UP (physical).
// A scene flips y for the screen. Gravity is therefore a = (0, -g).

// position after time t, given start p0, start velocity v0, constant acceleration a.
export function posAt(p0, v0, a, t) {
  return {
    x: p0.x + v0.x * t + 0.5 * a.x * t * t,
    y: p0.y + v0.y * t + 0.5 * a.y * t * t,
  };
}
// velocity after time t.
export function velAt(v0, a, t) {
  return { x: v0.x + a.x * t, y: v0.y + a.y * t };
}
export function speed(v) { return Math.hypot(v.x, v.y); }

// ---- free fall (vertical only) ----
// Time for an object released from rest to fall a height h (metres): t = sqrt(2h/g).
// This is INDEPENDENT of mass — the #1 misconception this game must break.
export function fallTime(h, g = G) { return Math.sqrt(2 * h / g); }
// Speed reached after falling for time t.
export function fallSpeed(t, g = G) { return g * t; }

// Galileo's odd-number rule made queryable: in equal successive time ticks, the
// distance fallen grows as 1,3,5,7,9… (ratios of 2n-1). Returns the distance fallen
// by the END of tick k (k = 1,2,3…) — i.e. ½ g (k·dt)². The PER-TICK gaps widen.
export function fallenBy(k, dt, g = G) { const t = k * dt; return 0.5 * g * t * t; }

// ---- projectile (drift + fall combined) ----
// Launch from p0 with speed v0 (m/s) at angle deg above horizontal (0 = flat).
// Gravity pulls down. Returns the trajectory as a function of t, plus the key facts.
export function projectile(p0, v0, deg, g = G) {
  const rad = deg * Math.PI / 180;
  const vx = v0 * Math.cos(rad);
  const vy = v0 * Math.sin(rad);          // +y is up
  const a = { x: 0, y: -g };
  const v = { x: vx, y: vy };
  return {
    vx, vy, a,
    pos: (t) => posAt(p0, v, a, t),
    vel: (t) => velAt(v, a, t),
    // time to return to the launch height (flat ground): T = 2·v·sinθ / g
    flightTimeFlat: (2 * vy) / g,
    // peak height above launch: H = (v·sinθ)² / 2g
    peakHeight: (vy * vy) / (2 * g),
    // horizontal range on flat ground: R = v² · sin(2θ) / g  → max at θ = 45°
    rangeFlat: (v0 * v0 * Math.sin(2 * rad)) / g,
  };
}

// Time at which a projectile launched from height y0 reaches ground level y=ground.
// Solves y0 + vy·t − ½ g t² = ground for the positive root.
export function timeToGround(y0, vy, ground, g = G) {
  // ½g t² − vy t − (y0 − ground) = 0
  const A = 0.5 * g, B = -vy, C = -(y0 - ground);
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  return (-B + Math.sqrt(disc)) / (2 * A);
}

// ---- symplectic integrator (Euler–Cromer): velocity FIRST, then position ----
// For live stepping where there's no clean closed form (drift with nudges, orbits).
// body: {x,y,vx,vy}. accel(body) → {ax,ay}. Mutates body in place.
export function stepEulerCromer(body, accel, dt) {
  const ac = accel ? accel(body) : { ax: 0, ay: 0 };
  body.vx += ac.ax * dt;          // update velocity first…
  body.vy += ac.ay * dt;
  body.x += body.vx * dt;         // …then move with the NEW velocity (this is what conserves energy)
  body.y += body.vy * dt;
}

// ---- energy (the hidden axis under every motion stage) ----
export function kinetic(mass, v) { return 0.5 * mass * v * v; }         // ½mv²
export function potential(mass, height, g = G) { return mass * g * height; } // mgh
