#!/bin/sh
# Build the site: bundles the game and the API worker, stamps a cache-busting version into index.html
set -e
cd "$(dirname "$0")"
npx esbuild src/main.js --bundle --format=esm --minify --outfile=site/js/game.js
npx esbuild src/worker.js --bundle --format=esm --outfile=site/_worker.js
V=$(cat site/js/game.js site/css/style.css | sha256sum | cut -c1-8)
sed "s/__V__/$V/g" src/index.html > site/index.html
echo "built v=$V"
