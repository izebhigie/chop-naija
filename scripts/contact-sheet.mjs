/**
 * Tiles every dish photo into one image so the whole set can be reviewed at a
 * glance — checking 33 photos individually is slow, and the failures (wrong
 * dish, bad lighting, watermark) are obvious at thumbnail size.
 *
 * Run: node scripts/contact-sheet.mjs   ->  scripts/out/contact-sheet.jpg
 */

import { readFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const CELL = 300;
const LABEL = 26;
const COLS = 6;

const here = path.dirname(fileURLToPath(import.meta.url));
const dishDir = path.join(here, "..", "public", "dishes");
const outDir = path.join(here, "out");
await mkdir(outDir, { recursive: true });

const files = (await readdir(dishDir)).filter((f) => f.endsWith(".jpg")).sort();
const rows = Math.ceil(files.length / COLS);
const cellH = CELL + LABEL;

const composites = [];
for (const [i, file] of files.entries()) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);

  const thumb = await sharp(await readFile(path.join(dishDir, file)))
    .resize(CELL, CELL, { fit: "cover" })
    .toBuffer();
  composites.push({ input: thumb, left: col * CELL, top: row * cellH });

  const name = file.replace(".jpg", "");
  const label = Buffer.from(
    `<svg width="${CELL}" height="${LABEL}">
       <rect width="100%" height="100%" fill="#0F3D2E"/>
       <text x="6" y="18" font-family="monospace" font-size="14" fill="#FAF6EE">${name}</text>
     </svg>`,
  );
  composites.push({ input: label, left: col * CELL, top: row * cellH + CELL });
}

await sharp({
  create: {
    width: COLS * CELL,
    height: rows * cellH,
    channels: 3,
    background: "#FAF6EE",
  },
})
  .composite(composites)
  .jpeg({ quality: 72 })
  .toFile(path.join(outDir, "contact-sheet.jpg"));

console.log(`contact sheet: ${files.length} dishes, ${COLS}x${rows}`);
