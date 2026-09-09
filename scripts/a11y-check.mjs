/**
 * Checks the quality floor: no horizontal overflow from 320px up, every
 * interactive element reachable and visibly focused, images described, and
 * reduced-motion honored.
 *
 * Run: node scripts/a11y-check.mjs
 */

import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const ROUTES = [
  "/",
  "/recipes",
  "/recipes/jollof-rice",
  "/countries",
  "/meal-planner",
  "/shopping-list",
  // With a kitchen selected, so the results and their coverage strips are
  // actually on the page when contrast and overflow are measured.
  "/cook-with?have=chicken,onion,tomato,rice",
];
const WIDTHS = [320, 390, 768, 1024, 1440];

const results = [];
const check = (name, passed, detail = "") => {
  results.push(passed);
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});

/* ------------------------------------------------- horizontal overflow */

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  const offenders = [];

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 400));
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        wide: [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 2)
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`),
      };
    });
    if (overflow.scrollWidth > overflow.clientWidth + 2) {
      offenders.push(`${route} (${overflow.scrollWidth}>${overflow.clientWidth}) ${overflow.wide.join(" ")}`);
    }
  }

  check(`No horizontal scroll at ${width}px`, offenders.length === 0, offenders.join(" | "));
  await page.close();
}

/* ------------------------------------------------------ images + labels */

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

for (const route of ["/", "/recipes/jollof-rice"]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 500));

  const audit = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    return {
      missingAlt: imgs.filter((img) => !img.hasAttribute("alt")).length,
      brokenImages: imgs.filter((img) => img.complete && img.naturalWidth === 0).length,
      unlabeledButtons: [...document.querySelectorAll("button")].filter(
        (b) => !b.textContent?.trim() && !b.getAttribute("aria-label"),
      ).length,
      h1Count: document.querySelectorAll("h1").length,
    };
  });

  check(`${route}: every image has alt`, audit.missingAlt === 0, `${audit.missingAlt} missing`);
  check(`${route}: no broken images`, audit.brokenImages === 0, `${audit.brokenImages} broken`);
  check(
    `${route}: every button is labeled`,
    audit.unlabeledButtons === 0,
    `${audit.unlabeledButtons} unlabeled`,
  );
  check(`${route}: exactly one h1`, audit.h1Count === 1, `${audit.h1Count} found`);
}

/* --------------------------------------------------------- focus rings */

await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 600));

let visibleRings = 0;
for (let i = 0; i < 12; i += 1) {
  await page.keyboard.press("Tab");
  const styled = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  });
  if (styled) visibleRings += 1;
}
check("Keyboard focus is visible while tabbing", visibleRings >= 10, `${visibleRings}/12 focused elements had an outline`);

/* ------------------------------------------------------ reduced motion */

await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
const motion = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".u-rise")];
  return {
    total: els.length,
    hidden: els.filter((el) => getComputedStyle(el).opacity !== "1").length,
    longTransitions: els.filter((el) => parseFloat(getComputedStyle(el).transitionDuration) > 0.1)
      .length,
  };
});
check(
  "Reduced motion shows all content immediately",
  motion.hidden === 0,
  `${motion.hidden}/${motion.total} hidden`,
);
check(
  "Reduced motion disables transitions",
  motion.longTransitions === 0,
  `${motion.longTransitions} still animating`,
);

/* ------------------------------------------------------- colour contrast */

/*
 * Measured from what the browser actually painted, not from a list of token
 * pairs. A hardcoded list only ever proves the combinations someone thought
 * to write down, and the palette failure worth catching is the one nobody
 * meant to create.
 */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  const offenders = [];
  let overImages = 0;

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 400));

    const bad = await page.evaluate(() => {
      /*
       * Tailwind v4 computes alpha-modified colours through oklab, so
       * getComputedStyle returns strings like
       * "oklab(0.974 0.001 0.011 / 0.5)". Painting the value into a canvas and
       * reading the pixel back lets the browser do the conversion, which works
       * for every colour syntax rather than the ones a regex anticipates.
       */
      const probe = document.createElement("canvas");
      probe.width = 1;
      probe.height = 1;
      const ctx = probe.getContext("2d", { willReadFrequently: true });
      const parse = (value) => {
        if (!value) return null;
        ctx.clearRect(0, 0, 1, 1);
        // An unparseable value leaves fillStyle untouched, so seed it with
        // something transparent and treat that as "no colour".
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: a / 255 };
      };
      const over = (top, bottom) => ({
        r: top.r * top.a + bottom.r * (1 - top.a),
        g: top.g * top.a + bottom.g * (1 - top.a),
        b: top.b * top.a + bottom.b * (1 - top.a),
        a: 1,
      });
      const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (c) =>
        0.2126 * lin(c.r / 255) + 0.7152 * lin(c.g / 255) + 0.0722 * lin(c.b / 255);
      const ratio = (a, b) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };

      /** The colour actually behind an element, compositing every layer. */
      function backdrop(el) {
        const layers = [];
        for (let node = el; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          // A photo or gradient behind the text: not something a ratio can judge.
          if (style.backgroundImage !== "none") return null;
          const bg = parse(style.backgroundColor);
          if (bg && bg.a > 0) {
            layers.push(bg);
            if (bg.a === 1) break;
          }
        }
        let base = { r: 255, g: 255, b: 255, a: 1 };
        for (const layer of layers.reverse()) base = over(layer, base);
        return base;
      }

      /*
       * Text laid over a photograph cannot be judged by walking ancestor
       * background colours — the pixels behind it belong to an <img>. Those
       * nodes are counted and reported rather than quietly passed.
       */
      const media = [...document.querySelectorAll("img, video, canvas")].map((el) =>
        el.getBoundingClientRect(),
      );
      const overlapsMedia = (box) =>
        media.some(
          (m) =>
            m.width > 0 &&
            !(box.right <= m.left || box.left >= m.right || box.bottom <= m.top || box.top >= m.bottom),
        );

      const found = [];
      let skipped = 0;
      for (const el of document.querySelectorAll("body *")) {
        // Only elements holding their own text, so a ratio is judged once.
        const text = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join(" ")
          .trim();
        if (!text) continue;

        /*
         * SVG paints with `fill`, not `color`, and the map labels are
         * deliberately transparent until hovered. Neither is something this
         * measurement understands, so they are counted, not guessed at.
         */
        if (el.ownerSVGElement) {
          skipped += 1;
          continue;
        }

        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        if (el.closest('[class*="sr-only"]') || style.clip === "rect(0px, 0px, 0px, 0px)") continue;
        // Marked decorative, so it carries no information — the "/" between
        // metadata items is drawn in the hairline colour on purpose.
        if (el.closest('[aria-hidden="true"]')) continue;
        const box = el.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) continue;

        const colour = parse(style.color);
        if (!colour || colour.a === 0) continue;

        const behind = backdrop(el);
        if (!behind || overlapsMedia(box)) {
          skipped += 1;
          continue;
        }

        const size = parseFloat(style.fontSize);
        const weight = Number(style.fontWeight) || 400;
        // WCAG large text: 24px, or 18.66px when bold.
        const needed = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
        const value = ratio(over(colour, behind), behind);

        if (value + 0.005 < needed) {
          found.push({
            text: text.slice(0, 32),
            ratio: Number(value.toFixed(2)),
            needed,
            size: Math.round(size),
            colour: style.color,
          });
        }
      }
      return { found, skipped };
    });

    for (const item of bad.found) offenders.push({ route, ...item });
    overImages += bad.skipped;
  }

  const worst = offenders.sort((a, b) => a.ratio - b.ratio).slice(0, 5);
  check(
    "Text meets WCAG AA contrast",
    offenders.length === 0,
    offenders.length
      ? worst
          .map((o) => `"${o.text}" ${o.ratio}:1 need ${o.needed} (${o.size}px, ${o.route})`)
          .join(" | ")
      : `every HTML text node measured; ${overImages} over photography or in SVG not judged`,
  );
  await page.close();
}

await browser.close();

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) process.exitCode = 1;
