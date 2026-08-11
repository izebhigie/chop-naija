import type { Metadata } from "next";
import Link from "next/link";
import { countries } from "@/data/countries";
import { regions } from "@/data/regions";
import { recipes } from "@/data/recipes";
import { Flag } from "@/components/ui/Flag";
import { CountryPlot } from "@/components/countries/CountryPlot";
import { formatCoordinates } from "@/lib/format";

export const metadata: Metadata = {
  title: "Countries",
  description:
    "Browse recipes by country — 29 countries across eight regions, each with its staple ingredients and cooking methods.",
};

export default function CountriesPage() {
  const counts: Record<string, number> = {};
  for (const recipe of recipes) {
    counts[recipe.countrySlug] = (counts[recipe.countrySlug] ?? 0) + 1;
  }

  return (
    <div className="u-shell py-12">
      <header className="max-w-2xl">
        <p className="u-data text-forest">Browse by country</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">
          {countries.length} countries, plotted
        </h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          Every country in the collection sits at the real coordinates of its capital. The bigger
          the dot, the more recipes it holds.
        </p>
      </header>

      <div className="mt-10">
        <CountryPlot countries={countries} counts={counts} />
      </div>

      {regions.map((region) => {
        const inRegion = countries
          .filter((country) => country.region === region.slug)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!inRegion.length) return null;

        return (
          <section key={region.slug} className="mt-14" aria-labelledby={`region-${region.slug}`}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <h2 id={`region-${region.slug}`} className="font-display text-2xl">
                {region.name}
              </h2>
              <Link href={`/recipes?region=${region.slug}`} className="u-data text-forest hover:underline">
                All {region.name} recipes
              </Link>
            </div>

            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inRegion.map((country) => (
                <li key={country.slug}>
                  <Link
                    href={`/countries/${country.slug}`}
                    className="group flex h-full items-center gap-4 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    <Flag iso2={country.iso2} title={country.name} className="h-7 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg leading-tight text-ink">
                        {country.name}
                      </span>
                      <span className="u-data-sm block text-muted tabular-nums">
                        {formatCoordinates(country.lat, country.lon)}
                      </span>
                    </span>
                    <span className="u-data-sm shrink-0 rounded-full bg-forest-wash px-2.5 py-1 text-forest">
                      {counts[country.slug] ?? 0}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
