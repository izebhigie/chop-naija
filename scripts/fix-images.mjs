/**
 * One-off corrections for individual dish photographs.
 *
 * Two kinds of fix:
 *   { slug, file }  — replace the photo with a specific Wikimedia Commons file
 *   { slug, crop }  — re-crop the existing local file (fractions of width/height)
 *
 * Edit FIXES, then run: node scripts/fix-images.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const UA = "WorldPlates/1.0 (recipe demo app; contact: izebhigie@gmail.com)";
const WIDTH = 1600;

/** A crop that removes the MyPlate.gov badge from the lower right corner. */
const TRIM_BADGE = { left: 0, top: 0, width: 0.8, height: 1 };

const FIXES = [
  // Was a dark pot on a hob; this is the dish plated with white rice.
  { slug: "feijoada", file: "File:Feijoada con arroz blanco en restaurante de Argentina.jpg" },
  // Was a sandwich on sliced sourdough. A bánh mì is served in a baguette.
  { slug: "banh-mi", file: "File:Lunch at Hue Cafe (3249091535).jpg" },
  // Was an uncut slab of meat that read as raw ham.
  {
    slug: "chicken-adobo",
    file: "File:MyPlate gov Cultural Food (20241025-USDA-FNS-UNK-0011).jpg",
    crop: TRIM_BADGE,
  },
  // Was a café table with drink cans in shot.
  { slug: "kibbeh", file: "File:Mixed Plate (3186676853).jpg" },
  // Was a cluttered table; this is the bowl itself.
  { slug: "pho-bo", file: "File:Phở bò, Cầu Giấy, Hà Nội.jpg" },
  // Was underlit; this is plated with rice and black beans.
  {
    slug: "ropa-vieja",
    file: "File:MyPlate gov Cultural Food (20241025-USDA-FNS-UNK-0069).jpg",
    crop: TRIM_BADGE,
  },
];

const stripHtml = (s) =>
  String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "public", "dishes");
const jsonPath = path.join(here, "..", "data", "images.generated.json");
const manifest = JSON.parse(await readFile(jsonPath, "utf8"));

async function replaceFrom(slug, fileTitle) {
  const json = await getJson(
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
      "&iiprop=url|size|extmetadata&titles=" + encodeURIComponent(fileTitle),
  );
  const page = Object.values(json?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`no such file: ${fileTitle}`);

  const res = await fetch(String(info.url).split("?")[0], { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());

  await sharp(input)
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 76, progressive: true, mozjpeg: true })
    .toFile(path.join(outDir, `${slug}.jpg`));

  const tiny = await sharp(input).rotate().resize({ width: 16 }).jpeg({ quality: 40 }).toBuffer();
  const em = info.extmetadata ?? {};
  const w = Math.min(WIDTH, info.width);
  const h = Math.round((info.height / info.width) * w);

  manifest[slug] = {
    src: `/dishes/${slug}.jpg`,
    width: w,
    height: h,
    blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
    article: fileTitle,
    author: (stripHtml(em.Artist?.value) || "Wikimedia Commons contributor").slice(0, 80),
    licence: stripHtml(em.LicenseShortName?.value) || "See Wikimedia Commons",
    source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`,
  };
  return `${w}x${h}`;
}

async function recrop(slug, crop) {
  const filePath = path.join(outDir, `${slug}.jpg`);
  const input = await readFile(filePath);
  const meta = await sharp(input).metadata();
  const region = {
    left: Math.round((meta.width ?? 0) * crop.left),
    top: Math.round((meta.height ?? 0) * crop.top),
    width: Math.round((meta.width ?? 0) * crop.width),
    height: Math.round((meta.height ?? 0) * crop.height),
  };

  const output = await sharp(input)
    .extract(region)
    .jpeg({ quality: 76, progressive: true, mozjpeg: true })
    .toBuffer();
  await writeFile(filePath, output);

  const tiny = await sharp(output).resize({ width: 16 }).jpeg({ quality: 40 }).toBuffer();
  manifest[slug] = {
    ...manifest[slug],
    width: region.width,
    height: region.height,
    blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
  };
  return `${region.width}x${region.height}`;
}

for (const fix of FIXES) {
  try {
    const steps = [];
    let size = "";
    if (fix.file) {
      size = await replaceFrom(fix.slug, fix.file);
      steps.push("replaced");
    }
    if (fix.crop) {
      size = await recrop(fix.slug, fix.crop);
      steps.push("cropped");
    }
    console.log(`ok    ${fix.slug.padEnd(18)} ${size.padEnd(10)} ${steps.join(" + ")}`);
  } catch (err) {
    console.log(`FAIL  ${fix.slug.padEnd(18)} ${err.message}`);
  }
}

await writeFile(jsonPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("manifest updated");
