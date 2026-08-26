/**
 * Checks that every point the country pages draw actually lands inside the
 * frame drawn for it.
 *
 * Written after a framing change silently pushed New Zealand's two cities off
 * the map while a capitals-only check still passed, and after three Natural
 * Earth features sharing the code "AU" framed Australia on a sand cay. Both
 * were invisible in the data and obvious on screen; this makes them visible in
 * the data.
 *
 * Run: node scripts/verify-map.mjs   (or `npm run check:map`)
 */

import { readFileSync, readdirSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const insetSource = read("data/country-insets.ts");
const insets = JSON.parse(
  insetSource.match(/COUNTRY_INSETS: Record<string, CountryInset> = (\{[\s\S]*\n\});/)[1],
);
const WIDTH = Number(insetSource.match(/INSET_WIDTH = (\d+)/)[1]);

const failures = [];

function check(slug, label, lat, lon) {
  const inset = insets[slug];
  if (!inset) return failures.push(`${slug}: no inset at all (${label})`);

  const x = inset.lon[0] * lon + inset.lon[1];
  const y = inset.lat[0] * lat + inset.lat[1];
  if (x < 0 || x > WIDTH || y < 0 || y > inset.height) {
    failures.push(
      `${slug}: ${label} projects to ${Math.round(x)},${Math.round(y)} — outside ${WIDTH}x${inset.height}`,
    );
  }
}

/* Capitals. */
const countrySource = read("data/countries.ts");
const countryRe =
  /slug:\s*"([a-z-]+)",\s*\n\s*name:\s*"([^"]+)",\s*\n\s*iso2:[\s\S]*?capital:\s*"([^"]+)",\s*\n\s*lat:\s*(-?[\d.]+),\s*\n\s*lon:\s*(-?[\d.]+)/g;
const capitals = [...countrySource.matchAll(countryRe)];
for (const [, slug, , capital, lat, lon] of capitals) {
  check(slug, `capital ${capital}`, Number(lat), Number(lon));
}

/* Every dish's home city. */
let recipeSource = "";
for (const file of readdirSync("data/recipes")) {
  if (file.endsWith(".ts") && !["index.ts", "_shared.ts"].includes(file)) {
    recipeSource += read(`data/recipes/${file}`) + "\n";
  }
}
const originRe =
  /name:\s*"([^"]+)",[\s\S]*?origin:\s*\{\s*city:\s*"([^"]+)",\s*lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)\s*\},\s*\n\s*countrySlug:\s*"([a-z-]+)"/g;
const origins = [...recipeSource.matchAll(originRe)];
for (const [, dish, city, lat, lon, slug] of origins) {
  check(slug, `${dish} from ${city}`, Number(lat), Number(lon));
}

/* A frame that lost its country is worse than one that lost a marker. */
for (const [slug, inset] of Object.entries(insets)) {
  const points = (inset.path.match(/[ML]/g) ?? []).length;
  if (points < 12) failures.push(`${slug}: outline has only ${points} points — over-simplified`);
}

console.log(`${capitals.length} capitals, ${origins.length} dish origins, ${Object.keys(insets).length} outlines`);
if (failures.length) {
  for (const line of failures) console.log(`  FAIL  ${line}`);
  console.log(`\n${failures.length} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("all inside their frames, no degenerate outlines");
}
