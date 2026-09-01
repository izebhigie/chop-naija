# WorldPlates

A recipe discovery app for cooking dishes from around the world — browse by country or region,
filter a catalogue of 35 recipes, scale ingredients to your table, build a shopping list, and plan
a week of meals.

Built with Next.js 16 (App Router), TypeScript and Tailwind v4.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build — 104 prerendered pages
npm run start        # serve the build
npm run lint
```

## What it does

- **Discover** — 35 recipes across 8 regions and 29 countries, with search, autocomplete, and
  filters for country, cuisine, meal type, main ingredient, diet, allergens, cooking method,
  time, difficulty and rating.
- **Cook** — ingredients scale live with the serving count, switch between metric and US units,
  and a full-screen cooking mode shows one step at a time and keeps the screen awake. Steps that
  have a duration can start a timer: they run in parallel, stay visible from any step, and ring
  when they finish.
- **Plan** — save favorites into collections, send ingredients to a shopping list grouped by
  supermarket aisle, and lay out a week of meals that turns into one consolidated list.

Every filter lives in the URL, so a filtered view can be bookmarked or shared:
`/recipes?region=asia&diet=Vegetarian&time=60`.

## How it is put together

```
app/            routes (App Router) + two small API routes
components/     ui/ · layout/ · recipe/ · discovery/ · home/ · search/
data/           recipes, countries, cuisines, regions, reviews, generated map geometry
services/       recipeService + a swappable adapter
hooks/          useAppStore — favorites, shopping list, meal plan
lib/            types, units, filters, formatting
scripts/        image pipeline, map builder and browser-driven checks
assets/         fonts used to render the social card (not shipped to browsers)
```

**The service layer is the seam.** Pages and components only ever call `recipeService`, which
today reads the local dataset through `services/adapters/localAdapter.ts`. Pointing the app at a
real recipe API means writing one more adapter with the same shape and changing a single line —
no page or component has to change.

**Contrast is measured, not asserted.** `check:a11y` walks every rendered text node, composites
the colour stack the browser actually painted, and compares it against the WCAG AA threshold for
that font size. Text over photography and inside SVG cannot be judged this way, so it is counted
and reported rather than quietly passed. A list of token pairs would only ever prove the
combinations someone thought to write down — this caught `muted` failing on the `cream-deep`
bands, which no hand-written pair list included.

**Timers read the clock, they do not count down.** Each one stores the wall-clock moment it ends.
Browsers throttle intervals in background tabs — sometimes to once a minute — so a timer built by
decrementing a counter quietly loses minutes and comes back wrong. The flow test proves this by
moving the page clock forward twenty minutes and checking the timer lands correctly, which is the
same thing a throttled tab does.

**Saved state is local.** Favorites, the shopping list and the meal plan persist to
`localStorage`. Nothing reads storage during render — the first paint is always the empty state
and real values arrive in an effect — so the server and client renders always agree.

### A note on the design

Every dish carries its name in its own language and the real coordinates of the city it comes
from, set in mono beneath the title:

```
Jollof Rice
Ìrẹsì Jollof · Nigeria
6.52°N 3.38°E · West African · 1 hr 15 min
```

It is the one thing a *global* recipe app can say that a local one cannot, and it appears on
cards, detail pages and the meal planner alike. In the same spirit, the region tiles on the home
page are sized by how many recipes each region actually holds, so the shape of the collection is
legible before you click.

[/countries](app/countries/page.tsx) draws the same idea on the actual world. Outlines come from
Natural Earth and are projected at author time by [scripts/build-map.mjs](scripts/build-map.mjs),
so the page ships flat SVG path strings and no mapping library — d3-geo is a devDependency that
never reaches the browser. Countries with recipes are filled and linked; everywhere else is drawn
faint, as context you can read but not click.

```bash
npm run data:map                   # rebuild data/world-map.ts from Natural Earth
```

The projection is Natural Earth I rather than the reflexive Mercator, which would inflate
Greenland past Africa — a poor look on a page about where food comes from. Background coastlines
are simplified harder than the 29 countries in the collection, which halves the page weight
without touching the subject.

Each country page carries a locator map of its own, marking the cities its dishes actually come
from — jollof rice belongs to Lagos, not to Nigeria in general. Those use an equirectangular fit
per country, which is linear in lon/lat, so the page places a marker with `k · degrees + offset`
and still ships no projection code. Only the one country's outline reaches the browser, so a
country page costs about 16kB gzipped.

Two framing rules matter there. A frame fitted to the single largest landmass puts New Zealand's
North Island — and both cities its dishes come from — outside the picture, so the frame covers
every polygon within a third of the largest one's area; that keeps both New Zealand islands and
drops Alaska and Hawaii, which are drawn and then clipped. And the capital marker is suppressed
when a dish already marks the same spot, because Ottawa sits four pixels from Montréal at Canada's
scale.

## Deploying

Nothing needs configuring — there are no API keys and no database. On Vercel,
import the repository and deploy; the repo root is the app root, so no root
directory override is needed.

One optional variable, once a custom domain is attached:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

It sets `metadataBase`, so canonical URLs, the sitemap and Open Graph images all
resolve absolutely. Left unset, [lib/site.ts](lib/site.ts) falls back to Vercel's
own environment — the production host in production, the deployment host in a
preview — and to `localhost:3000` elsewhere. Preview deployments serve
`Disallow: /` so a throwaway domain never competes with production in search.

## Photography

Dish photos come from each dish's Wikipedia article rather than a stock library — a stock search
for "tagine" returns whatever is photogenic, which is how recipe sites end up showing the wrong
dish. Images are downloaded, resized and served locally, so nothing depends on a third party at
runtime. Photographer and licence are stored per image and credited on every recipe page.

```bash
node scripts/fetch-images.mjs      # rebuild public/dishes from Wikipedia
node scripts/contact-sheet.mjs     # tile them all into one image to review
```

The social card and the favicon are drawn from JSX in [scripts/og/](scripts/og/)
and committed as `app/opengraph-image.png` and `app/icon.png`. They are files
rather than `opengraph-image.tsx` routes because nothing about them varies per
request — and because Next 16's dev server cannot serve generated metadata
images, which put a broken favicon and two console errors on every page.

```bash
npm run images:og                  # redraw both from scripts/og/
```

## Maps

The country outlines are real. They come from [Natural Earth](https://www.naturalearthdata.com/)
(public domain) and are projected at author time by `scripts/build-map.mjs`, which writes plain SVG
path strings into `data/`. The mapping library is a devDependency and never reaches the browser, so
the whole of `/countries` is 50kB gzipped and prerenders as static HTML.

```bash
npm run data:map      # rebuild data/world-map.ts and data/country-insets.ts
npm run check:map     # every capital and dish origin still inside its frame
```

Two resolutions, because they are doing different jobs: 1:110m for the world overview, where
nothing finer would survive being drawn 1000px wide, and 1:50m for the per-country locator maps,
where 110m costs Greece its islands and most of its coastline.

Rerun `npm run data:map` after changing the country list, then `npm run check:map`. The build
throws rather than guessing if a country has no outline, and the check fails if a marker falls
outside the frame drawn for it — both of which have happened, and neither of which is visible by
reading the data.

## Checks

`npm test` is pure logic — quantity scaling, unit conversion, filters, sorting — and needs nothing
running:

```bash
npm test               # 40 tests over lib/units.ts and lib/filters.ts
npm run check:map      # map geometry (no browser needed either)
```

The rest drive your installed Chrome via `puppeteer-core`, so **the dev server must be running**:

```bash
npm run dev            # terminal 1

npm run check:flows    # servings, units, favorites, shopping list, cooking mode, timers
npm run check:a11y     # overflow, focus rings, alt text, reduced motion, contrast
npm run check:console  # console errors and hydration mismatches per route
npm run shoot recipes 390   # screenshot a route at a width → scripts/out/
```

Pass routes to `shoot` **without a leading slash** (`recipes`, or `""` for home) — Git Bash
rewrites a bare `/` into a Windows path.

## Known limits

- Recipes are researched sample data written for this project, not from a licensed recipe
  database. Nutrition figures are estimates.
- There is no backend or accounts, so saved state stays on the device it was created on. The
  sign-in button is a placeholder rather than a working flow.
- Reviews you post are added to the page and marked as unsaved rather than pretending to persist.
- Recipe prose uses British ingredient names where those are the names the dish uses
  (aubergine, coriander, tinned tomatoes); the interface is American English throughout.
- Below 640px the world map is a picture rather than 29 links. At that width every marker is
  well under the 24px minimum for a touch target, so the country list beneath it is the control
  instead. The links are removed from the tab order too, not just hidden.
- Country outlines are 1:50m, which is a national-scale generalisation. It is the right
  resolution for locating a city, not for tracing a border.
- Timers live for as long as cooking mode is open; closing it ends them. They also cannot ring
  from a locked phone, which is why cooking mode asks to keep the screen awake. Where sound is
  unavailable the timer says so rather than silently not ringing.
