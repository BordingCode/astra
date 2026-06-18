// stages.js — the spine of ASTRA and each stage's teaching content.
// Text is deliberately minimal: a title, a one-line "how it works", and the single
// idea each stage must make the player FEEL. The failure/gap is the real teacher.

export const STAGES = [
  { id: 'drift', ico: '→', label: 'Drift' },
  { id: 'fall',  ico: '↓', label: 'Fall' },
  { id: 'throw', ico: '↗', label: 'Throw' },
  { id: 'force', ico: '⇉', label: 'Force' },
  { id: 'orbit', ico: '⊙', label: 'Orbit' },
  { id: 'system', ico: '✲', label: 'System' },
  { id: 'light', ico: '✦', label: 'Light' },
];

// per-stage cosmos colours (nebula colA/colB in 0..1) — the world's mood shifts as you go
export const NEBULA = {
  drift: { colA: [0.10, 0.12, 0.34], colB: [0.16, 0.42, 0.62], focus: [0.5, 0.5] },
  fall:  { colA: [0.20, 0.12, 0.30], colB: [0.45, 0.30, 0.30], focus: [0.5, 0.8] },
  throw: { colA: [0.12, 0.18, 0.34], colB: [0.30, 0.45, 0.40], focus: [0.5, 0.75] },
  force: { colA: [0.26, 0.14, 0.20], colB: [0.55, 0.32, 0.22], focus: [0.5, 0.5] },
  orbit: { colA: [0.10, 0.11, 0.30], colB: [0.28, 0.20, 0.52], focus: [0.5, 0.52] },
  system: { colA: [0.12, 0.10, 0.26], colB: [0.34, 0.26, 0.48], focus: [0.5, 0.5] },
  light:  { colA: [0.20, 0.16, 0.34], colB: [0.50, 0.40, 0.30], focus: [0.5, 0.5] },
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
  system: {
    title: 'System — a family of worlds',
    body: [
      'One star, many worlds — each falling around it at its own distance.',
      'Add a new world to the system, then see who runs the faster year.',
      'And a moving world’s gravity can fling a passing probe faster — for free.',
    ],
    tip: 'The farther out a world orbits, the slower it moves and the longer its year.',
  },
  light: {
    title: 'Light — the journey’s end',
    body: [
      'You began as a speck in the dark. Now bring in the light.',
      'A beam of light travels in straight lines — until it bounces off a mirror, or bends as it slows entering water or glass.',
      'Aim the beam. And at the end, split white light into every colour it was hiding.',
    ],
    tip: 'Light bends when it slows — and white light is every colour at once, waiting to be fanned apart.',
  },
};

// The single transferable idea per stage (used in the "you understand" beat + codex).
export const LESSON = {
  drift: 'In empty space, motion needs no force to continue — only a force can change it. (Newton’s 1st law)',
  fall:  'All masses fall the same: gravity adds speed equally. The widening trail is acceleration.',
  throw: 'A throw is two independent motions at once — steady sideways, accelerating down — which trace a parabola.',
  force: 'A force doesn’t set a speed — it changes one: a = F ÷ m. The same push moves a heavy mass less, and held steady it speeds things up without end. Every push also pushes back.',
  orbit: 'An orbit is just falling sideways fast enough to keep missing the ground. Gravity never lets go — the Moon, the Space Station, everything in orbit is in endless free-fall. Go faster than escape speed (only √2× the circular speed) and you never come back.',
  system: 'A solar system is many orbits at once — each world falling around the star at its own distance. The farther out, the slower it moves and the longer its year (Kepler’s 3rd law). And a moving world’s gravity can fling a passing probe faster, for free — a slingshot.',
  light: 'Light is a wave that needs nothing to travel — it crosses empty space. It bounces (angle in = angle out) and bends when it slows entering water or glass; its colour, set by frequency, never changes — only its speed and wavelength. White light is every colour at once: a prism fans them out because violet bends the most.',
};

// Reflect-back: when the player NAILED the stage's key prediction, restate the principle
// back to them as THEIR OWN reasoning (not just "well done"). Phrased in second person and
// aimed straight at the misconception each stage kills (per curriculum physics-astra.md §4 &
// the FCI misconception language) — so the win reads "you reasoned it," not "you guessed it."
export const REASONED = {
  drift: 'You reasoned it: with no force and no friction, nothing changes a motion — so it just keeps going.',
  fall:  'You reasoned it: heavier didn’t win — gravity pulls every mass in exact step, so they fall the same.',
  throw: 'You reasoned it: the sideways push never touches the falling — two independent motions, landing together.',
  force: 'You reasoned it: a steady push doesn’t set a speed, and the same push moves less mass more — a = F ÷ m, not gravity’s tie.',
  orbit: 'You reasoned it: an orbit is just a fall moving sideways fast enough to keep missing the ground — gravity never lets go.',
  system: 'You reasoned it: distance sets the pace — the farther world is slower and runs the longer year (Kepler), not synced by the shared star.',
  light: 'You reasoned it: the prism adds no colour — white light already held them all, and violet simply bends the most.',
};

// "Whoa, and it's TRUE" facts surfaced at the right moment.
export const TRUTH = {
  drift: 'Voyager 1 was last pushed by a rocket in 1977. It has coasted ever since — and still is.',
  fall:  'On the Moon, with no air, a hammer and a feather hit the ground together. Apollo 15 filmed it.',
  throw: 'Drop a ball and fire one sideways at the same instant from the same height — they land together.',
  force: 'A rocket has nothing to push against in space. It hurls gas out the back, and that hurls it forward — every push pushes back (Newton’s 3rd law).',
  orbit: 'Astronauts aren’t beyond gravity — at the Space Station’s height it’s still about 90% as strong. They float because they’re falling around the Earth, endlessly missing it.',
  system: 'Voyager 2 slingshot past Jupiter, Saturn, Uranus and Neptune in turn — borrowing a sliver of each planet’s motion to fling itself onward. It’s still flying, over 40 years later.',
  light: 'A rainbow is sunlight bent and split inside millions of raindrops — and because the angle is fixed, everyone sees their OWN private rainbow, made of light from different drops, meant just for their eyes.',
};

// The journey as a CHAIN the player retraces tap-by-tap at the end — each step says WHY the
// previous law led to the next, so they assemble the whole story instead of just reading it.
export const FINALE_CHAIN = [
  { ico: '·', label: 'a speck',  line: 'You began as a single speck of matter, adrift in the dark.' },
  { ico: '→', label: 'Drift',    line: 'First it learned to move — and out here, motion never stops on its own.' },
  { ico: '↓', label: 'Fall',     line: 'Give it a world, and that motion becomes a fall — every speck falling the same.' },
  { ico: '↗', label: 'Throw',    line: 'Add a sideways push to the fall, and the path bends into a curve — a throw.' },
  { ico: '⇉', label: 'Force',    line: 'But what bends a motion at all? A force — and the same push moves a heavy thing less.' },
  { ico: '⊙', label: 'Orbit',    line: 'Push it sideways fast enough as it falls, and it falls AROUND the world — an orbit.' },
  { ico: '✲', label: 'System',   line: 'Many such falls around one star make a system — far worlds slow, near worlds quick.' },
  { ico: '✦', label: 'Light',    line: 'And across all that space travels light — bouncing, bending, hiding every colour.' },
];

// The ASSEMBLED-SPINE finale. The player taps the seven stages back in their proper order
// (drift → fall → throw → force → orbit → system → light). Each correct tap draws a connector
// to the one before it and reveals FEEDS[id] — the single sentence showing how the PREVIOUS
// stage's lesson becomes the raw material for THIS one (product→raw-material, the spine rule).
// `drift` opens the chain (nothing feeds it), so its line names what it gives the next stage.
// `prereq` is the stage that MUST already sit on the spine before this one can be placed; a tap
// that jumps ahead of its prereq triggers a gentle nudge instead of placing the chip.
export const FINALE_SPINE = ['drift', 'fall', 'throw', 'force', 'orbit', 'system', 'light'];

export const FINALE_FEEDS = {
  drift: { prereq: null,    feed: 'Start here: a motion that, once begun, never stops on its own.' },
  fall:  { prereq: 'drift', feed: 'Fall = drift, but now a world pulls it down — and it pulls every mass the same.' },
  throw: { prereq: 'fall',  feed: 'Throw = drift sideways + fall at once — the two run independently into a curve.' },
  force: { prereq: 'throw', feed: 'Force is what changed those motions all along: a = F ÷ m — the same push moves a heavy mass less.' },
  orbit: { prereq: 'force', feed: 'Orbit = throw it sideways fast enough that the ground curves away as fast as it falls.' },
  system:{ prereq: 'orbit', feed: 'System = many orbits at once — each world falling around the star, far ones slower (Kepler).' },
  light: { prereq: 'system',feed: 'Light crosses all that empty space — the same void where the speck first began to drift.' },
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
  system: [
    { q: 'Two planets circle a star — one close in, one far out. Which has the longer YEAR?',
      options: [
        { t: 'The far-out one.', correct: true, why: 'Farther planets move slower AND have a much bigger loop to finish — so their year is far longer. (Earth: 1 year; Neptune: 165!)' },
        { t: 'The close-in one.', why: 'No — the inner planet is faster and has a shorter loop, so its year is short.' },
        { t: 'Same — they share the same star.', why: 'Sharing a star doesn’t sync them. Distance sets the pace (Kepler’s 3rd law).' },
      ] },
    { q: 'A probe swings close past a fast-MOVING planet. It can come away…',
      options: [
        { t: 'faster — it borrowed some of the planet’s motion.', correct: true, why: 'A gravity slingshot: the probe steals a tiny bit of the moving planet’s motion and speeds up. Real spacecraft do exactly this.' },
        { t: 'at exactly the same speed — gravity gives nothing free.', why: 'Past a STILL planet, true. But a MOVING planet hands over some of its motion — that’s the trick.' },
        { t: 'slower — the planet’s gravity drags it back.', why: 'Coming in and leaving roughly cancel; past a moving planet the net effect is a BOOST, not a drag.' },
      ] },
  ],
  light: [
    { q: 'Light passes from air into water. What happens to it?',
      options: [
        { t: 'It slows down and bends — but its colour stays the same.', correct: true, why: 'In water light slows (to about ¾ of its space speed) and its wavelength shrinks — but its frequency, which IS its colour, doesn’t change. That’s why things keep their colour underwater.' },
        { t: 'It speeds up and bends.', why: 'Light SLOWS in water — denser stuff slows it down. (It bends because it slows.)' },
        { t: 'Its colour changes — to blue or green.', why: 'Colour is set by frequency, and that doesn’t change crossing into water. Only the speed and wavelength do.' },
      ] },
    { q: 'A prism splits white light into a rainbow because…',
      options: [
        { t: 'white light is all colours mixed, and each colour bends a different amount.', correct: true, why: 'White light is every colour at once. The prism bends violet the most and red the least, fanning them apart.' },
        { t: 'the glass colours the light as it passes through.', why: 'The glass adds nothing — the colours were already inside the white light. The prism just separates them.' },
        { t: 'the white light turns into colours inside the glass.', why: 'Nothing is created. The colours were always there, overlapping; the prism spreads them out.' },
      ] },
  ],
};
