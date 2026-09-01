import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Flame, ChefHat, Users, Play } from "lucide-react";
import { recipes, recipeBySlug } from "@/data/recipes";
import { countryBySlug } from "@/data/countries";
import { cuisineBySlug } from "@/data/cuisines";
import { recipeService } from "@/services/recipeService";
import { toCardList } from "@/lib/cards";
import { formatDuration, toIsoDuration, formatQuantity } from "@/lib/units";
import { formatCoordinates } from "@/lib/format";
import { FoodImage } from "@/components/ui/FoodImage";
import { Flag } from "@/components/ui/Flag";
import { Rating, Tag, SectionHeading } from "@/components/ui/primitives";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { RecipeWorkspace } from "@/components/recipe/RecipeWorkspace";
import { RecipeActions } from "@/components/recipe/RecipeActions";
import { ReviewSection } from "@/components/recipe/ReviewSection";

export function generateStaticParams() {
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata(
  props: PageProps<"/recipes/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const recipe = recipeBySlug.get(slug);
  if (!recipe) return { title: "Recipe not found" };

  const country = countryBySlug.get(recipe.countrySlug);

  return {
    title: recipe.name,
    description: recipe.description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: {
      type: "article",
      title: `${recipe.name} — ${country?.name ?? ""}`.trim(),
      description: recipe.description,
      images: [{ url: recipe.image.src, width: recipe.image.width, height: recipe.image.height }],
    },
  };
}

export default async function RecipePage(props: PageProps<"/recipes/[slug]">) {
  const { slug } = await props.params;
  const recipe = recipeBySlug.get(slug);
  if (!recipe) notFound();

  const country = countryBySlug.get(recipe.countrySlug);
  const cuisine = cuisineBySlug.get(recipe.cuisineSlug);
  const [related, reviews] = await Promise.all([
    recipeService.getRelated(recipe.slug, 3),
    recipeService.getReviews(recipe.slug),
  ]);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  /** Schema.org Recipe markup, so search engines read this as a recipe. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.name,
    description: recipe.description,
    image: [recipe.image.src],
    recipeCuisine: cuisine?.name,
    recipeCategory: recipe.mealTypes.join(", "),
    recipeYield: `${recipe.servings} servings`,
    prepTime: toIsoDuration(recipe.prepMinutes),
    cookTime: toIsoDuration(recipe.cookMinutes),
    totalTime: toIsoDuration(totalMinutes),
    keywords: [recipe.mainIngredient, country?.name, cuisine?.name].filter(Boolean).join(", "),
    author: { "@type": "Person", name: recipe.author.name },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: recipe.rating,
      reviewCount: recipe.reviewCount,
      bestRating: 5,
    },
    nutrition: {
      "@type": "NutritionInformation",
      calories: `${recipe.nutrition.calories} kcal`,
      proteinContent: `${recipe.nutrition.protein} g`,
      carbohydrateContent: `${recipe.nutrition.carbs} g`,
      fatContent: `${recipe.nutrition.fat} g`,
      fiberContent: `${recipe.nutrition.fibre} g`,
      sugarContent: `${recipe.nutrition.sugar} g`,
      sodiumContent: `${recipe.nutrition.sodium} mg`,
    },
    recipeIngredient: recipe.ingredientGroups.flatMap((group) =>
      group.items.map((item) => {
        const amount = [formatQuantity(item.qty, item.unit), item.name]
          .filter(Boolean)
          .join(" ")
          .trim();
        return item.note ? `${amount}, ${item.note}` : amount;
      }),
    ),
    recipeInstructions: recipe.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step.body,
    })),
  };

  const stats = [
    { label: "Total time", value: formatDuration(totalMinutes), icon: Clock },
    { label: "Prep", value: formatDuration(recipe.prepMinutes), icon: Clock },
    { label: "Difficulty", value: recipe.difficulty, icon: ChefHat },
    { label: "Per serving", value: `${recipe.nutrition.calories} kcal`, icon: Flame },
    { label: "Serves", value: String(recipe.servings), icon: Users },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        {/* ------------------------------------------------------------ Hero */}
        <div className="u-shell pt-8">
          <nav aria-label="Breadcrumb" className="u-data text-muted print-hide">
            <Link href="/recipes" className="hover:text-forest">
              Recipes
            </Link>
            <span aria-hidden="true"> / </span>
            <Link href={`/cuisines/${recipe.cuisineSlug}`} className="hover:text-forest">
              {cuisine?.name}
            </Link>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {recipe.mealTypes.slice(0, 2).map((meal) => (
                  <Tag key={meal} tone="forest">
                    {meal}
                  </Tag>
                ))}
                {recipe.diets.map((diet) => (
                  <Tag key={diet}>{diet}</Tag>
                ))}
              </div>

              <h1 className="mt-4 text-[length:var(--text-display-lg)]">{recipe.name}</h1>

              {recipe.localName ? (
                <p className="u-script mt-2 text-lg text-muted">
                  {recipe.localName}
                  {recipe.localLanguage ? (
                    <span className="u-data ml-2 text-muted">{recipe.localLanguage}</span>
                  ) : null}
                </p>
              ) : null}

              <div className="u-data mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-line py-3 text-forest">
                <Link
                  href={`/countries/${recipe.countrySlug}`}
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <Flag iso2={country?.iso2 ?? "un"} title={country?.name ?? ""} />
                  {country?.name}
                </Link>
                <span aria-hidden="true" className="text-line">
                  /
                </span>
                <span className="text-muted">{recipe.origin.city}</span>
                <span aria-hidden="true" className="text-line">
                  /
                </span>
                <span className="text-muted tabular-nums">
                  {formatCoordinates(recipe.origin.lat, recipe.origin.lon)}
                </span>
              </div>

              <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted">
                {recipe.description}
              </p>

              <div className="mt-6">
                <Rating rating={recipe.rating} reviewCount={recipe.reviewCount} />
              </div>

              <div className="mt-6">
                <RecipeActions slug={recipe.slug} name={recipe.name} servings={recipe.servings} />
              </div>
            </div>

            <FoodImage
              image={recipe.image}
              alt={recipe.imageAlt}
              sizes="(min-width: 1024px) 660px, 92vw"
              ratio="4 / 3"
              priority
              quality={90}
              className="rounded-[var(--radius-media)] shadow-[var(--shadow-soft)]"
            />
          </div>

          <p className="mt-3 text-xs text-muted">
            Photograph: {recipe.image.author} /{" "}
            <a
              href={recipe.image.source}
              rel="noreferrer noopener"
              target="_blank"
              className="underline underline-offset-2"
            >
              Wikimedia Commons
            </a>{" "}
            / {recipe.image.licence}
          </p>

          {/* --------------------------------------------------------- Stats */}
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] bg-line sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-cream px-5 py-4">
                <dt className="u-data flex items-center gap-1.5 text-muted">
                  <stat.icon aria-hidden="true" className="size-3.5" />
                  {stat.label}
                </dt>
                <dd className="mt-1.5 font-display text-xl text-ink">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ------------------------------------------- Ingredients + method */}
        <div className="u-shell py-16">
          <RecipeWorkspace recipe={recipe} />
        </div>

        {/* -------------------------------------------- Story and nutrition */}
        <div className="bg-cream-deep py-16 print-hide">
          <div className="u-shell grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            <section aria-labelledby="story-heading">
              <p className="u-data text-forest">Story behind the dish</p>
              <h2 id="story-heading" className="mt-3 text-[length:var(--text-display-md)]">
                Where {recipe.name} comes from
              </h2>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted">{recipe.story}</p>

              <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                <span
                  aria-hidden="true"
                  className="u-data grid size-11 place-items-center rounded-full bg-forest text-cream"
                >
                  {recipe.author.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{recipe.author.name}</p>
                  <p className="u-data-sm text-muted">{recipe.author.role}</p>
                </div>
              </div>

              {recipe.video ? (
                <div className="mt-8">
                  <div className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] bg-forest-deep">
                    <div className="text-center">
                      <Play
                        aria-hidden="true"
                        className="mx-auto size-12 text-cream/70"
                        strokeWidth={1.25}
                      />
                      <p className="mt-3 font-display text-xl text-cream">{recipe.video.title}</p>
                      <p className="u-data mt-1 text-cream/50">{recipe.video.duration}</p>
                    </div>
                  </div>
                  <p className="u-data-sm mt-2 text-muted">
                    Video is not available in this demo build
                  </p>
                </div>
              ) : null}
            </section>

            <aside className="space-y-6">
              <div className="rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line-soft">
                <h2 className="u-data text-forest">Nutrition, per serving</h2>
                <dl className="mt-4 divide-y divide-line-soft">
                  {[
                    ["Energy", `${recipe.nutrition.calories} kcal`],
                    ["Protein", `${recipe.nutrition.protein} g`],
                    ["Carbohydrate", `${recipe.nutrition.carbs} g`],
                    ["Fat", `${recipe.nutrition.fat} g`],
                    ["Fiber", `${recipe.nutrition.fibre} g`],
                    ["Sugars", `${recipe.nutrition.sugar} g`],
                    ["Sodium", `${recipe.nutrition.sodium} mg`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between py-2.5">
                      <dt className="text-[0.9375rem] text-muted">{label}</dt>
                      <dd className="text-[0.9375rem] font-semibold text-ink tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs text-muted">
                  Estimated from the ingredient list at {recipe.servings} servings.
                </p>
              </div>

              <div className="rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line-soft">
                <h2 className="u-data text-forest">Allergens and diet</h2>
                {recipe.allergens.length ? (
                  <>
                    <p className="mt-4 text-[0.9375rem] text-muted">Contains</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.allergens.map((allergen) => (
                        <Tag key={allergen} tone="tomato">
                          {allergen}
                        </Tag>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-[0.9375rem] text-muted">
                    None of the 9 major allergens.
                  </p>
                )}

                {recipe.diets.length ? (
                  <>
                    <p className="mt-5 text-[0.9375rem] text-muted">Suitable for</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.diets.map((diet) => (
                        <Tag key={diet} tone="forest">
                          {diet}
                        </Tag>
                      ))}
                    </div>
                  </>
                ) : null}

                <p className="mt-5 text-xs text-muted">
                  Always check labels if you are cooking for someone with an allergy.
                </p>
              </div>
            </aside>
          </div>
        </div>

        {/* ------------------------------------------------------- Reviews */}
        <div className="u-shell py-16">
          <ReviewSection
            reviews={reviews}
            recipeName={recipe.name}
            rating={recipe.rating}
            reviewCount={recipe.reviewCount}
          />
        </div>

        {/* ------------------------------------------------------- Related */}
        {related.length ? (
          <div className="u-shell pb-20 print-hide">
            <SectionHeading
              eyebrow="Cook next"
              title="If you liked this one"
              intro={`More from ${cuisine?.name ?? "this cuisine"} and its neighbors.`}
            />
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {toCardList(related).map((card) => (
                <li key={card.slug}>
                  <RecipeCard card={card} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
    </>
  );
}
