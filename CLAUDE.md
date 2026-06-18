# ASTRA — project guide for Claude

A vanilla **ES-module** PWA: a premium **physics-fundamentals discovery game** (predict by
hand → real simulation teaches), sister to Primordia and **reusing the Primordia engine**.
Educational — **the physics must be honest** (real SI units). No build step. Repo:
`BordingCode/astra` (branch **main**), GitHub Pages (`bordingcode.github.io/astra`).

## Before working
Read the shared game-dev knowledge base: **`~/cc/gamedev-kb/INDEX.md`** (lowercase `cc`).
Especially `patterns/canvas-engine-games.md`, `patterns/mobile-ios-safari.md`, and
`checklists/ship-checklist.md`.

## Architecture
- `js/main.js` — boot; exposes `window.__astra` (the live game) for tests.
- `js/` — physics sim + the Drift/Fall/Throw lessons (shares Primordia's engine patterns).
- `assets/` — art; WebGL effects carried over from Primordia.

## Deploy convention — every change MUST
- **Bump the SW `CACHE` string** in `sw.js` (e.g. `astra-v10`→`v11`) and add any new file to
  the `ASSETS` array, **and** bump the `?v=` query on changed `<link>`/`<script>` tags in
  `index.html`. Both are required (it uses `?v=` busting) or stale code is served.
- Be **committed and pushed** to `main`.

## Tests / verify
- Test hook `window.__astra` (the game object). Verify in a real browser (local
  `python3 -m http.server` + Playwright): play each lesson, 0 console errors.
- **Accuracy is load-bearing** — honest SI physics core; don't fudge the numbers.

## Notes
- Phone-first; audio unlocked on first gesture.
