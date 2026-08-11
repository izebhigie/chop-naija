import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cuisines, cuisineBySlug } from "@/data/cuisines";
import { countryBySlug } from "@/data/countries";
import { recipes } from "@/data/recipes";
import { regionBySlug } from "@/data/regions";
import { toCardList } from "@/lib/cards";
import { FoodImage } from "@/components/ui/FoodImage";
import { Flag } from "@/components/ui/Flag";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { ButtonLink, EmptyState, SectionHeading } from "@/components/ui/primitives";

export function generateStaticParams() {
  return cuisines.map((cuisine) => ({ slug: cuisine.slug }));
}

export async function generateMetadata(
  props: PageProps<"/cuisines/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const cuisine = cuisineBySlug.get(slug);
  if (!cuisine) return { title: "Cuisine not found" };

  return {
    title: `${cuisine.name} recipes`,
    description: cuisine.blurb.slice(0, 160),
    alternates: { canonical: `/cuisines/${cuisine.slug}` },
  };
}

export default async function CuisinePage(props: PageProps<"/cuisines/[slug]">) {
  const { slug } = await props.params;
  const cuisine = cuisineBySlug.get(slug);
  if (!cuisine) notFound();

  const region = regionBySlug.get(cuisine.region);
  const cuisineRecipes = recipes.filter((recipe) => recipe.cuisineSlug === cuisine.slug);
  const hero = cuisineRecipes[0];
  const related = cuisine.relatedSlugs
    .map((related) => cuisineBySlug.get(related))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div>
      <div className="u-shell pt-8">
        <nav aria-label="Breadcrumb" className="u-data text-muted">
          <Link href="/cuisines" className="hover:text-forest">
            Cuisines
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{cuisine.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
          <div>
            <p className="u-data text-forest">{region?.name}</p>
            <h1 className="mt-4 text-[length:var(--text-display-lg)]">{cuisine.name}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-line py-3">
              {cuisine.countrySlugs.map((countrySlug) => {
                const country = countryBySlug.get(countrySlug);
                if (!country) return null;
                return (
                  <Link
                    key={countrySlug}
                    href={`/countries/${countrySlug}`}
                    className="u-data inline-flex items-center gap-2 text-forest hover:underline"
                  >
                    <Flag iso2={country.iso2} title={country.name} />
                    {country.name}
                  </Link>
                );
              })}
              <span className="u-data ml-auto text-muted">
                {cuisineRecipes.length} {cuisineRecipes.length === 1 ? "recipe" : "recipes"}
              </span>
            </div>

            <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted">{cuisine.blurb}</p>

            <div className="mt-8">
              <ButtonLink href={`/recipes?cuisine=${cuisine.slug}`}>
                All {cuisine.name} recipes
              </ButtonLink>
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

      <div className="u-shell py-14">
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line md:grid-cols-2">
          <div className="bg-paper p-7">
            <h2 className="u-data text-forest">Ingredients it leans on</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {cuisine.staples.map((staple) => (
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
            <h2 className="u-data text-forest">Techniques that define it</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {cuisine.methods.map((method) => (
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

      <div className="u-shell pb-16">
        <SectionHeading eyebrow="Iconic dishes" title={`The ${cuisine.name} table`} />

        {cuisineRecipes.length ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {toCardList(cuisineRecipes).map((card) => (
              <li key={card.slug}>
                <RecipeCard card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8">
            <EmptyState
              title={`No ${cuisine.name} recipes yet`}
              body="Nothing from this cuisine has been written up so far. Try the region it belongs to."
              action={
                <ButtonLink href={`/recipes?region=${cuisine.region}`}>
                  Browse {region?.name}
                </ButtonLink>
              }
            />
          </div>
        )}
      </div>

      {related.length ? (
        <div className="bg-cream-deep py-14">
          <div className="u-shell">
            <h2 className="u-data text-forest">If you like this, try</h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/cuisines/${item.slug}`}
                    className="inline-flex items-center rounded-full bg-paper px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-forest hover:text-cream"
                  >
                    {item.name}
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
