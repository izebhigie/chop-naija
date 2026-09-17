/**
 * Proves recipes keep working with no connection.
 *
 * DevTools' offline toggle is not trusted here: it throttles the page, but a
 * service worker's own fetches can still reach the network, so a check built
 * on it can pass while real offline use fails. Instead this starts a real
 * production server, browses while it is up, then kills it — the same thing
 * the kitchen wifi does.
 *
 * Needs a production build first:
 *   npm run build && npm run check:offline
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const results = [];
const check = (name, passed, detail = "") => {
  results.push(passed);
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!existsSync(".next/BUILD_ID")) {
  console.error("No production build found. Run `npm run build` first.");
  process.exit(1);
}

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  stdio: "ignore",
});
let serverUp = false;
for (let i = 0; i < 60 && !serverUp; i += 1) {
  serverUp = await fetch(BASE).then((r) => r.ok, () => false);
  if (!serverUp) await wait(500);
}
if (!serverUp) {
  server.kill();
  console.error("Production server did not start.");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  /* ------------------------------------------------------------ online */

  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  const controlled = await page
    .waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 20000 })
    .then(() => true, () => false);
  check("The service worker takes control of the page", controlled);

  // The realistic route in: tapping a card, which is a soft navigation.
  await page.evaluate(() => document.querySelector('a[href="/recipes/jollof-rice"]')?.click());
  await page.waitForFunction(() => location.pathname === "/recipes/jollof-rice", { timeout: 15000 });
  await page.waitForSelector("h1", { timeout: 15000 });

  // And one opened directly.
  await page.goto(`${BASE}/recipes/suya`, { waitUntil: "networkidle2" });

  const savedOnline = await page
    .waitForFunction(
      async () => {
        const names = (await caches.keys()).filter((name) => name.startsWith("wp-pages-"));
        const paths = new Set();
        for (const name of names) {
          for (const request of await (await caches.open(name)).keys()) {
            paths.add(new URL(request.url).pathname);
          }
        }
        return ["/", "/offline", "/recipes/jollof-rice", "/recipes/suya"].every((p) => paths.has(p));
      },
      { timeout: 20000, polling: 500 },
    )
    .then(() => true, () => false);
  check(
    "Pages reached by tapping a card are saved, not only pages loaded directly",
    savedOnline,
  );
  // Let the worker finish fetching each page's scripts, styles and fonts.
  await wait(3000);

  /* ----------------------------------------------------------- offline */

  server.kill();
  await wait(1000);
  const reallyOffline = await page.evaluate(() =>
    fetch("/api/suggest?q=rice", { cache: "no-store" }).then(() => false, () => true),
  );
  check("The server is really gone", reallyOffline);

  await page.goto(`${BASE}/recipes/jollof-rice`, { waitUntil: "load", timeout: 20000 });
  await wait(1500);
  const recipe = await page.evaluate(() => {
    const hero = [...document.querySelectorAll("main img")].find((img) => img.complete);
    return {
      title: document.querySelector("h1")?.textContent?.trim() ?? "",
      ingredients: document.getElementById("ingredients-heading") !== null,
      photo: Boolean(hero && hero.naturalWidth > 0),
      styled: getComputedStyle(document.body).backgroundColor === "rgb(250, 246, 238)",
      fonts: [...document.fonts].filter((face) => face.status === "loaded").length,
    };
  });
  check("A saved recipe reloads with no connection", recipe.title === "Jollof Rice", recipe.title);
  check("It arrives styled, with its photo", recipe.styled && recipe.photo, JSON.stringify({ styled: recipe.styled, photo: recipe.photo }));
  check("Its fonts come from the device too", recipe.fonts > 0, `${recipe.fonts} faces loaded`);

  // Interactive, not just readable: the scripts have to be there as well.
  await page.evaluate(() =>
    document.querySelector('[aria-label="Use vegetable stock instead of chicken stock"]')?.click(),
  );
  await wait(400);
  const swapped = await page.evaluate(
    () => document.getElementById("ingredients-heading")?.closest("section")?.textContent?.includes("Vegetable stock") ?? false,
  );
  check("Swaps still work offline", swapped);

  await page.evaluate(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Start cooking mode"))?.click(),
  );
  await wait(500);
  const cooking = await page.evaluate(() => {
    const start = [...document.querySelectorAll("button")].find((b) => /^Start .+ timer$/.test(b.textContent?.trim() ?? ""));
    start?.click();
    return Boolean(document.querySelector('[role="dialog"]'));
  });
  await wait(1600);
  const ticking = await page.evaluate(() =>
    [...(document.querySelector('[role="dialog"]')?.querySelectorAll("span") ?? [])].some((s) => /^\d+:\d{2}$/.test(s.textContent?.trim() ?? "")),
  );
  check("Cooking mode and its timers work offline", cooking && ticking);
  await page.keyboard.press("Escape");

  // A link inside the app: Next's data request fails, it falls back to a
  // full navigation, and the worker answers that from the saved copy.
  await page.evaluate(() => document.querySelector('header a[href="/"]')?.click());
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 }).catch(() => {});
  await wait(1500);
  const home = await page.evaluate(() => ({
    path: location.pathname,
    content: (document.querySelector("main")?.textContent?.length ?? 0) > 500,
  }));
  check("Following a link to a saved page works offline", home.path === "/" && home.content, JSON.stringify(home));

  await page.goto(`${BASE}/recipes/egusi-soup`, { waitUntil: "load", timeout: 20000 });
  await wait(1500);
  const fallback = await page.evaluate(() => ({
    path: location.pathname + location.search,
    explains: document.body.textContent?.includes("Egusi Soup isn’t saved on this device yet") ?? false,
    listed: [...document.querySelectorAll("main a")].map((a) => a.textContent?.trim() ?? ""),
  }));
  check(
    "An unsaved page lands on the offline page, which says what was asked for",
    fallback.path === "/offline?from=%2Frecipes%2Fegusi-soup" && fallback.explains,
    fallback.path,
  );
  check(
    "The offline page lists exactly the recipes saved on this device",
    fallback.listed.some((t) => t.startsWith("Jollof Rice")) &&
      fallback.listed.some((t) => t.startsWith("Suya")) &&
      !fallback.listed.some((t) => t.startsWith("Egusi")),
    fallback.listed.filter((t) => !/Try again/.test(t)).join(" | "),
  );

  await page.evaluate(() =>
    [...document.querySelectorAll("main a")].find((a) => a.textContent?.trim().startsWith("Suya"))?.click(),
  );
  await page.waitForFunction(() => location.pathname === "/recipes/suya", { timeout: 15000 }).catch(() => {});
  await wait(1000);
  const opened = await page.evaluate(() => document.querySelector("h1")?.textContent?.trim() ?? "");
  check("A recipe opens from the offline list", opened === "Suya", opened);
  /* ---------------------------------------------------- control */

  /*
   * The same browse-then-disconnect, with the worker never registered. If a
   * recipe still reloads, the passes above came from the browser's HTTP
   * cache rather than the worker and prove nothing. (Blocking /sw.js with
   * request interception is not enough: the browser fetches worker scripts
   * outside the page's network stack, and it registers anyway.)
   */
  const controlPort = PORT + 1;
  const control = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(controlPort)],
    { stdio: "ignore" },
  );
  try {
    const controlBase = `http://localhost:${controlPort}`;
    for (let i = 0; i < 60; i += 1) {
      if (await fetch(controlBase).then((r) => r.ok, () => false)) break;
      await wait(500);
    }
    const bare = await browser.newPage();
    await bare.evaluateOnNewDocument(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {});
    });
    await bare.goto(`${controlBase}/`, { waitUntil: "networkidle2" });
    await bare.evaluate(() => document.querySelector('a[href="/recipes/jollof-rice"]')?.click());
    await bare.waitForFunction(() => location.pathname === "/recipes/jollof-rice", { timeout: 15000 });
    await wait(1500);
    control.kill();
    await wait(1000);
    const reloaded = await bare
      .goto(`${controlBase}/recipes/jollof-rice`, { waitUntil: "load", timeout: 15000 })
      .then(() => bare.evaluate(() => document.querySelector("h1")?.textContent?.trim() ?? ""), () => "");
    check(
      "Control: without the worker, the same offline reload fails",
      reloaded !== "Jollof Rice",
      reloaded ? `loaded "${reloaded}" anyway` : "connection refused, as it should be",
    );
  } finally {
    control.kill();
  }
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) process.exitCode = 1;
