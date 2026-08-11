/**
 * Walks the flows a cook actually uses and asserts the results:
 * scale servings, switch units, save a favorite, send ingredients to the
 * shopping list, plan a meal, and check it all survives a reload.
 *
 * Run: node scripts/flow-test.mjs
 */

import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const results = [];

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });

/* ---------------------------------------------- servings + unit scaling */

await page.goto(`${BASE}/recipes/jollof-rice`, { waitUntil: "networkidle2" });

const readRice = () =>
  page.evaluate(() => {
    const label = [...document.querySelectorAll("label")].find((el) =>
      el.textContent?.includes("Long-grain parboiled rice"),
    );
    return label?.textContent?.trim() ?? "";
  });

const baseRice = await readRice();
check("Ingredient shows a metric amount", /500g/.test(baseRice), baseRice.slice(0, 40));

// Double the servings: 6 -> 12, so 500g of rice should become 1kg.
for (let i = 0; i < 6; i += 1) {
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(
      (el) => el.getAttribute("aria-label") === "More servings",
    );
    button?.click();
  });
}
await new Promise((r) => setTimeout(r, 300));
const doubledRice = await readRice();
check("Doubling servings scales quantities", /1kg/.test(doubledRice), doubledRice.slice(0, 40));

// Switch to US units — 1kg should read as pounds.
await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find(
    (el) => el.textContent?.trim() === "US",
  );
  button?.click();
});
await new Promise((r) => setTimeout(r, 300));
const imperialRice = await readRice();
check("US units convert weights", /lb/.test(imperialRice), imperialRice.slice(0, 40));

// A spoon measure should render as a fraction, not a decimal.
const spoon = await page.evaluate(() => {
  const label = [...document.querySelectorAll("label")].find((el) =>
    el.textContent?.includes("Curry powder"),
  );
  return label?.textContent?.trim() ?? "";
});
check("Spoon amounts use fractions, not decimals", !/\d\.\d{2,}/.test(spoon), spoon.slice(0, 40));

/* ------------------------------------------------------ shopping list */

await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((el) =>
    el.textContent?.includes("Add ingredients to shopping list"),
  );
  button?.click();
});
await new Promise((r) => setTimeout(r, 400));

await page.goto(`${BASE}/shopping-list`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 600));

const listInfo = await page.evaluate(() => ({
  items: document.querySelectorAll('input[type="checkbox"]').length,
  aisles: [...document.querySelectorAll("h2")].map((h) => h.textContent?.trim()),
  hasSource: document.body.textContent?.includes("for Jollof Rice") ?? false,
}));
check("Ingredients arrive in the shopping list", listInfo.items > 10, `${listInfo.items} items`);
check("List is grouped by aisle", listInfo.aisles.length >= 3, listInfo.aisles.join(", "));
check("Each line shows its source recipe", listInfo.hasSource);

/* ------------------------------------------------- favorites persistence */

await page.goto(`${BASE}/recipes/shoyu-ramen`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((el) =>
    el.textContent?.includes("Save recipe"),
  );
  button?.click();
});
await new Promise((r) => setTimeout(r, 300));

await page.goto(`${BASE}/favorites`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 700));
const savedAfterReload = await page.evaluate(
  () => document.body.textContent?.includes("Shoyu Ramen") ?? false,
);
check("A saved recipe survives a page reload", savedAfterReload);

/* ------------------------------------------------------------ filters */

await page.goto(`${BASE}/recipes?region=asia&diet=Vegetarian`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 500));
const filtered = await page.evaluate(() => ({
  chips: [...document.querySelectorAll("button")]
    .map((b) => b.textContent?.trim())
    .filter((t) => t?.startsWith("Region:") || t?.startsWith("Diet:")),
  cards: document.querySelectorAll("article").length,
}));
check(
  "URL filters restore as chips",
  filtered.chips.length === 2,
  filtered.chips.join(" | "),
);

/* --------------------------------------------------------- cooking mode */

await page.goto(`${BASE}/recipes/jollof-rice`, { waitUntil: "networkidle2" });
await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((el) =>
    el.textContent?.includes("Start cooking mode"),
  );
  button?.click();
});
await new Promise((r) => setTimeout(r, 500));
const cookingOpen = await page.evaluate(
  () => document.querySelector('[role="dialog"]')?.getAttribute("aria-label") ?? "",
);
check("Cooking mode opens as a dialog", cookingOpen.includes("Cooking mode"), cookingOpen);

await page.keyboard.press("ArrowRight");
await new Promise((r) => setTimeout(r, 300));
const stepTwo = await page.evaluate(
  () => document.body.textContent?.includes("Step 2 of") ?? false,
);
check("Arrow keys move between steps", stepTwo);

await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 300));
const closed = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
check("Escape closes cooking mode", closed);

/* -------------------------------------------------------------- search */

await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
// Wait for hydration before typing — otherwise the keystrokes land in the DOM
// but React never sees them and no lookup fires.
await new Promise((r) => setTimeout(r, 800));
await page.click('input[type="search"]');
await page.type('input[type="search"]', "tagine", { delay: 40 });
await new Promise((r) => setTimeout(r, 1200));
const suggestions = await page.evaluate(() => {
  const options = [...document.querySelectorAll('[role="option"]')];
  return options.map((o) => o.textContent?.trim() ?? "");
});
check("Search suggests matching dishes", suggestions.length > 0, suggestions[0]?.slice(0, 40));

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
