/*
 * WorldPlates service worker.
 *
 * One job: a recipe you have opened keeps working when the connection goes.
 * Phones discard background tabs and reload them on return, so "the page was
 * already open" is not enough — the reload has to succeed with no network.
 *
 * - Pages are network-first, with a saved copy used when the network fails or
 *   stalls. Online, you always get the current recipe.
 * - Hashed build assets are cache-first; their names change when they do.
 * - Photos are served from the cache and refreshed behind the scenes.
 * - RSC payloads and API calls are left alone. When a soft navigation fails,
 *   Next falls back to a full navigation, which lands back here as a page
 *   request.
 *
 * Hand-written rather than generated, so every rule above is in this file.
 */

const VERSION = "v1";
const PAGES = `wp-pages-${VERSION}`;
const ASSETS = `wp-assets-${VERSION}`;
const IMAGES = `wp-images-${VERSION}`;
const OFFLINE_URL = "/offline";

/** Oldest entries are dropped past these counts, so the cache cannot grow without end. */
const LIMITS = { [PAGES]: 60, [ASSETS]: 400, [IMAGES]: 200 };

/** How long a page request may stall before a saved copy is used instead. */
const NETWORK_TIMEOUT_MS = 4000;

/** Every build-asset path mentioned in a page or stylesheet, including chunk references in the RSC data. */
const ASSET_PATTERN = /\/_next\/static\/[^"'\\\s)<>]+/g;

/* ---------------------------------------------------------------- lifecycle */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await savePage(new URL(OFFLINE_URL, self.location.origin).href);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const current = new Set([PAGES, ASSETS, IMAGES]);
      for (const key of await caches.keys()) {
        if (key.startsWith("wp-") && !current.has(key)) await caches.delete(key);
      }
      // Take over pages that are already open, so their later requests are saved too.
      await self.clients.claim();
    })(),
  );
});

/*
 * Most visits reach a recipe by tapping a card. That is a soft navigation: it
 * fetches an RSC payload, never the page's HTML, so the page would never be
 * saved by the fetch handler alone. The app posts each page it lands on here.
 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SAVE_PAGE") return;
  event.waitUntil(
    (async () => {
      await savePage(data.url);
      for (const resource of data.resources ?? []) await saveResource(resource);
    })(),
  );
});

/* -------------------------------------------------------------------- fetch */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // RSC payloads, prefetches and API calls go straight to the network.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(pageResponse(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSETS));
  } else if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(event, IMAGES));
  }
});

async function pageResponse(event) {
  const { request } = event;
  const cache = await caches.open(PAGES);
  const key = pageKey(request.url);

  const network = fetch(request).then(async (response) => {
    if (isPage(response)) {
      await cache.put(key, response.clone());
      await trim(PAGES);
    }
    return response;
  });
  // Let a slow response finish updating the cache even after a saved copy was served.
  event.waitUntil(network.catch(() => undefined));

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
  const first = await Promise.race([network.catch(() => null), timeout]);
  if (first) return first;

  const saved = await cache.match(key, { ignoreVary: true });
  if (saved) return saved;

  // Nothing saved: if the network is only slow, keep waiting for it.
  const late = await network.catch(() => null);
  if (late) return late;

  /*
   * Redirect rather than serve the offline page's HTML under this URL. Next's
   * router would otherwise hydrate one route's data under another route's
   * address. The page keeps its own URL and is told what was asked for.
   */
  if (await cache.match(pageKey(OFFLINE_URL), { ignoreVary: true })) {
    const requested = new URL(request.url);
    const target = new URL(OFFLINE_URL, self.location.origin);
    target.searchParams.set("from", requested.pathname + requested.search);
    return Response.redirect(target.href, 302);
  }
  return new Response("You are offline, and this page has not been saved on this device.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
    await trim(name);
  }
  return response;
}

async function staleWhileRevalidate(event, name) {
  const { request } = event;
  const cache = await caches.open(name);
  const hit = await cache.match(request, { ignoreVary: true });

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
        await trim(name);
      }
      return response;
    })
    .catch(() => null);
  event.waitUntil(network);

  return hit ?? (await network) ?? new Response("", { status: 504 });
}

/* ------------------------------------------------------------------ saving */

async function savePage(href) {
  const url = new URL(href, self.location.origin);
  if (url.origin !== self.location.origin) return;
  try {
    const response = await fetch(url.href, { credentials: "same-origin" });
    if (!isPage(response)) return;
    const html = await response.clone().text();
    const cache = await caches.open(PAGES);
    await cache.put(pageKey(url.href), response);
    await trim(PAGES);
    // A saved page is no use offline without the scripts and styles it names.
    for (const path of new Set(html.match(ASSET_PATTERN) ?? [])) await saveResource(path);
  } catch {
    // Offline or failing: nothing to save this time.
  }
}

async function saveResource(href) {
  let url;
  try {
    url = new URL(href, self.location.origin);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  const name = url.pathname.startsWith("/_next/static/") ? ASSETS : isImage(url) ? IMAGES : null;
  if (!name) return;

  const cache = await caches.open(name);
  if (await cache.match(url.href, { ignoreVary: true })) return;
  try {
    const response = await fetch(url.href, { credentials: "same-origin" });
    if (!response.ok) return;
    if (url.pathname.endsWith(".css")) {
      // Stylesheets name the font files; fetch those too, or offline text falls back to system fonts.
      const css = await response.clone().text();
      await cache.put(url.href, response);
      for (const path of new Set(css.match(ASSET_PATTERN) ?? [])) await saveResource(path);
    } else {
      await cache.put(url.href, response);
    }
    await trim(name);
  } catch {
    // Skip anything that cannot be fetched right now.
  }
}

/* ----------------------------------------------------------------- helpers */

function isPage(response) {
  return (
    response.ok &&
    response.type === "basic" &&
    !response.redirected &&
    (response.headers.get("Content-Type") ?? "").includes("text/html")
  );
}

function isImage(url) {
  return (
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/dishes/") ||
    url.pathname.startsWith("/flags/")
  );
}

/**
 * The cache key for a page. The offline page is one entry whatever its
 * `?from=` says, so a redirect to it always finds the saved copy.
 */
function pageKey(href) {
  const url = new URL(href, self.location.origin);
  url.hash = "";
  if (url.pathname === OFFLINE_URL) url.search = "";
  return url.href;
}

async function trim(name) {
  const cache = await caches.open(name);
  // The offline page is saved first, so it is always the oldest entry — and
  // the one thing that must never be evicted.
  const keys = (await cache.keys()).filter((request) => new URL(request.url).pathname !== OFFLINE_URL);
  const excess = keys.length - LIMITS[name];
  for (let i = 0; i < excess; i += 1) await cache.delete(keys[i]);
}
