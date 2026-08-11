/**
 * Loads each route and reports console errors, warnings and failed requests.
 * Run: node scripts/console-check.mjs
 */

import puppeteer from "puppeteer-core";

// Git Bash rewrites a leading "/" into a Windows path, so routes are passed
// without one ("recipes", or "" for the home page).
const normalize = (value) =>
  value === "" || value === "/" ? "/" : `/${String(value).replace(/^\/+/, "")}`;

const ROUTES = process.argv.slice(2).length
  ? process.argv.slice(2).map(normalize)
  : ["/", "/recipes", "/recipes?region=asia"];

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});

let problems = 0;

for (const route of ROUTES) {
  const page = await browser.newPage();
  const messages = [];

  const limit = process.env.FULL ? 4000 : 300;
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      messages.push(`${msg.type()}: ${msg.text().slice(0, limit)}`);
    }
  });
  page.on("pageerror", (err) => messages.push(`pageerror: ${err.message.slice(0, 300)}`));
  page.on("requestfailed", (req) =>
    messages.push(`requestfailed: ${req.url().slice(0, 160)} — ${req.failure()?.errorText}`),
  );
  page.on("response", (res) => {
    if (res.status() >= 400) messages.push(`http ${res.status()}: ${res.url().slice(0, 160)}`);
  });

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  console.log(`\n=== ${route} ===`);
  if (messages.length === 0) console.log("clean");
  else {
    problems += messages.length;
    for (const message of messages) console.log(" ", message);
  }

  await page.close();
}

await browser.close();
console.log(`\n${problems} problem(s) total`);
