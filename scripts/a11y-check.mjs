/**
 * Checks the quality floor: no horizontal overflow from 320px up, every
 * interactive element reachable and visibly focused, images described, and
 * reduced-motion honored.
 *
 * Run: node scripts/a11y-check.mjs
 */

import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const ROUTES = ["/", "/recipes", "/recipes/jollof-rice", "/countries", "/meal-planner", "/shopping-list"];
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

await browser.close();

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) process.exitCode = 1;
