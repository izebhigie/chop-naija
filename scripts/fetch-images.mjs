/**
 * Builds the app's food photography.
 *
 * For every dish, this pulls the lead photograph from its Wikipedia article,
 * resizes it locally, and writes it to public/dishes/. It also records the
 * photographer and licence so the app can credit them.
 *
 * Why Wikipedia rather than a stock library: a stock search for "tagine"
 * returns whatever is photogenic, which is how recipe sites end up showing the
 * wrong dish. An article's lead image is the dish, verified by the people who
 * wrote the article. Serving the files locally also means an image can never
 * fail to load at runtime.
 *
 * Run: node scripts/fetch-images.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const UA = "WorldPlates/1.0 (recipe demo app; contact: izebhigie@gmail.com)";
const WIDTH = 1600;
const QUALITY = 76;

/** slug -> Wikipedia article title, then fallbacks if the lead image is missing */
const TARGETS = {
  // Africa
  "jollof-rice": ["Jollof_rice"],
  "doro-wat": ["Doro_wat", "Ethiopian_cuisine"],
  bobotie: ["Bobotie", "South_African_cuisine"],
  "lamb-tagine": ["Tagine"],
  // Asia
  "shoyu-ramen": ["Ramen"],
  bibimbap: ["Bibimbap"],
  "pho-bo": ["Pho"],
  "banh-mi": ["Bánh_mì"],
  "butter-chicken": ["Butter_chicken"],
  "green-curry": ["Green_curry"],
  "chicken-adobo": ["Chicken_adobo", "Philippine_adobo"],
  // Europe
  "risotto-alla-milanese": ["Risotto_alla_milanese", "Risotto"],
  "creme-brulee": ["Crème_brûlée", "Custard"],
  moussaka: ["Moussaka"],
  pierogi: ["Pierogi"],
  khachapuri: ["Khachapuri"],
  "paella-valenciana": ["Paella"],
  // North America
  "tacos-al-pastor": ["Tacos_al_pastor"],
  "chicken-gumbo": ["Gumbo"],
  poutine: ["Poutine"],
  // South America
  feijoada: ["Feijoada"],
  "ceviche-clasico": ["Ceviche"],
  "arepas-rellenas": ["Arepa"],
  // Middle East
  shakshuka: ["Shakshouka"],
  hummus: ["Hummus"],
  kibbeh: ["Kibbeh"],
  "khoresh-fesenjan": ["Fesenjān", "Iranian_cuisine"],
  // Caribbean
  "jerk-chicken": ["Jerk_(cooking)", "Jamaican_cuisine"],
  "ackee-and-saltfish": ["Ackee_and_saltfish"],
  "ropa-vieja": ["Ropa_vieja"],
  // Oceania
  pavlova: ["Pavlova_(cake)"],
  lamington: ["Lamington"],
  "hangi-lamb": ["Hāngī", "Māori_cuisine"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) =>
  String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function leadImage(title) {
  const url =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title);
  const json = await getJson(url);
  const src = json?.originalimage?.source || json?.thumbnail?.source;
  return src ? src.split("?")[0] : null;
}

function fileNameFrom(url) {
  const m = url.match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
  const raw = m ? m[1] : url.split("/").pop();
  return decodeURIComponent(raw);
}

/** A thumb URL points at a resized copy; we want the full-size original. */
function toOriginal(url) {
  const m = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/thumb\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)\/.*$/,
  );
  return m ? `${m[1]}/${m[2]}/${m[3]}/${m[4]}` : url;
}

async function getCredit(fileName) {
  try {
    const json = await getJson(
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
        "&iiprop=extmetadata&titles=" +
        encodeURIComponent(`File:${fileName}`),
    );
    const page = Object.values(json?.query?.pages ?? {})[0];
    const meta = page?.imageinfo?.[0]?.extmetadata ?? {};
    return {
      author: (stripHtml(meta.Artist?.value) || "Wikimedia Commons contributor").slice(0, 80),
      licence: stripHtml(meta.LicenseShortName?.value) || "See Wikimedia Commons",
      source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
    };
  } catch {
    return {
      author: "Wikimedia Commons contributor",
      licence: "See Wikimedia Commons",
      source: "https://commons.wikimedia.org",
    };
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "public", "dishes");
const outJson = path.join(here, "..", "data", "images.generated.json");
await mkdir(outDir, { recursive: true });
await mkdir(path.join(here, "..", "data"), { recursive: true });

async function build(slug, titles) {
  for (const title of titles) {
    try {
      const lead = await leadImage(title);
      if (!lead || /\.(svg|gif|webm|ogv)$/i.test(lead)) continue;

      const original = toOriginal(lead);
      const res = await fetch(original, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;

      const input = Buffer.from(await res.arrayBuffer());
      const pipeline = sharp(input).rotate();
      const meta = await pipeline.metadata();

      const file = `${slug}.jpg`;
      await pipeline
        .clone()
        .resize({ width: WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
        .toFile(path.join(outDir, file));

      // 16px preview, inlined as the blur placeholder so cards never flash grey
      const tiny = await sharp(input)
        .rotate()
        .resize({ width: 16 })
        .jpeg({ quality: 40 })
        .toBuffer();

      const credit = await getCredit(fileNameFrom(lead));
      const w = Math.min(WIDTH, meta.width ?? WIDTH);
      const h = Math.round(((meta.height ?? 1) / (meta.width ?? 1)) * w);

      return {
        src: `/dishes/${file}`,
        width: w,
        height: h,
        blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
        article: title,
        ...credit,
      };
    } catch (err) {
      console.log(`      (${title}: ${err.message})`);
    }
  }
  return null;
}

const out = {};
const failed = [];
const entries = Object.entries(TARGETS);

for (const [slug, titles] of entries) {
  const result = await build(slug, titles);
  if (result) {
    out[slug] = result;
    console.log(`ok    ${slug.padEnd(24)} ${result.width}x${result.height}  ${result.licence}`);
  } else {
    failed.push(slug);
    console.log(`FAIL  ${slug}`);
  }
  await sleep(150);
}

await writeFile(outJson, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\n${Object.keys(out).length}/${entries.length} images written to public/dishes/`);
if (failed.length) console.log(`Unresolved: ${failed.join(", ")}`);
