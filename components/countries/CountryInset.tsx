import type { Country, Origin } from "@/lib/types";
import { INSET_WIDTH, COUNTRY_INSETS } from "@/data/country-insets";

/** A dish's home city, carried through from the recipe it belongs to. */
export interface InsetPlace extends Origin {
  dish: string;
}

/**
 * A locator map for one country, with the cities its dishes actually come from.
 *
 * The origin line under every dish prints a city and a pair of coordinates.
 * This is the same fact drawn rather than written: jollof rice belongs to
 * Lagos, not to Nigeria in general, and on the map you can see how far that is
 * from the capital.
 *
 * Outline and projection both come from `data/country-insets.ts`. The
 * projection is equirectangular, so placing a point is `k · degrees + offset`
 * and no mapping library is involved.
 */
export function CountryInset({
  country,
  places,
}: {
  country: Country;
  places: InsetPlace[];
}) {
  const inset = COUNTRY_INSETS[country.slug];
  if (!inset) return null;

  const toX = (lon: number) => inset.lon[0] * lon + inset.lon[1];
  const toY = (lat: number) => inset.lat[0] * lat + inset.lat[1];

  // One marker per city: two dishes from Lagos should not stack two dots.
  const byCity = new Map<string, InsetPlace[]>();
  for (const place of places) {
    byCity.set(place.city, [...(byCity.get(place.city) ?? []), place]);
  }

  const capitalX = toX(country.lon);
  const capitalY = toY(country.lat);

  /**
   * Drop the capital when a dish already marks the same spot. Ottawa sits four
   * pixels from Montréal at Canada's scale, so drawing both puts a ring under
   * a label and reads as a smudge rather than as two cities.
   */
  const capitalIsRedundant =
    byCity.has(country.capital) ||
    [...byCity.values()].some((dishes) => {
      const dx = toX(dishes[0].lon) - capitalX;
      const dy = toY(dishes[0].lat) - capitalY;
      return Math.hypot(dx, dy) < 26;
    });

  return (
    <figure className="flex h-full flex-col bg-forest-deep p-5 sm:p-7">
      <h2 className="u-data text-cream/50">Where the dishes come from</h2>

      <svg
        viewBox={`0 0 ${INSET_WIDTH} ${inset.height}`}
        className="mt-4 h-auto w-full"
        role="img"
        aria-label={
          `Map of ${country.name}, marking ${[...byCity.keys()].join(", ")}` +
          (capitalIsRedundant ? "" : ` and the capital, ${country.capital}`)
        }
      >
        <path
          d={inset.path}
          className="fill-saffron/20 stroke-saffron/45"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />

        {/* The capital, hollow — it orients the map but is rarely the point. */}
        {!capitalIsRedundant ? (
          <g>
            <circle
              cx={capitalX}
              cy={capitalY}
              r="4"
              className="fill-none stroke-cream/60"
              strokeWidth="1.5"
            />
            <Label x={capitalX} y={capitalY} className="fill-cream/45">
              {country.capital}
            </Label>
          </g>
        ) : null}

        {[...byCity.entries()].map(([city, dishes]) => {
          const x = toX(dishes[0].lon);
          const y = toY(dishes[0].lat);
          return (
            <g key={city}>
              <circle cx={x} cy={y} r="5" className="fill-saffron" />
              <Label x={x} y={y} className="fill-cream">
                {city}
              </Label>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-auto pt-5 text-[0.9375rem] leading-relaxed text-cream/60">
        {[...byCity.entries()].map(([city, dishes], index) => (
          <span key={city}>
            {index > 0 ? " · " : null}
            <span className="text-cream">{dishes.map((d) => d.dish).join(", ")}</span> from {city}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/**
 * A marker label that flips to the other side of its dot near the right edge,
 * so a city in the east of a country does not have its name clipped off.
 */
function Label({
  x,
  y,
  className,
  children,
}: {
  x: number;
  y: number;
  className: string;
  children: React.ReactNode;
}) {
  const flip = x > INSET_WIDTH * 0.62;

  return (
    <text
      x={flip ? x - 10 : x + 10}
      y={y + 4}
      textAnchor={flip ? "end" : "start"}
      className={`${className} text-[13px]`}
      style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}
    >
      {children}
    </text>
  );
}
