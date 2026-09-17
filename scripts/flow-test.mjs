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

/* ------------------------------------------------------ cook with what you have */

await page.goto(`${BASE}/cook-with`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));

const pressChip = (label) =>
  page.evaluate((wanted) => {
    const button = [...document.querySelectorAll("button[aria-pressed]")].find(
      (el) => el.textContent.trim() === wanted,
    );
    button?.click();
    return Boolean(button);
  }, label);

const readResults = () =>
  page.evaluate(() => {
    const heading = document.querySelector("#results-heading")?.textContent?.trim() ?? "";
    const strips = [...document.querySelectorAll("li > div")]
      .map((el) => el.textContent?.trim() ?? "")
      .filter((text) => /^(Ready to cook|You have \d+ of \d+)/.test(text));
    return { heading, cards: strips.length, first: strips[0] ?? "" };
  });

const empty = await page.evaluate(() =>
  document.body.textContent.includes("Say what you have and this fills up"),
);
check("An empty kitchen asks rather than showing everything", empty);

// Describing a kitchen is local work. Tapping chips once cost a server round
// trip each (router.replace fetches an RSC payload), which also broke offline.
let chipRequests = 0;
const countRsc = (request) => {
  const url = new URL(request.url());
  if (request.headers()["rsc"] === "1" || url.searchParams.has("_rsc")) chipRequests += 1;
};
page.on("request", countRsc);
for (const label of ["Chicken", "Onions", "Tomatoes", "Rice"]) await pressChip(label);
await new Promise((r) => setTimeout(r, 600));
page.off("request", countRsc);
check(
  "Tapping ingredients makes no server requests",
  chipRequests === 0,
  `${chipRequests} RSC requests for 4 taps`,
);

const matched = await readResults();
check(
  "Choosing ingredients ranks recipes by what is missing",
  matched.cards > 0 && /uses? something you have/.test(matched.heading),
  `${matched.cards} cards — ${matched.heading.slice(0, 48)}`,
);

// The counts on each card have to agree with each other, or the feature lies.
const consistent = await page.evaluate(() => {
  const strips = [...document.querySelectorAll("li > div")]
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => t.startsWith("You have "));
  return strips.every((text) => {
    const [, have, total] = text.match(/You have (\d+) of (\d+)/) ?? [];
    const named = (text.match(/Still need: ([^]*?)Add /)?.[1] ?? "").split("·").filter((s) => s.trim());
    return Number(total) - Number(have) === named.length;
  });
});
check("Every card's missing list matches its own count", consistent);

const shareable = await page.evaluate(() => new URL(location.href).searchParams.get("have"));
check(
  "The kitchen is carried in the URL",
  Boolean(shareable) && shareable.split(",").length === 4,
  shareable ?? "no param",
);

// Ordering: fewest still to buy comes first.
const ordered = await page.evaluate(() => {
  const counts = [...document.querySelectorAll("li > div")]
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => /^(Ready to cook|You have \d+ of \d+)/.test(t))
    .map((t) => {
      if (t.startsWith("Ready")) return 0;
      const [, have, total] = t.match(/You have (\d+) of (\d+)/);
      return Number(total) - Number(have);
    });
  return counts.every((n, i) => i === 0 || counts[i - 1] <= n);
});
check("The closest recipes come first", ordered);

await page.evaluate(() => {
  const box = [...document.querySelectorAll('input[type="checkbox"]')].at(-1);
  box?.click();
});
await new Promise((r) => setTimeout(r, 400));
const readyOnly = await page.evaluate(() => {
  const strips = [...document.querySelectorAll("li > div")]
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => /^(Ready to cook|You have \d+ of \d+)/.test(t));
  const emptyState = document.body.textContent.includes("Nothing is fully within reach yet");
  return { onlyReady: strips.every((t) => t.startsWith("Ready to cook")), emptyState };
});
check(
  "'Only what I can make now' hides anything still missing something",
  readyOnly.onlyReady || readyOnly.emptyState,
);

/* ------------------------------------------------------------ swaps */

// Start from an empty shopping list, so what arrives there is only this swap's doing.
await page.goto(`${BASE}/recipes/jollof-rice`, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));

const ingredientText = () =>
  page.evaluate(() => {
    const heading = document.getElementById("ingredients-heading");
    return heading?.closest("section")?.textContent ?? "";
  });

await page.evaluate(() => {
  document
    .querySelector('[aria-label="Use smoked paprika instead of ground crayfish"]')
    ?.click();
});
await new Promise((r) => setTimeout(r, 300));
const afterSwap = await ingredientText();
check(
  "A swap rewrites the ingredient line, with the amount it states",
  /1 tsp\s*Smoked paprika/.test(afterSwap) && !/Ground crayfish/.test(afterSwap.replace(/instead of ground crayfish/i, "")),
  afterSwap.match(/1 tsp\s*Smoked paprika[^,]{0,40}/)?.[0] ?? "no paprika line",
);
check(
  "The swapped line says what it replaced",
  /instead of ground crayfish/i.test(afterSwap),
);
check(
  "The page says allergens and nutrition still describe the original",
  /1 swap applied/.test(afterSwap) && /Allergens, nutrition and the method/.test(afterSwap),
);

// Doubling the servings has to scale the substitute like any other line.
for (let i = 0; i < 6; i += 1) {
  await page.evaluate(() => {
    document.querySelector('[aria-label="More servings"]')?.click();
  });
}
await new Promise((r) => setTimeout(r, 300));
check(
  "A swapped amount scales with the servings",
  /2 tsp\s*Smoked paprika/.test(await ingredientText()),
);

await page.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((b) => b.textContent?.includes("Add ingredients to shopping list"))
    ?.click();
});
await new Promise((r) => setTimeout(r, 400));
await page.goto(`${BASE}/shopping-list`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
const listAfterSwap = await page.evaluate(() => document.querySelector("main")?.textContent ?? "");
check(
  "The shopping list gets the substitute, not the original",
  /Smoked paprika/.test(listAfterSwap) && !/Ground crayfish/.test(listAfterSwap),
);

await page.goto(`${BASE}/recipes/jollof-rice`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  document
    .querySelector('[aria-label="Use vegetable stock instead of chicken stock"]')
    ?.click();
});
await new Promise((r) => setTimeout(r, 200));
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Undo all")?.click();
});
await new Promise((r) => setTimeout(r, 300));
const undone = await ingredientText();
check(
  "Undo all restores the original list",
  /Chicken stock/.test(undone) && !/Vegetable stock/.test(undone) && !/swap applied/.test(undone),
);

await page.goto(`${BASE}/recipes/shakshuka`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  document.querySelector('[aria-label="Leave out feta"]')?.click();
});
await new Promise((r) => setTimeout(r, 300));
const leftOut = await page.evaluate(() => {
  const heading = document.getElementById("ingredients-heading");
  const items = [...(heading?.closest("section")?.querySelectorAll("li") ?? [])];
  const feta = items.find((li) => li.textContent?.includes("Feta"));
  return {
    struck: Boolean(feta?.querySelector(".line-through")),
    labelled: /left out/i.test(feta?.textContent ?? ""),
    checkbox: Boolean(feta?.querySelector("input")),
  };
});
check(
  "A left-out ingredient stays visible, struck through, with nothing to tick",
  leftOut.struck && leftOut.labelled && !leftOut.checkbox,
  JSON.stringify(leftOut),
);

/* ------------------------------------------------------ sharing a list */

// Catch what the share sheet would have been handed.
await page.evaluateOnNewDocument(() => {
  navigator.share = async (data) => {
    window.__shared = data;
  };
});
await page.goto(`${BASE}/recipes/jollof-rice`, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((b) => b.textContent?.includes("Add ingredients to shopping list"))
    ?.click();
});
await new Promise((r) => setTimeout(r, 400));

await page.goto(`${BASE}/shopping-list`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
const ticked = await page.evaluate(() => {
  const box = document.querySelector('input[type="checkbox"][aria-label^="Tick off "]');
  box?.click();
  return box?.getAttribute("aria-label")?.replace("Tick off ", "") ?? "";
});
const onList = await page.evaluate(
  () => document.querySelectorAll('input[type="checkbox"][aria-label^="Tick off "]').length,
);
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Share list")?.click();
});
await page.waitForFunction(() => Boolean(window.__shared), { timeout: 5000 }).catch(() => {});
const shared = await page.evaluate(() => window.__shared ?? null);
check(
  "Sharing produces a link with the list in its fragment",
  Boolean(shared?.url?.includes("/shopping-list/shared#1")),
  shared ? `${shared.url.length} characters` : "nothing shared",
);
check(
  "Only what is still to buy is sent",
  shared?.text === `${onList - 1} things to buy`,
  `${shared?.text ?? "?"} of ${onList} on the list, "${ticked}" ticked`,
);

// Someone else's phone: a separate browser profile with nothing saved.
const partnerContext = await browser.createBrowserContext();
const partner = await partnerContext.newPage();
await partner.setViewport({ width: 390, height: 900 });
await partner.goto(shared?.url ?? `${BASE}/shopping-list/shared`, { waitUntil: "networkidle2" });
await partner
  .waitForFunction(() => document.body.textContent?.includes("things to buy"), { timeout: 10000 })
  .catch(() => {});
const received = await partner.evaluate(() => document.querySelector("main")?.textContent ?? "");
check(
  "The link opens the list on another device",
  received.includes(`${onList - 1} things to buy`) &&
    received.includes("Long-grain parboiled rice") &&
    received.includes("For Jollof Rice"),
);
check(
  "The ticked item did not travel",
  !new RegExp(`\\b${ticked.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
    received.replace(/For Jollof Rice|for Jollof Rice/g, ""),
  ),
  ticked,
);

const addShared = () =>
  partner.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => /^Add all \d+ to my shopping list$/.test(b.textContent?.trim() ?? ""))
      ?.click();
  });
await addShared();
await new Promise((r) => setTimeout(r, 400));
await partner.goto(`${BASE}/shopping-list`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
const partnerList = await partner.evaluate(() => ({
  lines: document.querySelectorAll('input[type="checkbox"][aria-label^="Tick off "]').length,
  text: document.querySelector("main")?.textContent ?? "",
}));
check(
  "Adding a shared list puts it on the other device's own list",
  partnerList.lines === onList - 1 && /500g\s*Long-grain parboiled rice/.test(partnerList.text),
  `${partnerList.lines} lines`,
);

// Added a second time, the same lines add together rather than repeating.
await partner.goto(shared?.url ?? `${BASE}/shopping-list/shared`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await addShared();
await new Promise((r) => setTimeout(r, 400));
await partner.goto(`${BASE}/shopping-list`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
const merged = await partner.evaluate(() => ({
  lines: document.querySelectorAll('input[type="checkbox"][aria-label^="Tick off "]').length,
  text: document.querySelector("main")?.textContent ?? "",
}));
check(
  "Shared lines merge with ones already there instead of duplicating",
  merged.lines === onList - 1 && /1kg\s*Long-grain parboiled rice/.test(merged.text),
  `${merged.lines} lines`,
);

const cut = shared?.url ? shared.url.slice(0, Math.floor(shared.url.length * 0.7)) : "";
await partner.goto(cut || `${BASE}/shopping-list/shared#1d.xx`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
check(
  "A link cut short says so, rather than showing half a list",
  (await partner.evaluate(() => document.body.textContent ?? "")).includes(
    "This link looks incomplete",
  ),
);
await partnerContext.close();

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
