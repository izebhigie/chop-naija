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
  const ordered = [...countries].sort(
    (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0),
  );

  return (
    <figure className="overflow-hidden rounded-[var(--radius-card)] bg-forest-deep p-3 sm:p-5">
      <svg
        viewBox={MAP_VIEW_BOX}
        className="h-auto w-full"
        role="img"
        aria-label={
          `World map with the ${countries.length} countries in the collection marked at their ` +
          "capitals. Each is a link, and all of them are listed by region below."
        }
      >

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

        {ordered.map((country) => {
          const shape = COUNTRY_SHAPES[country.slug];
          const point = CAPITAL_POINTS[country.slug];
          if (!shape || !point) return null;

          const [x, y] = point;
          const count = counts[country.slug] ?? 0;
          const radius = 4.5 + Math.min(count, 4) * 1.4;
          const label = `${country.name} — ${count} ${count === 1 ? "recipe" : "recipes"}`;

          return (
            <Link
              key={country.slug}
              href={`/countries/${country.slug}`}
              className="group outline-none"
              aria-label={label}
            >
              <title>{label}</title>

              <path
                d={shape}
                className="fill-saffron/25 stroke-saffron/40 transition-all duration-200 group-hover:fill-saffron/55 group-focus-visible:fill-saffron/55"
                strokeWidth="0.75"
              />

              {/* A generous invisible target — some of these countries are two
                  pixels across at this scale. */}
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
      </svg>

      <figcaption className="u-data-sm mt-3 px-1 text-cream/45">
        Dot size reflects how many recipes each country has. Every country is also listed by
        region below.
      </figcaption>
    </figure>
  );
}
