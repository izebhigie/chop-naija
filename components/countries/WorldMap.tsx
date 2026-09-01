import Link from "next/link";
import type { Country } from "@/lib/types";
import {
  MAP_VIEW_BOX,
  MAP_LEFT,
  MAP_RIGHT,
  EQUATOR_Y,
  OTHER_LAND,
  COUNTRY_SHAPES,
  CAPITAL_POINTS,
} from "@/data/world-map";

/**
 * The collection drawn on the actual world.
 *
 * Outlines come from Natural Earth and are projected at author time by
 * `scripts/build-map.mjs`, so this ships flat path strings and no mapping
 * library. Countries the app has recipes from are filled and linked; the rest
 * of the land is drawn faint, as context you can read but not click.
 *
 * The dot on each capital is the same fact the origin line prints under every
 * dish — its size is the recipe count, so the shape of the collection is
 * legible before you click anything.
 */
export function WorldMap({
  countries,
  counts,
}: {
  countries: Country[];
  counts: Record<string, number>;
}) {
  // Largest first, so a small country's dot is never buried under a big one's.
  const ordered = [...countries]
    .filter((country) => COUNTRY_SHAPES[country.slug] && CAPITAL_POINTS[country.slug])
    .sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0));

  const markerRadius = (slug: string) => 4.5 + Math.min(counts[slug] ?? 0, 4) * 1.4;

  return (
    <figure className="overflow-hidden rounded-[var(--radius-card)] bg-forest-deep p-3 sm:p-5">
      <svg
        viewBox={MAP_VIEW_BOX}
        className="h-auto w-full"
        role="img"
        aria-label={
          `World map with the ${countries.length} countries in the collection marked at their ` +
          "capitals. Every one of them is also listed by region below."
        }
      >
        {/*
          Each outline is defined once and referenced twice — as the shape that
          is always drawn, and as the hover fill inside the link. Repeating the
          path data instead would add about 18kB to the page.
        */}
        <defs>
          {ordered.map((country) => (
            <path
              key={country.slug}
              id={`wm-${country.slug}`}
              d={COUNTRY_SHAPES[country.slug]}
            />
          ))}
        </defs>

        {/* Everywhere else. Faint enough to read as context, not as a target. */}
        <path d={OTHER_LAND} className="fill-cream/10" />

        {/* The equator — the same coordinate system the recipes are labelled in. */}
        <line
          x1={MAP_LEFT}
          y1={EQUATOR_Y}
          x2={MAP_RIGHT}
          y2={EQUATOR_Y}
          className="stroke-saffron/20"
          strokeWidth="1"
          strokeDasharray="5 7"
        />

        {/* The collection, always drawn — this layer is the picture. */}
        <g className="fill-saffron/25 stroke-saffron/40" strokeWidth="0.75">
          {ordered.map((country) => (
            <use key={country.slug} href={`#wm-${country.slug}`} />
          ))}
        </g>

        {/*
          On a phone the whole world is about 350px wide, which puts every
          marker far under the 24px minimum for a touch target. Rather than
          offer 29 links nobody can hit accurately, the map is a picture at
          that size and the list below is the control. `display: none` takes
          the links out of the tab order and the accessibility tree too, so
          nothing is left behind to trip over.
        */}
        <g className="fill-saffron sm:hidden">
          {ordered.map((country) => {
            const [x, y] = CAPITAL_POINTS[country.slug];
            return <circle key={country.slug} cx={x} cy={y} r={markerRadius(country.slug)} />;
          })}
        </g>

        <g className="hidden sm:block">
          {ordered.map((country) => {
            const [x, y] = CAPITAL_POINTS[country.slug];
            const count = counts[country.slug] ?? 0;
            const radius = markerRadius(country.slug);
            const label = `${country.name} — ${count} ${count === 1 ? "recipe" : "recipes"}`;

            return (
              <Link
                key={country.slug}
                href={`/countries/${country.slug}`}
                className="group outline-none"
                aria-label={label}
              >
                <title>{label}</title>

                <use
                  href={`#wm-${country.slug}`}
                  className="fill-transparent transition-all duration-200 group-hover:fill-saffron/45 group-focus-visible:fill-saffron/45"
                />

                {/* A generous invisible target — some of these countries are
                    two pixels across at this scale. */}
                <circle cx={x} cy={y} r={radius + 7} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  className="fill-saffron stroke-forest-deep transition-all duration-200 group-hover:fill-cream group-focus-visible:fill-cream"
                  strokeWidth="1"
                />

                <text
                  x={x}
                  y={y - radius - 6}
                  textAnchor="middle"
                  className="fill-cream/0 text-[12px] transition-colors duration-200 group-hover:fill-cream group-focus-visible:fill-cream"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
                >
                  {country.name.toUpperCase()}
                </text>
              </Link>
            );
          })}
        </g>
      </svg>

      <figcaption className="u-data-sm mt-3 px-1 text-cream/60">
        Dot size reflects how many recipes each country has. Every country is also listed by
        region below.
      </figcaption>
    </figure>
  );
}
