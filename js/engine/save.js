// save.js — localStorage persistence for ASTRA progress.
const KEY = 'astra.save.v1';

const DEFAULT = {
  // stage progress
  scene: 'drift',
  stagesDone: {},                // id -> true once ALL its challenges are cleared
  progress: {},                  // id -> number of challenges cleared (resume point)
  best: {},                      // id -> best score/closeness (stage-defined)
  // the currency: Insight, earned by correct predictions & discoveries
  insight: 0,
  predictions: 0,                // total predictions committed
  predictionsRight: 0,           // …of which were close enough
  // learning flags that gate later stages (cross-stage retrieval)
  feltFall: false,               // has the player SEEN acceleration in FALL? (gates ORBIT later)
  feltDrift: false,              // has the player seen frictionless constant motion?
  feltForce: false,              // has the player felt a steady push become acceleration?
  feltOrbit: false,              // has the player put something into a stable orbit?
  feltSystem: false,             // has the player built a multi-world system?
  // curiosities found off the main path
  curiosities: [],
  // ui / one-time
  predictMode: true,             // commit a prediction before each launch (toggle in menu)
  showMath: true,                // show the live, colour-coded formula layer (toggle in menu)
  coachSeen: {},                 // one-time coaching toasts already shown
  howtoSeen: {},                 // sceneId -> true once its "how it works" card was shown
  introSeen: false,
  soundOn: true,
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return Object.assign(structuredClone(DEFAULT), JSON.parse(raw));
  } catch (e) {
    console.warn('save load failed', e);
    return structuredClone(DEFAULT);
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('save failed', e); }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  return structuredClone(DEFAULT);
}
