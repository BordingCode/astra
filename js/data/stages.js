// stages.js — the spine of ASTRA and each stage's teaching content.
// Text is deliberately minimal: a title, a one-line "how it works", and the single
// idea each stage must make the player FEEL. The failure/gap is the real teacher.

export const STAGES = [
  { id: 'drift', ico: '→', label: 'Drift' },
  { id: 'fall',  ico: '↓', label: 'Fall' },
  { id: 'throw', ico: '↗', label: 'Throw' },
  { id: 'force', ico: '⇉', label: 'Force' },
];

// per-stage cosmos colours (nebula colA/colB in 0..1) — the world's mood shifts as you go
export const NEBULA = {
  drift: { colA: [0.10, 0.12, 0.34], colB: [0.16, 0.42, 0.62], focus: [0.5, 0.5] },
  fall:  { colA: [0.20, 0.12, 0.30], colB: [0.45, 0.30, 0.30], focus: [0.5, 0.8] },
  throw: { colA: [0.12, 0.18, 0.34], colB: [0.30, 0.45, 0.40], focus: [0.5, 0.75] },
  force: { colA: [0.26, 0.14, 0.20], colB: [0.55, 0.32, 0.22], focus: [0.5, 0.5] },
};

// "How it works" cards — shown once per stage, dismissible. Short.
export const HOWTO = {
  drift: {
    title: 'Drift — empty space',
    body: [
      'Out here there is nothing to slow things down — no air, no ground, no friction.',
      'Drag back from the mote to aim and set its push, then release.',
      'Then watch. Notice how long it keeps going.',
    ],
    tip: 'A push only starts the motion. Nothing here ever stops it.',
  },
  fall: {
    title: 'Fall — a world appears',
    body: [
      'Now there is a world below, and it pulls.',
      'Two motes wait at the top: a heavy one and a light one.',
      'Before you drop them, call it: which lands first?',
    ],
    tip: 'Watch the trail of after-images — its spacing is the secret.',
  },
  throw: {
    title: 'Throw — drift meets fall',
    body: [
      'Push it sideways AND let the world pull it down — at the same time.',
      'Drag to aim the launch, then release and try to hit the target.',
      'The two motions are independent. Together they make a curve.',
    ],
    tip: 'Sideways speed never changes. Only the falling speeds up.',
  },
  force: {
    title: 'Force — push and shove',
    body: [
      'A push is a force. Give the same push to a heavy thing and a light thing — they don’t answer the same.',
      'And a steady push doesn’t set a speed: it keeps ADDING speed, on and on.',
      'Predict, then push — and watch what a force really does.',
    ],
    tip: 'Force makes things speed up or slow down — not simply move. Heavier resists more.',
  },
};

// The single transferable idea per stage (used in the "you understand" beat + codex).
export const LESSON = {
  drift: 'In empty space, motion needs no force to continue — only a force can change it. (Newton’s 1st law)',
  fall:  'All masses fall the same: gravity adds speed equally. The widening trail is acceleration.',
  throw: 'A throw is two independent motions at once — steady sideways, accelerating down — which trace a parabola.',
  force: 'A force doesn’t set a speed — it changes one: a = F ÷ m. The same push moves a heavy mass less, and held steady it speeds things up without end. Every push also pushes back.',
};

// "Whoa, and it's TRUE" facts surfaced at the right moment.
export const TRUTH = {
  drift: 'Voyager 1 was last pushed by a rocket in 1977. It has coasted ever since — and still is.',
  fall:  'On the Moon, with no air, a hammer and a feather hit the ground together. Apollo 15 filmed it.',
  throw: 'Drop a ball and fire one sideways at the same instant from the same height — they land together.',
  force: 'A rocket has nothing to push against in space. It hurls gas out the back, and that hurls it forward — every push pushes back (Newton’s 3rd law).',
};
