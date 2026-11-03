# VPSmon

An original 3D monster battle game that runs in the browser (phone and desktop).
Put your own face on your monster, then battle a friend online with a 5-letter room code,
use Quick Match (random online player, bot fallback), or fight the CPU (Easy / Normal / Hard).

Play: https://vpsmon.sites.tab.bot/

## Features
- 8 original monsters, 8 types (Fire, Water, Grass, Electric, Ice, Earth, Shadow, Wind), 4 moves each plus an Ultimate
- Photo head: selfie or gallery photo, crop/zoom, mapped onto the monster's face (stays on the device; shared only with your opponent during an online match)
- Turn-based battles with type strengths, status effects, switching, surge/ultimate with cinematic camera
- Photo-real arenas (HDRI ground projection), bloom, soft shadows, particle effects, synthesised sound + music
- Online rooms on a Cloudflare Worker + D1 (short polling), Quick Match queue, rematch, emotes
- Android WebView wrapper (android/)

## Layout
- `src/` game source (three.js), `src/engine.js` shared battle rules (browser + server), `src/worker.js` API
- `site/` built site (static assets + `_worker.js`)
- `android/` Android wrapper app (signing config is read from an external file, not in this repo)
- `tools/devserver.mjs` local server with a SQLite-backed D1 shim

Build: `npm i three@0.170.0 esbuild` then
`npx esbuild src/main.js --bundle --format=esm --minify --outfile=site/js/game.js` and
`npx esbuild src/worker.js --bundle --format=esm --outfile=site/_worker.js`.

## Credits
- 3D monsters: "Ultimate Monsters" by Quaternius (quaternius.com), CC0 1.0 — renamed and reworked
- HDRIs: Poly Haven (polyhaven.com), CC0
- Fonts: Lilita One, Nunito (SIL OFL)
- three.js (MIT)
