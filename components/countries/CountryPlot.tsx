import Link from "next/link";
import type { Country } from "@/lib/types";

const WIDTH = 1000;
const HEIGHT = 500;

/**
 * Every country in the collection, plotted at its real coordinates on an
 * equirectangular grid.
 *
 * Deliberately a plot rather than a map: no borders, no coastlines, just the
 * graticule and a dot where each capital actually is. It is the same idea as
 * the coordinates printed under every dish, and it avoids drawing a political
 * map of the world in order to sell recipes.
 */
export function CountryPlot({
  countries,
  counts,
}: {
  countries: Country[];
  counts: Record<string, number>;
}) {
  // Fit the frame to where the countries actually are. A full -90..90 plot
  // spends half its height on empty polar regions.
  const pad = 12;
  const lats = countries.map((c) => c.lat);
  const lons = countries.map((c) => c.lon);
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLon = Math.min(...lons) - pad;
  const maxLon = Math.max(...lons) + pad;

  const project = (lat: number, lon: number) => ({
    x: ((lon - minLon) / (maxLon - minLon)) * WIDTH,
    y: ((maxLat - lat) / (maxLat - minLat)) * HEIGHT,
  });

  /** Real graticule lines that fall inside the visible window. */
  const step = 20;
  const latLines: number[] = [];
  for (let lat = Math.ceil(minLat / step) * step; lat <= maxLat; lat += step) latLines.push(lat);
  const lonLines: number[] = [];
  for (let lon = Math.ceil(minLon / 30) * 30; lon <= maxLon; lon += 30) lonLines.push(lon);

  return (
    <figure className="overflow-hidden rounded-[var(--radius-card)] bg-forest-deep p-4 sm:p-6">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Plot of ${countries.length} countries by the coordinates of their capital cities`}
      >
        {/* Graticule every 30° of longitude and 20° of latitude. */}
        <g stroke="currentColor" className="text-cream/12" strokeWidth="1">
          {lonLines.map((lon) => (
            <line
              key={`lon-${lon}`}
              x1={project(0, lon).x}
              y1="0"
              x2={project(0, lon).x}
              y2={HEIGHT}
            />
          ))}
          {latLines.map((lat) => (
            <line
              key={`lat-${lat}`}
              x1="0"
              y1={project(lat, 0).y}
              x2={WIDTH}
              y2={project(lat, 0).y}
            />
          ))}
        </g>

        {/* The equator, drawn slightly stronger because it is the one line
            people actually orient by. */}
        <line
          x1="0"
          y1={project(0, 0).y}
          x2={WIDTH}
          y2={project(0, 0).y}
          stroke="currentColor"
          className="text-saffron/40"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
        <text
          x="8"
          y={project(0, 0).y - 8}
          className="fill-saffron/50 text-[12px]"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
        >
          0°
        </text>

        {countries.map((country) => {
          const { x, y } = project(country.lat, country.lon);
          const count = counts[country.slug] ?? 0;
          const radius = 4 + Math.min(count, 4) * 1.6;

          return (
            <Link
              key={country.slug}
              href={`/countries/${country.slug}`}
              className="group outline-none"
            >
              <title>{`${country.name} — ${count} ${count === 1 ? "recipe" : "recipes"}`}</title>
              <circle
                cx={x}
                cy={y}
                r={radius + 8}
                fill="transparent"
                className="group-focus-visible:fill-cream/15"
              />
              <circle
                cx={x}
                cy={y}
                r={radius}
                className="fill-saffron transition-all duration-200 group-hover:fill-cream group-focus-visible:fill-cream"
              />
              <text
                x={x}
                y={y - radius - 7}
                textAnchor="middle"
                className="fill-cream/0 text-[13px] transition-colors duration-200 group-hover:fill-cream group-focus-visible:fill-cream"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
              >
                {country.name.toUpperCase()}
              </text>
            </Link>
          );
        })}
      </svg>

      <figcaption className="u-data-sm mt-3 text-cream/45">
        Dot size reflects how many recipes each country has. Select one to open it.
      </figcaption>
    </figure>
  );
}
