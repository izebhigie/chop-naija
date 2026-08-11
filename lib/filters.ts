import type {
  Allergen,
  CookingMethod,
  Diet,
  Difficulty,
  MealType,
  Recipe,
  RecipeQuery,
  RegionSlug,
  SortKey,
} from "./types";

/**
 * Filtering, sorting and URL round-tripping for the recipe catalogue.
 *
 * Everything here is a pure function over an array of recipes, so the same
 * code runs on the server for the first render and in the browser when
 * somebody changes a filter. Query state lives entirely in the URL, which is
 * what makes a filtered view shareable.
 */

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match",
  rating: "Highest rated",
  newest: "Recently added",
  time: "Quickest first",
  popularity: "Most cooked",
};

export type ViewMode = "grid" | "list";

type RawParams = Record<string, string | string[] | undefined>;

function readList(params: RawParams, key: string): string[] {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function readOne(params: RawParams, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export function parseQuery(params: RawParams): RecipeQuery {
  const time = Number(readOne(params, "time"));
  const rating = Number(readOne(params, "rating"));
  const sort = readOne(params, "sort") as SortKey | undefined;

  return {
    q: readOne(params, "q"),
    regions: readList(params, "region") as RegionSlug[],
    countries: readList(params, "country"),
    cuisines: readList(params, "cuisine"),
    mealTypes: readList(params, "meal") as MealType[],
    ingredients: readList(params, "ingredient"),
    diets: readList(params, "diet") as Diet[],
    allergens: readList(params, "allergen") as Allergen[],
    methods: readList(params, "method") as CookingMethod[],
    difficulty: readList(params, "difficulty") as Difficulty[],
    maxMinutes: Number.isFinite(time) && time > 0 ? time : undefined,
    minRating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    sort: sort && sort in SORT_LABELS ? sort : "relevance",
  };
}

export function serializeQuery(query: RecipeQuery): URLSearchParams {
  const params = new URLSearchParams();
  const put = (key: string, values?: string[]) => {
    if (values && values.length) params.set(key, values.join(","));
  };

  if (query.q) params.set("q", query.q);
  put("region", query.regions);
  put("country", query.countries);
  put("cuisine", query.cuisines);
  put("meal", query.mealTypes);
  put("ingredient", query.ingredients);
  put("diet", query.diets);
  put("allergen", query.allergens);
  put("method", query.methods);
  put("difficulty", query.difficulty);
  if (query.maxMinutes) params.set("time", String(query.maxMinutes));
  if (query.minRating) params.set("rating", String(query.minRating));
  if (query.sort && query.sort !== "relevance") params.set("sort", query.sort);

  return params;
}

export function isEmptyQuery(query: RecipeQuery): boolean {
  return serializeQuery({ ...query, sort: "relevance" }).toString() === "";
}

export function countActiveFilters(query: RecipeQuery): number {
  return (
    (query.q ? 1 : 0) +
    (query.regions?.length ?? 0) +
    (query.countries?.length ?? 0) +
    (query.cuisines?.length ?? 0) +
    (query.mealTypes?.length ?? 0) +
    (query.ingredients?.length ?? 0) +
    (query.diets?.length ?? 0) +
    (query.allergens?.length ?? 0) +
    (query.methods?.length ?? 0) +
    (query.difficulty?.length ?? 0) +
    (query.maxMinutes ? 1 : 0) +
    (query.minRating ? 1 : 0)
  );
}

export function totalMinutes(recipe: Recipe): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}

/** Free-text match across the fields a cook would actually search by. */
function matchesText(recipe: Recipe, term: string): boolean {
  const haystack = [
    recipe.name,
    recipe.localName ?? "",
    recipe.description,
    recipe.cuisineSlug,
    recipe.countrySlug,
    recipe.origin.city,
    recipe.mainIngredient,
    ...recipe.categories,
    ...recipe.ingredientGroups.flatMap((group) => group.items.map((item) => item.name)),
  ]
    .join(" ")
    .toLowerCase();

  // Every word must appear somewhere — "thai chicken" should not match a Thai dessert.
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/** A rough relevance score, highest first. */
function relevanceScore(recipe: Recipe, term?: string): number {
  if (!term) return recipe.rating * 20 + recipe.cooksThisMonth / 100;
  const lower = term.toLowerCase();
  let score = 0;
  if (recipe.name.toLowerCase() === lower) score += 1000;
  if (recipe.name.toLowerCase().startsWith(lower)) score += 500;
  if (recipe.name.toLowerCase().includes(lower)) score += 250;
  if ((recipe.localName ?? "").toLowerCase().includes(lower)) score += 200;
  if (recipe.countrySlug.includes(lower) || recipe.cuisineSlug.includes(lower)) score += 120;
  if (recipe.mainIngredient.toLowerCase().includes(lower)) score += 80;
  return score + recipe.rating * 10;
}

export function applyQuery(recipes: Recipe[], query: RecipeQuery): Recipe[] {
  const filtered = recipes.filter((recipe) => {
    if (query.q && !matchesText(recipe, query.q)) return false;
    if (query.regions?.length && !query.regions.includes(recipe.region)) return false;
    if (query.countries?.length && !query.countries.includes(recipe.countrySlug)) return false;
    if (query.cuisines?.length && !query.cuisines.includes(recipe.cuisineSlug)) return false;

    if (query.mealTypes?.length && !query.mealTypes.some((m) => recipe.mealTypes.includes(m))) {
      return false;
    }
    if (query.methods?.length && !query.methods.some((m) => recipe.methods.includes(m))) {
      return false;
    }
    if (query.difficulty?.length && !query.difficulty.includes(recipe.difficulty)) return false;

    // Diets are restrictive: a recipe must satisfy every diet selected.
    if (query.diets?.length && !query.diets.every((d) => recipe.diets.includes(d))) return false;

    // Allergens are exclusions: hide anything containing any of them.
    if (query.allergens?.length && query.allergens.some((a) => recipe.allergens.includes(a))) {
      return false;
    }

    if (query.ingredients?.length) {
      const names = recipe.ingredientGroups
        .flatMap((group) => group.items.map((item) => item.name.toLowerCase()))
        .join(" ");
      const alsoMain = recipe.mainIngredient.toLowerCase();
      const hasAll = query.ingredients.every(
        (ing) => names.includes(ing.toLowerCase()) || alsoMain.includes(ing.toLowerCase()),
      );
      if (!hasAll) return false;
    }

    if (query.maxMinutes && totalMinutes(recipe) > query.maxMinutes) return false;
    if (query.minRating && recipe.rating < query.minRating) return false;

    return true;
  });

  return sortRecipes(filtered, query.sort ?? "relevance", query.q);
}

export function sortRecipes(recipes: Recipe[], sort: SortKey, term?: string): Recipe[] {
  const sorted = [...recipes];
  switch (sort) {
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case "newest":
      sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      break;
    case "time":
      sorted.sort((a, b) => totalMinutes(a) - totalMinutes(b));
      break;
    case "popularity":
      sorted.sort((a, b) => b.cooksThisMonth - a.cooksThisMonth);
      break;
    default:
      sorted.sort((a, b) => relevanceScore(b, term) - relevanceScore(a, term));
  }
  return sorted;
}

/**
 * How many recipes each option would still match. Used to show counts beside
 * filters and to disable options that would return nothing.
 */
export function facetCounts<T extends string>(
  recipes: Recipe[],
  pick: (recipe: Recipe) => T | T[],
): Map<T, number> {
  const counts = new Map<T, number>();
  for (const recipe of recipes) {
    const value = pick(recipe);
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  return counts;
}
