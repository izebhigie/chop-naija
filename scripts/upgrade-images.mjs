/**
 * Some Wikipedia lead images are small or poorly lit. This searches Wikimedia
 * Commons for better-resolution photographs of the same dish and replaces the
 * file only when it finds a genuinely larger one.
 *
 * Run: node scripts/upgrade-images.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const UA = "WorldPlates/1.0 (recipe demo app; contact: izebhigie@gmail.com)";
const WIDTH = 1600;
const QUALITY = 76;
const MIN_PIXELS = 1_400_000; // roughly 1400x1000 and up

/** slug -> Commons search terms, tried in order */
const CANDIDATES = {
  feijoada: ["feijoada brasileira", "feijoada completa", "feijoada"],
  "jerk-chicken": ["jerk chicken jamaica", "jerk chicken"],
  "banh-mi": ["banh mi sandwich", "bánh mì thịt"],
  "lamb-tagine": ["tajine lamb", "tagine moroccan food", "tajine"],
  "arepas-rellenas": ["arepa reina pepiada", "arepas venezolanas", "arepa"],
  lamington: ["lamington cake", "lamingtons"],
  poutine: ["poutine fries", "poutine"],
  kibbeh: ["kibbeh", "kibbeh nayyeh"],
};

const BANNED = /(logo|map|coat[_ ]of[_ ]arms|flag|diagram|chart|icon|stamp|poster)/i;

const stripHtml = (s) =>
  String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function search(term) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
    "&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch=" +
    encodeURIComponent(term) +
    "&prop=imageinfo&iiprop=url|size|extmetadata";
  const json = await getJson(url);
  const pages = Object.values(json?.query?.pages ?? {});
  return pages
    .map((p) => {
      const info = p?.imageinfo?.[0];
      if (!info) return null;
      return {
        title: p.title,
        // Commons appends utm_* tracking params; strip them before use.
        url: String(info.url).split("?")[0],
        width: info.width,
        height: info.height,
        author: (stripHtml(info.extmetadata?.Artist?.value) || "Wikimedia Commons contributor").slice(0, 80),
        licence: stripHtml(info.extmetadata?.LicenseShortName?.value) || "See Wikimedia Commons",
      };
    })
    .filter(Boolean)
    .filter((c) => /\.(jpe?g|png)$/i.test(c.url))
    .filter((c) => !BANNED.test(c.title))
    .filter((c) => c.width * c.height >= MIN_PIXELS)
    .filter((c) => c.width / c.height > 0.6 && c.width / c.height < 2.2)
    .sort((a, b) => b.width * b.height - a.width * a.height);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "public", "dishes");
const jsonPath = path.join(here, "..", "data", "images.generated.json");
const manifest = JSON.parse(await readFile(jsonPath, "utf8"));

for (const [slug, terms] of Object.entries(CANDIDATES)) {
  const current = manifest[slug];
  const currentPixels = current ? current.width * current.height : 0;
  let best = null;

  for (const term of terms) {
    try {
      const results = await search(term);
      if (results.length) {
        best = results[0];
        break;
      }
    } catch {
      /* try the next term */
    }
  }

  if (!best) {
    console.log(`skip  ${slug.padEnd(20)} no candidate found`);
    continue;
  }
  if (best.width * best.height <= currentPixels * 1.3) {
    console.log(`keep  ${slug.padEnd(20)} existing image is comparable`);
    continue;
  }

  try {
    const res = await fetch(best.url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());

    await sharp(input)
      .rotate()
      .resize({ width: WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
      .toFile(path.join(outDir, `${slug}.jpg`));

    const tiny = await sharp(input).rotate().resize({ width: 16 }).jpeg({ quality: 40 }).toBuffer();
    const w = Math.min(WIDTH, best.width);
    const h = Math.round((best.height / best.width) * w);

    manifest[slug] = {
      src: `/dishes/${slug}.jpg`,
      width: w,
      height: h,
      blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
      article: best.title,
      author: best.author,
      licence: best.licence,
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(best.title)}`,
    };
    console.log(`up    ${slug.padEnd(20)} ${w}x${h}  ${best.title.replace("File:", "")}`);
  } catch (err) {
    console.log(`fail  ${slug.padEnd(20)} ${err.message}`);
  }

  await new Promise((r) => setTimeout(r, 150));
}

await writeFile(jsonPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("\nmanifest updated");
