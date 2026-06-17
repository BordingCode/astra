// stages.js — the spine of ASTRA and each stage's teaching content.
// Text is deliberately minimal: a title, a one-line "how it works", and the single
// idea each stage must make the player FEEL. The failure/gap is the real teacher.

export const STAGES = [
  { id: 'drift', ico: '→', label: 'Drift' },
  { id: 'fall',  ico: '↓', label: 'Fall' },
  { id: 'throw', ico: '↗', label: 'Throw' },
  { id: 'force', ico: '⇉', label: 'Force' },
  { id: 'orbit', ico: '⊙', label: 'Orbit' },
];

// per-stage cosmos colours (nebula colA/colB in 0..1) — the world's mood shifts as you go
export const NEBULA = {
  drift: { colA: [0.10, 0.12, 0.34], colB: [0.16, 0.42, 0.62], focus: [0.5, 0.5] },
  fall:  { colA: [0.20, 0.12, 0.30], colB: [0.45, 0.30, 0.30], focus: [0.5, 0.8] },
  throw: { colA: [0.12, 0.18, 0.34], colB: [0.30, 0.45, 0.40], focus: [0.5, 0.75] },
  force: { colA: [0.26, 0.14, 0.20], colB: [0.55, 0.32, 0.22], focus: [0.5, 0.5] },
  orbit: { colA: [0.10, 0.11, 0.30], colB: [0.28, 0.20, 0.52], focus: [0.5, 0.52] },
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
  orbit: {
    title: 'Orbit — falling forever',
    body: [
      'You’ve felt things fall. Now fall SIDEWAYS — fast.',
      'Drag to fling the mote past the world. Too slow and it crashes; too fast and it escapes.',
      'Watch the faint path as you aim: somewhere in between, it falls round and round, forever.',
    ],
    tip: 'An orbit is a throw that never lands — you keep falling, but the ground curves away as fast as you drop.',
  },
};

// The single transferable idea per stage (used in the "you understand" beat + codex).
export const LESSON = {
  drift: 'In empty space, motion needs no force to continue — only a force can change it. (Newton’s 1st law)',
  fall:  'All masses fall the same: gravity adds speed equally. The widening trail is acceleration.',
  throw: 'A throw is two independent motions at once — steady sideways, accelerating down — which trace a parabola.',
  force: 'A force doesn’t set a speed — it changes one: a = F ÷ m. The same push moves a heavy mass less, and held steady it speeds things up without end. Every push also pushes back.',
  orbit: 'An orbit is just falling sideways fast enough to keep missing the ground. Gravity never lets go — the Moon, the Space Station, everything in orbit is in endless free-fall. Go faster than escape speed (only √2× the circular speed) and you never come back.',
};

// "Whoa, and it's TRUE" facts surfaced at the right moment.
export const TRUTH = {
  drift: 'Voyager 1 was last pushed by a rocket in 1977. It has coasted ever since — and still is.',
  fall:  'On the Moon, with no air, a hammer and a feather hit the ground together. Apollo 15 filmed it.',
  throw: 'Drop a ball and fire one sideways at the same instant from the same height — they land together.',
  force: 'A rocket has nothing to push against in space. It hurls gas out the back, and that hurls it forward — every push pushes back (Newton’s 3rd law).',
  orbit: 'Astronauts aren’t beyond gravity — at the Space Station’s height it’s still about 90% as strong. They float because they’re falling around the Earth, endlessly missing it.',
};

// A tiny conceptual quick-check after each stage. Every wrong option is a REAL, common
// misconception (vetted) — answering either way shows a one-line "why". Keep them playful.
export const QUIZ = {
  drift: [
    { q: 'A mote gets one push in deep space, then nothing touches it. What happens to its speed?',
      options: [
        { t: 'It keeps the same speed — forever.', correct: true, why: 'No force means no change. With nothing to slow or speed it, it coasts forever. (Newton’s 1st law.)' },
        { t: 'It slowly slows down and stops.', why: 'That “things naturally slow” feeling is friction — and space has none. Nothing here slows it.' },
        { t: 'It speeds up, since nothing holds it back.', why: 'Removing a brake doesn’t add a push. No force → no change, either way.' },
      ] },
  ],
  fall: [
    { q: 'A heavy ball and a light ball are dropped together, with no air. Which lands first?',
      options: [
        { t: 'They land at the same instant.', correct: true, why: 'Gravity pulls the heavy one harder — but it’s exactly that much harder to speed up. The two cancel, so both fall the same.' },
        { t: 'The heavy one.', why: 'Feels right, but heavier = pulled harder AND harder to accelerate. They cancel exactly.' },
        { t: 'The light one.', why: 'No — with no air, every mass falls at the same rate.' },
      ] },
    { q: 'As something falls (no air), its speed…',
      options: [
        { t: 'keeps increasing the whole way down.', correct: true, why: 'Gravity is a steady pull, so it keeps ADDING speed every moment until it lands.' },
        { t: 'stays the same all the way down.', why: 'That would mean no acceleration — but gravity speeds it up continuously.' },
        { t: 'speeds up, then settles to a steady speed.', why: 'That “terminal velocity” needs air. In a vacuum it just keeps speeding up.' },
      ] },
  ],
  throw: [
    { q: 'At the very top of a thrown mote’s arc, it is…',
      options: [
        { t: 'still moving sideways — only the up/down speed is zero.', correct: true, why: 'Only the vertical speed is momentarily zero at the top. The sideways speed never changed.' },
        { t: 'completely stopped for an instant.', why: 'Only the up/down part is zero — it’s still flying sideways the whole time.' },
        { t: 'moving at its fastest.', why: 'The top is its SLOWEST point — the up/down speed has bled away to zero.' },
      ] },
    { q: 'Drop one mote and fire another sideways from the same height, at the same instant. Which lands first?',
      options: [
        { t: 'They land at the same instant.', correct: true, why: 'The up-and-down fall is identical for both — going sideways doesn’t change how fast you drop.' },
        { t: 'The dropped one (shorter path).', why: 'The vertical drop is the same for both; sideways travel doesn’t delay the fall.' },
        { t: 'The fired one (more speed).', why: 'Its extra speed is all sideways — it doesn’t touch the falling at all.' },
      ] },
  ],
  force: [
    { q: 'You give a mote a steady, never-ending push in space. What happens?',
      options: [
        { t: 'It keeps speeding up — the speed never settles.', correct: true, why: 'A constant force = constant acceleration. With nothing opposing it, it never stops speeding up.' },
        { t: 'It reaches a top speed, then cruises there.', why: 'That’s the car-on-a-road feeling, caused by drag. Empty space has nothing to settle it.' },
        { t: 'It moves steadily while pushed, then stops when you stop.', why: 'While pushing it ACCELERATES; when you stop it COASTS — it doesn’t just stop.' },
      ] },
    { q: 'The same push is given to a heavy mote and a light mote. Which speeds up more?',
      options: [
        { t: 'The light one.', correct: true, why: 'a = F ÷ m: the same force on less mass makes more acceleration.' },
        { t: 'The heavy one.', why: 'More mass means more resistance to speeding up (inertia), not less.' },
        { t: 'They speed up equally.', why: 'Equal force ≠ equal acceleration — that’s only true for gravity, which scales its pull with mass.' },
      ] },
  ],
  orbit: [
    { q: 'Why do astronauts float inside the Space Station?',
      options: [
        { t: 'They’re falling around the Earth, together with the station.', correct: true, why: 'It’s free-fall. Gravity up there is still ~90% as strong — they fall and keep missing the Earth.' },
        { t: 'There’s no gravity that high up.', why: 'Gravity at the station is still ~90% of surface strength. Floating is free-fall, not zero gravity.' },
        { t: 'They’ve escaped Earth into the Moon’s pull.', why: 'The station is firmly bound to Earth — nowhere near the Moon.' },
      ] },
    { q: 'To escape a world’s gravity forever (instead of just circling it), you need…',
      options: [
        { t: 'about 1.4× (√2×) the circular speed — only a bit faster.', correct: true, why: 'Escape speed is just √2 ≈ 1.41× the orbit speed. Surprisingly little extra!' },
        { t: 'a truly enormous speed, far more than orbiting.', why: 'Nope — only about 41% faster than already circling.' },
        { t: 'the same speed, just aimed straight up.', why: 'Below escape speed it falls back whatever the direction — you genuinely need more speed.' },
      ] },
  ],
};
