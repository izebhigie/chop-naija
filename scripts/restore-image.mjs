/**
 * Restores a dish photo to its Wikipedia article lead image.
 *
 * Used when a Commons search turns up something bigger but wrong — a corn dog
 * instead of poutine, a shop window instead of a cake. A smaller correct
 * photograph always beats a larger incorrect one.
 *
 * Run: node scripts/restore-image.mjs <slug>=<Article_Title> [...]
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const UA = "WorldPlates/1.0 (recipe demo app; contact: izebhigie@gmail.com)";
const WIDTH = 1600;

const stripHtml = (s) =>
  String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toOriginal(url) {
  const m = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/thumb\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)\/.*$/,
  );
  return m ? `${m[1]}/${m[2]}/${m[3]}/${m[4]}` : url;
}

function fileNameFrom(url) {
  const m = url.match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
  return decodeURIComponent(m ? m[1] : url.split("/").pop());
}

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "public", "dishes");
const jsonPath = path.join(here, "..", "data", "images.generated.json");
const manifest = JSON.parse(await readFile(jsonPath, "utf8"));

for (const arg of process.argv.slice(2)) {
  const [slug, title] = arg.split("=");
  if (!slug || !title) continue;

  const summary = await getJson(
    "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title),
  );
  const lead = (summary?.originalimage?.source || summary?.thumbnail?.source || "").split("?")[0];
  if (!lead) {
    console.log(`FAIL  ${slug}: no lead image on ${title}`);
    continue;
  }

  const res = await fetch(toOriginal(lead), { headers: { "User-Agent": UA } });
  const input = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(input).metadata();

  await sharp(input)
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 76, progressive: true, mozjpeg: true })
    .toFile(path.join(outDir, `${slug}.jpg`));

  const tiny = await sharp(input).rotate().resize({ width: 16 }).jpeg({ quality: 40 }).toBuffer();

  const fileName = fileNameFrom(lead);
  let author = "Wikimedia Commons contributor";
  let licence = "See Wikimedia Commons";
  try {
    const info = await getJson(
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
        "&iiprop=extmetadata&titles=" + encodeURIComponent(`File:${fileName}`),
    );
    const page = Object.values(info?.query?.pages ?? {})[0];
    const em = page?.imageinfo?.[0]?.extmetadata ?? {};
    author = (stripHtml(em.Artist?.value) || author).slice(0, 80);
    licence = stripHtml(em.LicenseShortName?.value) || licence;
  } catch {
    /* keep the defaults */
  }

  const w = Math.min(WIDTH, meta.width ?? WIDTH);
  const h = Math.round(((meta.height ?? 1) / (meta.width ?? 1)) * w);

  manifest[slug] = {
    src: `/dishes/${slug}.jpg`,
    width: w,
    height: h,
    blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
    article: title,
    author,
    licence,
    source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
  };
  console.log(`ok    ${slug.padEnd(18)} ${w}x${h}  ${title}`);
}

await writeFile(jsonPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("manifest updated");
