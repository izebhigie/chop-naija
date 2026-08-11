import type { Metadata } from "next";
import Link from "next/link";
import { cuisines } from "@/data/cuisines";
import { recipes, recipeBySlug } from "@/data/recipes";
import { regions } from "@/data/regions";
import { countryBySlug } from "@/data/countries";
import { FoodImage } from "@/components/ui/FoodImage";
import { Flag } from "@/components/ui/Flag";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Cuisines",
  description:
    "Twenty-eight cuisines, each with the ingredients it leans on and the techniques that define it.",
};

export default function CuisinesPage() {
  const byCuisine = new Map<string, string[]>();
  for (const recipe of recipes) {
    const list = byCuisine.get(recipe.cuisineSlug) ?? [];
    list.push(recipe.slug);
    byCuisine.set(recipe.cuisineSlug, list);
  }

  return (
    <div className="u-shell py-12">
      <header className="max-w-2xl">
        <p className="u-data text-forest">Browse by cuisine</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">
          {cuisines.length} ways of cooking
        </h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          A cuisine is a set of habits more than a border — what gets fried first, what supplies the
          salt, what turns up on the table without being asked for.
        </p>
      </header>

      {regions.map((region) => {
        const inRegion = cuisines.filter((cuisine) => cuisine.region === region.slug);
        if (!inRegion.length) return null;

        return (
          <section key={region.slug} className="mt-14" aria-labelledby={`cuisines-${region.slug}`}>
            <h2
              id={`cuisines-${region.slug}`}
              className="border-b border-line pb-3 font-display text-2xl"
            >
              {region.name}
            </h2>

            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {inRegion.map((cuisine, index) => {
                const slugs = byCuisine.get(cuisine.slug) ?? [];
                const lead = slugs[0] ? recipeBySlug.get(slugs[0]) : undefined;

                return (
                  <Reveal as="li" key={cuisine.slug} delay={(index % 3) * 50}>
                    <Link
                      href={`/cuisines/${cuisine.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-paper ring-1 ring-line-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
                    >
                      {lead ? (
                        <FoodImage
                          image={lead.image}
                          alt=""
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                          ratio="16 / 9"
                        />
                      ) : (
                        <div className="aspect-video bg-forest-wash" />
                      )}

                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="font-display text-xl leading-tight text-ink">
                          {cuisine.name}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-[0.9375rem] text-muted">
                          {cuisine.blurb}
                        </p>

                        <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
                          {cuisine.countrySlugs.slice(0, 3).map((countrySlug) => {
                            const country = countryBySlug.get(countrySlug);
                            if (!country) return null;
                            return (
                              <Flag
                                key={countrySlug}
                                iso2={country.iso2}
                                title={country.name}
                                className="h-3.5"
                              />
                            );
                          })}
                          <span className="u-data-sm ml-auto text-forest">
                            {slugs.length} {slugs.length === 1 ? "recipe" : "recipes"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
