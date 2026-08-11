/**
 * Builds a labelled contact sheet of replacement candidates for specific
 * dishes, so a human (or a model with eyes) can pick the right one rather than
 * trusting a filename or a pixel count.
 *
 * Run: node scripts/candidates.mjs
 * Then: scripts/out/candidates.jpg + scripts/out/candidates.json
 */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const UA = "WorldPlates/1.0 (recipe demo app; contact: izebhigie@gmail.com)";
const CELL = 260;
const LABEL = 24;
const PER_ROW = 6;

/** slug -> Commons search terms */
const WANTED = {
  "banh-mi": "banh mi baguette vietnamese sandwich",
  "chicken-adobo": "adobong manok filipino chicken adobo dish",
  feijoada: "feijoada served plate rice",
  "hangi-lamb": "hangi food plate maori",
  kibbeh: "kibbeh plate lebanese",
  "pho-bo": "pho bo beef noodle soup bowl",
  "ropa-vieja": "ropa vieja cuban shredded beef",
};

const BANNED = /(logo|map|coat[_ ]of[_ ]arms|flag|diagram|chart|icon|stamp|poster|sign|menu)/i;

const stripHtml = (s) =>
  String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function search(term) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
    "&generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=" +
    encodeURIComponent(term) +
    "&prop=imageinfo&iiprop=url|size|extmetadata";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const json = await res.json();
  return Object.values(json?.query?.pages ?? {})
    .map((p) => {
      const i = p?.imageinfo?.[0];
      if (!i) return null;
      return {
        title: p.title,
        url: String(i.url).split("?")[0],
        width: i.width,
        height: i.height,
        author: (stripHtml(i.extmetadata?.Artist?.value) || "Wikimedia Commons contributor").slice(0, 80),
        licence: stripHtml(i.extmetadata?.LicenseShortName?.value) || "See Wikimedia Commons",
      };
    })
    .filter(Boolean)
    .filter((c) => /\.(jpe?g|png)$/i.test(c.url.split("?")[0]))
    .filter((c) => !BANNED.test(c.title))
    .filter((c) => c.width >= 900 && c.height >= 700)
    .filter((c) => c.width / c.height > 0.7 && c.width / c.height < 2.1)
    .slice(0, PER_ROW);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "out");
await mkdir(outDir, { recursive: true });

const slugs = Object.keys(WANTED);
const chosen = {};
const composites = [];

for (const [row, slug] of slugs.entries()) {
  const results = await search(WANTED[slug]);
  chosen[slug] = results.map((r) => ({ title: r.title, author: r.author, licence: r.licence }));
  console.log(`${slug}: ${results.length} candidates`);

  for (const [col, cand] of results.entries()) {
    try {
      const res = await fetch(cand.url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const thumb = await sharp(buf).rotate().resize(CELL, CELL, { fit: "cover" }).toBuffer();
      composites.push({ input: thumb, left: col * CELL, top: row * (CELL + LABEL) });

      const label = Buffer.from(
        `<svg width="${CELL}" height="${LABEL}">
           <rect width="100%" height="100%" fill="#0F3D2E"/>
           <text x="5" y="17" font-family="monospace" font-size="13" fill="#FAF6EE">${row}.${col}  ${slug}</text>
         </svg>`,
      );
      composites.push({ input: label, left: col * CELL, top: row * (CELL + LABEL) + CELL });
    } catch {
      /* skip this candidate */
    }
  }
}

await sharp({
  create: {
    width: PER_ROW * CELL,
    height: slugs.length * (CELL + LABEL),
    channels: 3,
    background: "#FAF6EE",
  },
})
  .composite(composites)
  .jpeg({ quality: 70 })
  .toFile(path.join(outDir, "candidates.jpg"));

await writeFile(
  path.join(outDir, "candidates.json"),
  JSON.stringify({ order: slugs, candidates: chosen }, null, 2),
  "utf8",
);
console.log("\nwrote scripts/out/candidates.jpg");
