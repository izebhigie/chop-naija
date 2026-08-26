/**
 * Renders the social card and the favicon to real PNG files.
 *
 * Both are generated from JSX through Satori, but they are *static* — nothing
 * about them varies per request — so they ship as files rather than as
 * `app/opengraph-image.tsx` routes. That is not only cheaper: Next 16's dev
 * server fails to serve generated metadata images at all (it pipes them
 * through sharp and errors with "Input buffer contains unsupported image
 * format"), which put a broken favicon and two console errors on every page
 * during development. A file has none of those problems.
 *
 * The generators still live in `scripts/og/`. This script drops them into
 * `app/` just long enough for a production build to render them, copies the
 * output out, and puts everything back.
 *
 * Run: node scripts/og-images.mjs   (or `npm run images:og`)
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

/** name → the route segment Next writes the rendered bytes to. */
const IMAGES = [
  { name: "opengraph-image", built: "opengraph-image.body" },
  { name: "icon", built: "icon.body" },
];

const staged = [];

function stage() {
  for (const { name } of IMAGES) {
    const from = join(root, "scripts", "og", `${name}.tsx`);
    const to = join(root, "app", `${name}.tsx`);
    if (!existsSync(from)) throw new Error(`missing generator: ${from}`);

    // The .png and the .tsx are the same route, so the file has to go first
    // or the build fails on the conflict.
    const png = join(root, "app", `${name}.png`);
    if (existsSync(png)) rmSync(png);

    copyFileSync(from, to);
    staged.push(to);
  }
}

function unstage() {
  for (const path of staged) rmSync(path, { force: true });
}

try {
  stage();

  console.log("Building to render the images…");
  const build = spawnSync("npx", ["next", "build"], {
    stdio: ["ignore", "pipe", "inherit"],
    shell: process.platform === "win32",
  });
  if (build.status !== 0) throw new Error("next build failed — images not written");
} finally {
  // Always put app/ back, even if the build blew up half way through.
  unstage();
}

for (const { name, built } of IMAGES) {
  const from = join(root, ".next", "server", "app", built);
  const to = join(root, "app", `${name}.png`);
  if (!existsSync(from)) throw new Error(`build produced no ${built}`);
  copyFileSync(from, to);
  console.log(`  app/${name}.png  ${statSync(to).size} bytes`);
}

console.log("\nDone. Rebuild once more so the app picks up the new files.");
