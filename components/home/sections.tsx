import Link from "next/link";
import {
  Timer,
  Sprout,
  Store,
  Soup,
  Leaf,
  CakeSlice,
  Fish,
  CookingPot,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { Recipe, Region, RegionSlug } from "@/lib/types";
import type { RecipeCardData } from "@/lib/cards";
import { categories } from "@/data/categories";
import { recipeBySlug } from "@/data/recipes";
import { cuisineBySlug } from "@/data/cuisines";
import { countryBySlug } from "@/data/countries";
import { reviews } from "@/data/reviews";
import { FoodImage } from "@/components/ui/FoodImage";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading, Rating } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/Flag";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { cx, formatDate } from "@/lib/format";

const ICONS: Record<string, LucideIcon> = {
  Timer,
  Sprout,
  Store,
  Soup,
  Leaf,
  CakeSlice,
  Fish,
  CookingPot,
};

/* ------------------------------------------------------- Quick discovery */

export function QuickDiscovery({ counts }: { counts: Record<string, number> }) {
  return (
    <section className="bg-cream-deep py-20">
      <div className="u-shell">
        <SectionHeading
          eyebrow="Start somewhere"
          title="What are you in the mood for?"
          intro="Eight ways into the collection, whether you have twenty minutes or a free afternoon."
        />

        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = ICONS[category.icon] ?? Soup;
            const count = counts[category.slug] ?? 0;

            return (
              <Reveal as="li" key={category.slug} delay={index * 40}>
                <Link
                  href={`/recipes?${
                    category.slug === "vegetarian"
                      ? "diet=Vegetarian"
                      : category.slug === "quick-easy"
                        ? "time=45"
                        : `q=${category.slug.replace(/-/g, " ")}`
                  }`}
                  className="group flex h-full flex-col rounded-[var(--radius-card)] bg-paper p-5 ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:ring-forest/20"
                >
                  <Icon
                    aria-hidden="true"
                    className="size-6 text-forest transition-transform duration-200 group-hover:scale-110"
                    strokeWidth={1.5}
                  />
                  <h3 className="mt-4 text-base font-semibold text-ink">{category.name}</h3>
                  <p className="mt-1 text-sm text-muted">{category.description}</p>
                  <span className="u-data-sm mt-4 text-forest">
                    {count} {count === 1 ? "recipe" : "recipes"}
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Region mosaic */

/**
 * Region tiles are sized by how many recipes each one actually holds, so the
 * shape of the collection is readable before you click anything.
 */
export function RegionMosaic({
  regions,
  counts,
}: {
  regions: Region[];
  counts: Record<RegionSlug, number>;
}) {
  const ranked = [...regions].sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0));

  return (
    <section className="u-shell py-20">
      <SectionHeading
        eyebrow="Explore by region"
        title="Eight regions, one collection"
        intro="Tiles are sized by how many recipes each region holds — the bigger the tile, the deeper the shelf."
        action={
          <Link
            href="/countries"
            className="u-data inline-flex items-center gap-2 text-forest hover:text-forest-mid"
          >
            All countries <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      />

      <ul className="mt-10 grid auto-rows-[168px] grid-cols-2 gap-3 md:grid-cols-4 md:auto-rows-[184px]">
        {ranked.map((region, index) => {
          const count = counts[region.slug] ?? 0;
          const recipe = recipeBySlug.get(region.imageRecipeSlug);
          const span =
            index === 0
              ? "col-span-2 row-span-2"
              : index === 1
                ? "col-span-2"
                : "col-span-1";

          return (
            <Reveal as="li" key={region.slug} delay={index * 40} className={span}>
              <Link
                href={`/recipes?region=${region.slug}`}
                className="group relative block h-full overflow-hidden rounded-[var(--radius-card)]"
              >
                {recipe ? (
                  <FoodImage
                    image={recipe.image}
                    alt=""
                    sizes={index === 0 ? "(min-width: 768px) 50vw, 92vw" : "(min-width: 768px) 25vw, 46vw"}
                    ratio="auto"
                    className="absolute inset-0 h-full w-full"
                    imageClassName="brightness-[0.72]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-forest" />
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-forest-deep/25 to-transparent"
                />

                <div className="relative flex h-full flex-col justify-end p-4">
                  <h3
                    className={cx(
                      "font-display leading-tight text-cream",
                      index === 0 ? "text-3xl" : "text-xl",
                    )}
                  >
                    {region.name}
                  </h3>
                  {index === 0 ? (
                    <p className="mt-2 max-w-sm text-sm text-cream/80">{region.blurb}</p>
                  ) : null}
                  <span className="u-data-sm mt-2 text-cream/75">{count} recipes</span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- Trending */

export function TrendingRecipes({ recipes }: { recipes: RecipeCardData[] }) {
  return (
    <section className="bg-cream-deep py-20">
      <div className="u-shell">
        <SectionHeading
          eyebrow="Cooked most this month"
          title="What everyone is making"
          action={
            <Link
              href="/recipes?sort=popularity"
              className="u-data inline-flex items-center gap-2 text-forest hover:text-forest-mid"
            >
              See all <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        />

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((card, index) => (
            <Reveal as="li" key={card.slug} delay={(index % 3) * 60}>
              <RecipeCard card={card} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ Cuisine of the week */

export function FeaturedCuisine({
  cuisineSlug,
  dishes,
  imageRecipeSlug,
}: {
  cuisineSlug: string;
  dishes: Recipe[];
  /** Kept separate from the dish list so this band never repeats the hero photo. */
  imageRecipeSlug: string;
}) {
  const cuisine = cuisineBySlug.get(cuisineSlug);
  const lead = recipeBySlug.get(imageRecipeSlug) ?? dishes[0];
  if (!cuisine || !lead) return null;

  return (
    <section className="u-shell py-20">
      <div className="overflow-hidden rounded-[var(--radius-media)] bg-forest-deep">
        <div className="grid lg:grid-cols-2">
          <div className="order-2 flex min-w-0 flex-col justify-center p-6 sm:p-12 lg:order-1 lg:p-14">
            <p className="u-data text-cream/60">Cuisine of the week</p>
            <h2 className="mt-4 text-[length:var(--text-display-lg)] text-cream">{cuisine.name}</h2>
            <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-cream/75">
              {cuisine.blurb}
            </p>

            <div className="mt-8">
              <p className="u-data text-cream/50">Three to start with</p>
              <ul className="mt-4 divide-y divide-cream/12 border-y border-cream/12">
                {dishes.slice(0, 3).map((dish) => {
                  const country = countryBySlug.get(dish.countrySlug);
                  return (
                    <li key={dish.slug}>
                      <Link
                        href={`/recipes/${dish.slug}`}
                        className="group flex items-center justify-between gap-4 py-3.5 transition-colors hover:text-saffron"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-display text-lg text-cream group-hover:text-saffron">
                            {dish.name}
                          </span>
                          <span className="u-data-sm mt-0.5 flex items-center gap-1.5 text-cream/55">
                            <Flag iso2={country?.iso2 ?? "un"} title={country?.name ?? ""} />
                            {dish.origin.city}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-cream/40 transition-transform group-hover:translate-x-1 group-hover:text-saffron"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Link
              href={`/cuisines/${cuisine.slug}`}
              className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-cream px-7 font-semibold text-forest-deep transition-colors hover:bg-saffron"
            >
              Explore this cuisine
            </Link>
          </div>

          <div className="order-1 min-w-0 lg:order-2">
            {/* No min-height here: combined with an aspect ratio it would set
                the width from the height and burst the container on a phone. */}
            <FoodImage
              image={lead.image}
              alt={lead.imageAlt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              ratio="4 / 3"
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- How it works */

const STEPS = [
  {
    title: "Pick a country or a craving",
    body: "Browse by region, filter by what you have in, or search for the dish you ate on holiday and never found again.",
  },
  {
    title: "Set it to your table",
    body: "Change the serving count and every quantity updates. Switch between metric and imperial without doing sums.",
  },
  {
    title: "Cook it, step by step",
    body: "Send the ingredients to your shopping list, then open cooking mode for one step at a time with the screen kept awake.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-cream-deep py-20">
      <div className="u-shell">
        <SectionHeading eyebrow="How it works" title="From curious to cooking" />

        {/* Numbered because this genuinely is a sequence — you cannot cook the
            dish before you have chosen it. */}
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 80} className="bg-cream">
              <div className="flex h-full flex-col p-7 lg:p-9">
                <span aria-hidden="true" className="font-display text-5xl leading-none text-forest/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-display text-2xl leading-tight text-ink">{step.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Community */

export function Community() {
  const featured = reviews.filter((review) => review.rating === 5).slice(0, 3);

  return (
    <section className="u-shell py-20">
      <SectionHeading
        eyebrow="Cooked this week"
        title="Notes from other kitchens"
        intro="Reviews from people who actually made the dish, including the bits that went wrong."
      />

      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {featured.map((review, index) => {
          const recipe = recipeBySlug.get(review.recipeSlug);
          return (
            <Reveal as="li" key={review.id} delay={index * 70}>
              <figure className="flex h-full flex-col rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line-soft">
                <Rating rating={review.rating} size="sm" />
                <blockquote className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-ink">
                  “{review.body}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-wash u-data-sm text-forest"
                  >
                    {review.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {review.author}
                    </span>
                    <span className="u-data-sm block truncate text-muted">
                      {recipe ? recipe.name : review.recipeSlug} / {review.cookedFor}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          );
        })}
      </ul>

      <p className="mt-6 u-data-sm text-muted">
        Most recent review {formatDate(featured[0]?.date ?? "2026-08-07")}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------- Newsletter */

export function Newsletter() {
  return (
    <section className="u-shell pb-4">
      <div className="rounded-[var(--radius-media)] bg-forest px-6 py-14 text-center sm:px-12">
        <p className="u-data text-cream/60">One dish a week</p>
        <h2 className="mx-auto mt-4 max-w-2xl text-[length:var(--text-display-lg)] text-cream">
          Travel the world from your kitchen
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[1.0625rem] text-cream/75">
          Every Thursday: one recipe, the place it comes from, and what to buy for it. Nothing else.
        </p>

        <form
          className="mx-auto mt-8 flex w-full max-w-lg flex-col gap-3 sm:flex-row"
          action="/"
          method="get"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-13 flex-1 rounded-full bg-cream px-6 text-ink outline-none ring-1 ring-transparent placeholder:text-muted focus-visible:ring-2 focus-visible:ring-saffron"
          />
          <button
            type="submit"
            className="h-13 shrink-0 rounded-full bg-saffron px-7 font-semibold text-forest-deep transition-colors hover:bg-cream"
          >
            Get weekly recipes
          </button>
        </form>

        <p className="mt-4 text-sm text-cream/55">
          One email a week. Unsubscribe in a click. We never sell your address.
        </p>
      </div>
    </section>
  );
}
