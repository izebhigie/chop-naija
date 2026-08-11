import type { Metadata } from "next";
import { Suspense } from "react";
import { recipes } from "@/data/recipes";
import { countries } from "@/data/countries";
import { cuisines } from "@/data/cuisines";
import { regions } from "@/data/regions";
import { applyQuery, parseQuery, facetCounts } from "@/lib/filters";
import { toCardList } from "@/lib/cards";
import type { RecipeQuery } from "@/lib/types";
import { DiscoveryClient } from "@/components/discovery/DiscoveryClient";
import type { FilterGroupSpec } from "@/components/discovery/FilterPanel";
import { RecipeCardSkeleton } from "@/components/ui/primitives";
import { SearchBar } from "@/components/search/SearchBar";

export const metadata: Metadata = {
  title: "All recipes",
  description:
    "Search and filter recipes from 29 countries by cuisine, ingredient, dietary need, cooking time and difficulty.",
};

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Side"];
const DIETS = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Pescatarian", "Low-carb"];
const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Fish", "Shellfish", "Peanuts", "Tree nuts", "Soy", "Sesame"];
const METHODS = ["Simmered", "Grilled", "Fried", "Roasted", "Baked", "Steamed", "Stir-fried", "Braised", "Raw", "No-cook"];
const DIFFICULTY = ["Easy", "Medium", "Hard"];

/**
 * Facet counts are worked out against the results you would get if this one
 * group were cleared. That way a count never reads zero purely because of a
 * selection inside its own group.
 */
function buildGroups(query: RecipeQuery): FilterGroupSpec[] {
  const countsFor = <T extends string>(
    key: keyof RecipeQuery,
    pick: (recipe: (typeof recipes)[number]) => T | T[],
  ) => facetCounts(applyQuery(recipes, { ...query, [key]: [] }), pick);

  const regionCounts = countsFor("regions", (r) => r.region);
  const countryCounts = countsFor("countries", (r) => r.countrySlug);
  const cuisineCounts = countsFor("cuisines", (r) => r.cuisineSlug);
  const mealCounts = countsFor("mealTypes", (r) => r.mealTypes as string[]);
  const dietCounts = countsFor("diets", (r) => r.diets as string[]);
  const allergenCounts = countsFor("allergens", (r) => r.allergens as string[]);
  const methodCounts = countsFor("methods", (r) => r.methods as string[]);
  const difficultyCounts = countsFor("difficulty", (r) => r.difficulty as string);
  const ingredientCounts = countsFor("ingredients", (r) => r.mainIngredient);

  const mainIngredients = [...new Set(recipes.map((r) => r.mainIngredient))].sort();

  return [
    {
      key: "regions",
      title: "Region",
      defaultOpen: true,
      options: regions.map((region) => ({
        value: region.slug,
        label: region.name,
        count: regionCounts.get(region.slug) ?? 0,
      })),
    },
    {
      key: "countries",
      title: "Country",
      searchable: true,
      options: [...countries]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((country) => ({
          value: country.slug,
          label: country.name,
          count: countryCounts.get(country.slug) ?? 0,
        })),
    },
    {
      key: "cuisines",
      title: "Cuisine",
      searchable: true,
      options: [...cuisines]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((cuisine) => ({
          value: cuisine.slug,
          label: cuisine.name,
          count: cuisineCounts.get(cuisine.slug) ?? 0,
        })),
    },
    {
      key: "mealTypes",
      title: "Meal type",
      options: MEAL_TYPES.map((meal) => ({
        value: meal,
        label: meal,
        count: mealCounts.get(meal) ?? 0,
      })),
    },
    {
      key: "ingredients",
      title: "Main ingredient",
      searchable: true,
      options: mainIngredients.map((ingredient) => ({
        value: ingredient,
        label: ingredient,
        count: ingredientCounts.get(ingredient) ?? 0,
      })),
    },
    {
      key: "diets",
      title: "Dietary",
      options: DIETS.map((diet) => ({
        value: diet,
        label: diet,
        count: dietCounts.get(diet) ?? 0,
      })),
    },
    {
      key: "allergens",
      title: "Exclude allergens",
      options: ALLERGENS.map((allergen) => ({
        value: allergen,
        label: allergen,
        count: allergenCounts.get(allergen) ?? 0,
      })),
    },
    {
      key: "difficulty",
      title: "Difficulty",
      options: DIFFICULTY.map((level) => ({
        value: level,
        label: level,
        count: difficultyCounts.get(level) ?? 0,
      })),
    },
    {
      key: "methods",
      title: "Cooking method",
      searchable: true,
      options: METHODS.map((method) => ({
        value: method,
        label: method,
        count: methodCounts.get(method) ?? 0,
      })),
    },
  ];
}

export default async function RecipesPage(props: PageProps<"/recipes">) {
  const params = await props.searchParams;
  const query = parseQuery(params);
  const results = toCardList(applyQuery(recipes, query));

  return (
    <>
      <div className="border-b border-line-soft bg-cream-deep py-8">
        <div className="u-shell">
          <SearchBar defaultValue={query.q ?? ""} className="max-w-2xl" />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="u-shell py-16">
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <li key={index}>
                  <RecipeCardSkeleton />
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <DiscoveryClient results={results} groups={buildGroups(query)} total={recipes.length} />
      </Suspense>
    </>
  );
}
