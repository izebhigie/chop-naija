import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { countries, countryBySlug } from "@/data/countries";
import { cuisineBySlug, cuisines } from "@/data/cuisines";
import { recipes } from "@/data/recipes";
import { regionBySlug } from "@/data/regions";
import { toCardList } from "@/lib/cards";
import { formatCoordinates } from "@/lib/format";
import { FoodImage } from "@/components/ui/FoodImage";
import { Flag } from "@/components/ui/Flag";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { EmptyState, ButtonLink, SectionHeading } from "@/components/ui/primitives";

export function generateStaticParams() {
  return countries.map((country) => ({ slug: country.slug }));
}

export async function generateMetadata(
  props: PageProps<"/countries/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const country = countryBySlug.get(slug);
  if (!country) return { title: "Country not found" };

  return {
    title: `${country.name} recipes`,
    description: country.blurb.slice(0, 160),
    alternates: { canonical: `/countries/${country.slug}` },
  };
}

export default async function CountryPage(props: PageProps<"/countries/[slug]">) {
  const { slug } = await props.params;
  const country = countryBySlug.get(slug);
  if (!country) notFound();

  const region = regionBySlug.get(country.region);
  const countryRecipes = recipes.filter((recipe) => recipe.countrySlug === country.slug);
  const hero = countryRecipes[0];
  const related = cuisines
    .filter((cuisine) => cuisine.region === country.region && !country.cuisineSlugs.includes(cuisine.slug))
    .slice(0, 4);

  return (
    <div>
      {/* ------------------------------------------------------------ Hero */}
      <div className="u-shell pt-8">
        <nav aria-label="Breadcrumb" className="u-data text-muted">
          <Link href="/countries" className="hover:text-forest">
            Countries
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{country.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <Flag iso2={country.iso2} title={country.name} className="h-9" />
              <span className="u-data text-forest">{region?.name}</span>
            </div>

            <h1 className="mt-5 text-[length:var(--text-display-lg)]">{country.name}</h1>

            <p className="u-data mt-3 border-y border-line py-3 text-muted tabular-nums">
              {country.capital} / {formatCoordinates(country.lat, country.lon)} /{" "}
              {countryRecipes.length} {countryRecipes.length === 1 ? "recipe" : "recipes"}
            </p>

            <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted">{country.blurb}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/recipes?country=${country.slug}`}>
                All {country.name} recipes
              </ButtonLink>
              {country.cuisineSlugs[0] ? (
                <ButtonLink href={`/cuisines/${country.cuisineSlugs[0]}`} variant="secondary">
                  {cuisineBySlug.get(country.cuisineSlugs[0])?.name} cuisine
                </ButtonLink>
              ) : null}
            </div>
          </div>

          {hero ? (
            <FoodImage
              image={hero.image}
              alt={hero.imageAlt}
              sizes="(min-width: 1024px) 620px, 92vw"
              ratio="4 / 3"
              priority
              className="rounded-[var(--radius-media)] shadow-[var(--shadow-soft)]"
            />
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------ Staples and techniques */}
      <div className="u-shell py-14">
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line md:grid-cols-2">
          <div className="bg-paper p-7">
            <h2 className="u-data text-forest">What is always in the kitchen</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {country.staples.map((staple) => (
                <li
                  key={staple}
                  className="rounded-full bg-cream px-3.5 py-2 text-[0.9375rem] text-ink ring-1 ring-line-soft"
                >
                  {staple}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-paper p-7">
            <h2 className="u-data text-forest">How things get cooked</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {country.methods.map((method) => (
                <li
                  key={method}
                  className="rounded-full bg-cream px-3.5 py-2 text-[0.9375rem] text-ink ring-1 ring-line-soft"
                >
                  {method}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- Recipes */}
      <div className="u-shell pb-16">
        <SectionHeading
          eyebrow="Iconic dishes"
          title={`Cook something from ${country.name}`}
        />

        {countryRecipes.length ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {toCardList(countryRecipes).map((card) => (
              <li key={card.slug}>
                <RecipeCard card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8">
            <EmptyState
              title={`No ${country.name} recipes yet`}
              body="This country is in the atlas but not yet in the kitchen. Browse the region instead."
              action={
                <ButtonLink href={`/recipes?region=${country.region}`}>
                  Browse {region?.name}
                </ButtonLink>
              }
            />
          </div>
        )}
      </div>

      {/* -------------------------------------------------- Related cuisines */}
      {related.length ? (
        <div className="bg-cream-deep py-14">
          <div className="u-shell">
            <h2 className="u-data text-forest">Cuisines nearby</h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {related.map((cuisine) => (
                <li key={cuisine.slug}>
                  <Link
                    href={`/cuisines/${cuisine.slug}`}
                    className="inline-flex items-center rounded-full bg-paper px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-forest hover:text-cream"
                  >
                    {cuisine.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
