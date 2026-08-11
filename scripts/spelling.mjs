/**
 * One-off sweep to settle on American spellings, matching the brief's own
 * copy ("Flavors from every corner of the world", "Favorites", /favorites).
 *
 * Deliberately conservative: an explicit word list, whole-word matching, and
 * case preserved. Ingredient nouns (aubergine, courgette, coriander) are left
 * alone — those are the names the dishes use, not misspellings. The internal
 * `fibre` field is also left alone; only its visible label is Americanised.
 *
 * Run: node scripts/spelling.mjs
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PAIRS = [
  ["flavour", "flavor"],
  ["flavours", "flavors"],
  ["flavoured", "flavored"],
  ["colour", "color"],
  ["colours", "colors"],
  ["coloured", "colored"],
  ["favourite", "favorite"],
  ["favourites", "favorites"],
  ["savoury", "savory"],
  ["savour", "savor"],
  ["caramelise", "caramelize"],
  ["caramelised", "caramelized"],
  ["caramelising", "caramelizing"],
  ["standardise", "standardize"],
  ["standardised", "standardized"],
  ["organise", "organize"],
  ["organised", "organized"],
  ["realise", "realize"],
  ["recognise", "recognize"],
  ["emphasise", "emphasize"],
  ["neighbour", "neighbor"],
  ["neighbouring", "neighboring"],
  ["centre", "center"],
  ["centres", "centers"],
  ["grey", "gray"],
  ["Americanised", "Americanized"],
  ["apologise", "apologize"],
];

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", ".next", ".git", "public", "out"]);
const EXTS = new Set([".ts", ".tsx", ".css", ".md"]);

function applyCase(source, replacement) {
  if (source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTS.has(path.extname(entry.name))) yield full;
  }
}

let changedFiles = 0;
let changedWords = 0;

for await (const file of walk(ROOT)) {
  const original = await readFile(file, "utf8");
  let next = original;

  for (const [british, american] of PAIRS) {
    const pattern = new RegExp(`\\b${british}\\b`, "gi");
    next = next.replace(pattern, (match) => {
      changedWords += 1;
      return applyCase(match, american);
    });
  }

  if (next !== original) {
    await writeFile(file, next, "utf8");
    changedFiles += 1;
    console.log(`updated ${path.relative(ROOT, file)}`);
  }
}

console.log(`\n${changedWords} words across ${changedFiles} files`);
