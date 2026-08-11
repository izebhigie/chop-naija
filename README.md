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
  and a full-screen cooking mode shows one step at a time and keeps the screen awake.
- **Plan** — save favorites into collections, send ingredients to a shopping list grouped by
  supermarket aisle, and lay out a week of meals that turns into one consolidated list.

Every filter lives in the URL, so a filtered view can be bookmarked or shared:
`/recipes?region=asia&diet=Vegetarian&time=60`.

## How it is put together

```
app/            routes (App Router) + two small API routes
components/     ui/ · layout/ · recipe/ · discovery/ · home/ · search/
data/           recipes, countries, cuisines, regions, reviews
services/       recipeService + a swappable adapter
hooks/          useAppStore — favorites, shopping list, meal plan
lib/            types, units, filters, formatting
scripts/        image pipeline and browser-driven checks
```

**The service layer is the seam.** Pages and components only ever call `recipeService`, which
today reads the local dataset through `services/adapters/localAdapter.ts`. Pointing the app at a
real recipe API means writing one more adapter with the same shape and changing a single line —
no page or component has to change.

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

## Photography

Dish photos come from each dish's Wikipedia article rather than a stock library — a stock search
for "tagine" returns whatever is photogenic, which is how recipe sites end up showing the wrong
dish. Images are downloaded, resized and served locally, so nothing depends on a third party at
runtime. Photographer and licence are stored per image and credited on every recipe page.

```bash
node scripts/fetch-images.mjs      # rebuild public/dishes from Wikipedia
node scripts/contact-sheet.mjs     # tile them all into one image to review
```

## Checks

These drive your installed Chrome via `puppeteer-core`, so **the dev server must be running**:

```bash
npm run dev            # terminal 1

npm run check:flows    # servings scaling, units, favorites, shopping list, cooking mode
npm run check:a11y     # 320–1440px overflow, focus rings, alt text, reduced motion
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
