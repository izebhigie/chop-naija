/**
 * Turns Natural Earth's country outlines into SVG paths this app can render.
 *
 * Runs at author time and writes `data/world-map.ts`, so the browser gets flat
 * path strings and no mapping library: d3-geo is a devDependency that never
 * reaches the bundle. Re-run it only if the country list changes.
 *
 * Run: node scripts/build-map.mjs   (or `npm run data:map`)
 *
 * Source: Natural Earth 1:110m Admin 0 Countries — public domain.
 */

import { writeFileSync } from "node:fs";
import { geoNaturalEarth1, geoEquirectangular, geoPath, geoArea, geoBounds } from "d3-geo";
import { countries } from "../data/countries.ts";

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

/** 1:110m for the world overview — at 1000px wide nothing finer would show. */
const WORLD_SOURCE = `${NE}/ne_110m_admin_0_countries.geojson`;

/**
 * 1:50m for the per-country locator maps. At country scale 110m is visibly
 * wrong: Greece loses its islands and most of its coastline and comes out a
 * blob. This file is ~3MB, but it is read once at author time and only the
 * simplified result is committed.
 */
const INSET_SOURCE = `${NE}/ne_50m_admin_0_countries.geojson`;

const WIDTH = 1000;
const HEIGHT = 500;

/**
 * Natural Earth I, the projection this dataset is named for. Equirectangular
 * smears the high latitudes sideways and Mercator inflates them until
 * Greenland outranks Africa, which is a poor look on a page about where food
 * comes from. This one is a compromise projection built to look right.
 */
const projection = geoNaturalEarth1();
const path = geoPath(projection);

async function load(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Natural Earth returned ${response.status} for ${url}`);
  return response.json();
}

const [world, detailed] = await Promise.all([load(WORLD_SOURCE), load(INSET_SOURCE)]);

// Antarctica has no recipes and would claim the bottom fifth of the frame.
const features = world.features.filter((f) => f.properties.ADMIN !== "Antarctica");

projection.fitSize([WIDTH, HEIGHT], { type: "FeatureCollection", features });

/** ISO_A2 is "-99" for France and Norway in this dataset; ISO_A2_EH is not. */
const iso2 = (f) =>
  String(f.properties.ISO_A2_EH ?? f.properties.ISO_A2 ?? "").toLowerCase();

/**
 * Ramer–Douglas–Peucker, run on the finished path rather than on lon/lat
 * pairs. d3 has already clipped the antimeridian by this point, so simplifying
 * here cannot tear Russia in half the way simplifying beforehand would.
 */
function simplifyRing(points, tolerance) {
  if (points.length < 3) return points;

  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const span = Math.hypot(dx, dy);

  let worst = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    // Distance from the point to the chord, or to the endpoint if the chord
    // has collapsed to a point (a closed ring's ends coincide).
    const distance = span
      ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / span
      : Math.hypot(px - ax, py - ay);
    if (distance > worst) {
      worst = distance;
      index = i;
    }
  }

  if (worst <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplifyRing(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifyRing(points.slice(index), tolerance),
  ];
}

/** Re-draws an SVG path, dropping points that do not change its shape. */
function simplifyPath(d, tolerance) {
  return d
    .split("M")
    .filter(Boolean)
    .map((segment) => {
      const closed = segment.trimEnd().endsWith("Z");
      const points = segment
        .replace(/Z\s*$/, "")
        .split("L")
        .map((pair) => pair.split(",").map(Number))
        .filter((pair) => pair.length === 2 && pair.every(Number.isFinite));
      if (points.length < 2) return null;

      const kept = simplifyRing(points, tolerance);
      // A ring that simplifies to a line has no area left to draw.
      if (closed && kept.length < 4) return null;

      return `M${kept.map(([x, y]) => `${x},${y}`).join("L")}${closed ? "Z" : ""}`;
    })
    .filter(Boolean)
    .join("");
}

/**
 * Sub-pixel precision on a 1000px-wide map is invisible and costs most of the
 * file size. These paths are inlined into the page, so the geometry is rounded
 * to whole pixels and anything too small to see is dropped entirely.
 */
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));

/** Planar area of a projected ring, in square pixels. */
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = projection(ring[i]);
    const b = projection(ring[(i + 1) % n]);
    if (!a || !b) return Infinity; // unprojectable: keep it rather than guess
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

/**
 * Natural Earth carries every islet. At this scale most land under a few
 * square pixels renders as a speck of noise, so background land is filtered
 * harder than the countries the app actually links to.
 */
function dropSlivers(feature, minArea) {
  const { type, coordinates } = feature.geometry;
  if (type === "Polygon") return feature;
  if (type !== "MultiPolygon") return feature;

  const kept = coordinates.filter((polygon) => ringArea(polygon[0]) >= minArea);
  if (!kept.length || kept.length === coordinates.length) return feature;
  return { ...feature, geometry: { type: "MultiPolygon", coordinates: kept } };
}

const wanted = new Map(countries.map((c) => [c.iso2, c.slug]));

const highlights = {};
const background = [];

for (const feature of features) {
  const slug = wanted.get(iso2(feature));
  // A country in the collection keeps anything visible at all; the rest of
  // the world is context and can afford to lose its smaller islands.
  const trimmed = dropSlivers(feature, slug ? 1 : 6);
  const drawn = path(trimmed);
  if (!drawn) continue;

  // The 29 in the collection are the subject and keep their shape; the rest
  // of the world is context and can lose detail nobody would miss.
  if (slug) highlights[slug] = round(simplifyPath(drawn, 0.4));
  else background.push(round(simplifyPath(drawn, 1.1)));
}

const missing = countries.filter((c) => !highlights[c.slug]);
if (missing.length) {
  throw new Error(`no outline found for: ${missing.map((c) => c.slug).join(", ")}`);
}

/** Capitals, projected through the same lens so the dots land on the land. */
const capitals = {};
for (const country of countries) {
  const point = projection([country.lon, country.lat]);
  if (!point) throw new Error(`could not project ${country.slug}`);
  capitals[country.slug] = [
    Math.round(point[0] * 10) / 10,
    Math.round(point[1] * 10) / 10,
  ];
}

/**
 * The projected world is not 2:1, and dropping Antarctica trims it further, so
 * fitSize leaves dead space above and below. Measuring what was actually drawn
 * and using that as the viewBox makes the frame fit the map.
 */
const [[x0, y0], [x1, y1]] = path.bounds({ type: "FeatureCollection", features });
const margin = 4;
const viewBox = [
  Math.floor(x0 - margin),
  Math.floor(y0 - margin),
  Math.ceil(x1 - x0 + margin * 2),
  Math.ceil(y1 - y0 + margin * 2),
].join(" ");

/** Where 0° actually lands. Natural Earth I does not put it at mid-height. */
const equatorY = Math.round(projection([0, 0])[1]);

const file = `// Generated by scripts/build-map.mjs — do not edit by hand.
// Source: Natural Earth 1:110m Admin 0 Countries (public domain), projected
// with d3-geo's Natural Earth I. Run \`npm run data:map\` to rebuild.

/** Fitted to the drawn land, so the frame carries no empty ocean. */
export const MAP_VIEW_BOX = "${viewBox}";

/** x range of the viewBox, for drawing full-width lines across it. */
export const MAP_LEFT = ${Math.floor(x0 - margin)};
export const MAP_RIGHT = ${Math.ceil(x1 + margin)};

/** y of the equator in projected coordinates. */
export const EQUATOR_Y = ${equatorY};

/** Every country not in the collection, as one path. Drawn faint, never interactive. */
export const OTHER_LAND = ${JSON.stringify(background.join(" "))};

/** Outlines for the countries the app actually has recipes from. */
export const COUNTRY_SHAPES: Record<string, string> = ${JSON.stringify(highlights, null, 2)};

/** Projected [x, y] of each capital, in the same coordinate space. */
export const CAPITAL_POINTS: Record<string, [number, number]> = ${JSON.stringify(capitals, null, 2)};
`;

writeFileSync("data/world-map.ts", file);

/* ------------------------------------------------------- country insets */

const INSET_WIDTH = 420;
const INSET_PAD = 18;
/** Nothing taller than a square, nothing wider than a widescreen frame. */
const INSET_MIN_HEIGHT = 230;
const INSET_MAX_HEIGHT = 420;

/**
 * A locator map for a single country.
 *
 * Equirectangular rather than Natural Earth I: over one country the distortion
 * is negligible, and being linear in lon/lat means the page can place a point
 * — a capital, the city a dish comes from — with two multiplications instead
 * of shipping a projection library. The coefficients travel with the path.
 */
function buildInset(feature) {
  const projection = geoEquirectangular();
  const draw = geoPath(projection);

  // Frame on the major landmasses, not on every scrap of territory. The
  // United States otherwise spans Guam to Maine and the part anyone came to
  // look at ends up four pixels wide — but framing on the single largest
  // polygon is just as wrong, because it puts New Zealand's North Island, and
  // both the cities its dishes come from, outside the picture.
  //
  // Anything within a third of the biggest polygon's area counts as major:
  // that keeps both New Zealand islands and both halves of the Philippines,
  // and still drops Alaska and Hawaii. Smaller territories are drawn anyway
  // and simply clipped by the frame.
  const polygons = (
    feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates]
  ).map((coordinates) => ({ type: "Polygon", coordinates }));

  const areas = polygons.map(geoArea);
  const largest = Math.max(...areas);
  const main = polygons[areas.indexOf(largest)];
  const mainBounds = geoBounds(main);

  /**
   * Degrees between two lon/lat bounding boxes, zero if they overlap.
   * Absolute rather than relative to the country's own size: Alaska is far
   * from Montana by any measure, but a rule scaled to the size of the United
   * States would call it close.
   */
  const gapFrom = (bounds) => {
    const dx = Math.max(mainBounds[0][0] - bounds[1][0], bounds[0][0] - mainBounds[1][0], 0);
    const dy = Math.max(mainBounds[0][1] - bounds[1][1], bounds[0][1] - mainBounds[1][1], 0);
    return Math.hypot(dx, dy);
  };

  const mainland = {
    type: "GeometryCollection",
    geometries: polygons.filter((polygon, i) => {
      // A second landmass in its own right: New Zealand's North Island,
      // Mindanao. Framing on the largest alone leaves these out.
      if (areas[i] >= largest / 3) return true;
      // Or an island close enough to read as part of the same country —
      // Crete, Sicily, Sardinia. Alaska and Hawaii are nowhere near.
      return gapFrom(geoBounds(polygon)) <= 3 && areas[i] >= largest / 150;
    }),
  };

  // Give each country a frame shaped like the country. One fixed rectangle for
  // all 29 leaves Japan swimming in empty sea and crams Australia into a strip.
  const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(mainland);
  const aspect = (maxLon - minLon) / (maxLat - minLat);
  const height = Math.min(
    INSET_MAX_HEIGHT,
    Math.max(INSET_MIN_HEIGHT, Math.round(INSET_WIDTH / aspect)),
  );

  projection.fitExtent(
    [
      [INSET_PAD, INSET_PAD],
      [INSET_WIDTH - INSET_PAD, height - INSET_PAD],
    ],
    mainland,
  );

  // x = kx·lon + bx and y = ky·lat + by. Solved from two projected points
  // rather than assumed, so it stays correct if the projection ever changes.
  const [x0, y0] = projection([0, 0]);
  const [x1, y1] = projection([10, 10]);
  const kx = (x1 - x0) / 10;
  const ky = (y1 - y0) / 10;

  const round4 = (n) => Math.round(n * 10000) / 10000;

  return {
    height,
    // Anything outside the frame — Alaska, Hawaii — is clipped by the viewBox.
    path: round(simplifyPath(draw(feature), 0.35)),
    lon: [round4(kx), round4(x0)],
    lat: [round4(ky), round4(y0)],
  };
}

/**
 * Picks the one feature that *is* a country.
 *
 * The 1:50m file lists dependencies under their sovereign's ISO code:
 * "AU" matches Australia, the Indian Ocean Territories and Ashmore and Cartier
 * Islands. Taking whichever came last framed Australia on an uninhabited sand
 * cay. Anything ambiguous throws rather than picking quietly.
 */
function featureFor(slug, code, features) {
  const matches = features.filter((f) => iso2(f) === code);
  const sovereign = matches.filter((f) => f.properties.TYPE !== "Dependency");
  if (sovereign.length === 1) return sovereign[0];
  throw new Error(
    `expected one country feature for ${slug} (${code}), found ${sovereign.length}: ` +
      sovereign.map((f) => `${f.properties.ADMIN} [${f.properties.TYPE}]`).join(", "),
  );
}

const insets = {};
for (const country of countries) {
  insets[country.slug] = buildInset(
    featureFor(country.slug, country.iso2, detailed.features),
  );
}

const missingInsets = countries.filter((c) => !insets[c.slug]);
if (missingInsets.length) {
  throw new Error(`no inset for: ${missingInsets.map((c) => c.slug).join(", ")}`);
}

const insetFile = `// Generated by scripts/build-map.mjs — do not edit by hand.
// One locator map per country, equirectangular and fitted to its own frame.
// Run \`npm run data:map\` to rebuild.

export const INSET_WIDTH = ${INSET_WIDTH};

export interface CountryInset {
  /** Frame height for this country; the width is always INSET_WIDTH. */
  height: number;
  /** The country outline, already projected into the frame. */
  path: string;
  /** [multiplier, offset] mapping longitude to x. */
  lon: [number, number];
  /** [multiplier, offset] mapping latitude to y. */
  lat: [number, number];
}

export const COUNTRY_INSETS: Record<string, CountryInset> = ${JSON.stringify(insets, null, 2)};
`;

writeFileSync("data/country-insets.ts", insetFile);

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)}kB`;
console.log(`data/world-map.ts written — ${kb(file)} total`);
console.log(`  background land  ${kb(background.join(" "))}`);
console.log(`  ${Object.keys(highlights).length} country outlines  ${kb(JSON.stringify(highlights))}`);
console.log(`data/country-insets.ts written — ${kb(insetFile)} (${Object.keys(insets).length} locator maps)`);
const biggest = Object.entries(insets).sort((a, b) => b[1].path.length - a[1].path.length)[0];
console.log(`  largest single inset: ${biggest[0]} at ${kb(biggest[1].path)}`);
