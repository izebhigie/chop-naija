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

/* ------------------------------------------------------------ step timers */

// Back to step 1, which has a 15 minute simmer on it.
await page.keyboard.press("ArrowLeft");
await new Promise((r) => setTimeout(r, 300));

const readClock = () =>
  page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const spans = [...(dialog?.querySelectorAll("span") ?? [])];
    const clock = spans.find((el) => /^\d+:\d{2}$/.test(el.textContent?.trim() ?? ""));
    return clock?.textContent?.trim() ?? "";
  });

const seconds = (clock) => {
  const [m, s] = clock.split(":").map(Number);
  return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : NaN;
};

const timerLabel = await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((el) =>
    /^Start .+ timer$/.test(el.textContent?.trim() ?? ""),
  );
  if (!button) return "";
  const label = button.textContent.trim();
  button.click();
  return label;
});
check("A step with a duration offers a timer", Boolean(timerLabel), timerLabel || "no button");

await new Promise((r) => setTimeout(r, 1500));
const firstClock = await readClock();
await new Promise((r) => setTimeout(r, 1600));
const secondClock = await readClock();
check(
  "The timer counts down",
  seconds(secondClock) < seconds(firstClock),
  `${firstClock} → ${secondClock}`,
);

await page.evaluate(() => {
  document.querySelector('[aria-label="Pause timer"]')?.click();
});
const pausedAt = await readClock();
await new Promise((r) => setTimeout(r, 1600));
const stillPaused = await readClock();
check("Pausing stops the clock", pausedAt === stillPaused, `${pausedAt} = ${stillPaused}`);

await page.evaluate(() => {
  document.querySelector('[aria-label="Resume timer"]')?.click();
});
await new Promise((r) => setTimeout(r, 200));
const beforeExtend = seconds(await readClock());
await page.evaluate(() => {
  document.querySelector('[aria-label="Add a minute to the timer"]')?.click();
});
await new Promise((r) => setTimeout(r, 200));
const afterExtend = seconds(await readClock());
check(
  "Adding a minute extends the timer",
  afterExtend >= beforeExtend + 55,
  `${beforeExtend}s → ${afterExtend}s`,
);

// The whole point of the footer bar: the sauce is still visible from step 3.
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await new Promise((r) => setTimeout(r, 400));
const carried = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const onStep = dialog?.textContent?.includes("Step 3 of") ?? false;
  const chip = [...(dialog?.querySelectorAll("button") ?? [])].find((el) =>
    /^Step 1 · \d+:\d{2}/.test(el.textContent?.trim() ?? ""),
  );
  return { onStep, chip: chip?.textContent?.trim() ?? "" };
});
check(
  "A running timer stays visible from other steps",
  carried.onStep && Boolean(carried.chip),
  carried.chip || "no chip",
);

await page.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((el) =>
    /^Step 1 · \d+:\d{2}/.test(el.textContent?.trim() ?? ""),
  );
  chip?.click();
});
await new Promise((r) => setTimeout(r, 300));
const jumped = await page.evaluate(
  () => document.querySelector('[role="dialog"]')?.textContent?.includes("Step 1 of") ?? false,
);
check("Selecting a running timer jumps back to its step", jumped);

/*
 * Reaching zero is the whole point, and waiting sixteen real minutes for it
 * is not a test. Because timers are measured against the wall clock rather
 * than counted down, moving the clock forward is enough to land on the
 * deadline — which is also a fair simulation of a throttled background tab
 * that misses every tick until it is foregrounded again.
 */
await page.evaluate(() => {
  const real = Date.now.bind(Date);
  Date.now = () => real() + 20 * 60 * 1000;
});
await new Promise((r) => setTimeout(r, 900));

const finished = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return {
    shown: dialog?.textContent?.includes("Time is up") ?? false,
    announced: document.querySelector('[role="alert"]')?.textContent?.trim() ?? "",
  };
});
check("The timer reports when it runs out", finished.shown);
check(
  "Finishing is announced, not only chimed",
  /Step 1 timer finished/.test(finished.announced),
  finished.announced || "nothing announced",
);

await page.evaluate(() => {
  const button =
    document.querySelector('[aria-label="Dismiss timer"]') ??
    document.querySelector('[aria-label="Cancel timer"]');
  button?.click();
});
await new Promise((r) => setTimeout(r, 300));
const cleared = await page.evaluate(
  () => !(document.querySelector('[role="dialog"]')?.textContent?.includes("Time is up") ?? false),
);
check("Dismissing removes the timer", cleared);

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
// Wait for the listbox rather than for a fixed number of milliseconds: the
// lookup is debounced and then goes over the network, so any sleep long
// enough to be reliable is mostly spent waiting for nothing.
await page
  .waitForSelector('[role="option"]', { timeout: 5000 })
  .catch(() => {});
const suggestions = await page.evaluate(() => {
  const options = [...document.querySelectorAll('[role="option"]')];
  return options.map((o) => o.textContent?.trim() ?? "");
});
check("Search suggests matching dishes", suggestions.length > 0, suggestions[0]?.slice(0, 40));

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
