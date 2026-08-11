/**
 * Screenshots pages from the running dev server so the design can be reviewed
 * rather than imagined.
 *
 * Usage:
 *   node scripts/shoot.mjs /                 full page, desktop
 *   node scripts/shoot.mjs /recipes 390      full page, mobile width
 *   node scripts/shoot.mjs / 1440 fold       just the first screen
 */

import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// Git Bash rewrites a bare "/" argument into a Windows path, so routes are
// passed without a leading slash ("recipes", or "" for the home page).
const raw = (process.argv[2] ?? "").replace(/^[A-Za-z]:[/\\].*$/, "");
const route = raw === "" || raw === "/" ? "/" : `/${raw.replace(/^\/+/, "")}`;
const width = Number(process.argv[3] ?? 1440);
const mode = process.argv[4] ?? "full";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "out");
await mkdir(outDir, { recursive: true });

const name =
  (route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")) +
  `-${width}${mode === "fold" ? "-fold" : ""}.png`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width, height: mode === "fold" ? 900 : 1000, deviceScaleFactor: 1 });
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 60000 });

  // Walk the page so scroll-triggered reveals fire and lazy images load.
  // Smooth scrolling has to be switched off first: with it on, rapid
  // scrollBy calls queue up and the page never actually reaches the bottom,
  // which reads as "the sections are blank" in the screenshot.
  if (mode !== "fold") {
    await page.addStyleTag({ content: "html{scroll-behavior:auto !important}" });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await new Promise((r) => setTimeout(r, 110));
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await new Promise((r) => setTimeout(r, 1200));

  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: mode !== "fold" });
  console.log(`saved ${path.relative(process.cwd(), file)}`);
} finally {
  await browser.close();
}
