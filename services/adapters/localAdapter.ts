import { recipes, recipeBySlug } from "@/data/recipes";
import { countries, countryBySlug } from "@/data/countries";
import { cuisines, cuisineBySlug } from "@/data/cuisines";
import { regions } from "@/data/regions";
import { reviewsBySlug } from "@/data/reviews";
import { applyQuery } from "@/lib/filters";
import type {
  Country,
  Cuisine,
  Recipe,
  RecipeQuery,
  RecipeResult,
  Region,
  RegionSlug,
  Review,
} from "@/lib/types";

/**
 * Reads the catalogue from the local dataset.
 *
 * An HTTP adapter would implement this same shape against a recipe API; the
 * UI talks only to the service layer above it and would not need to change.
 */
export interface RecipeAdapter {
  listRecipes(query: RecipeQuery): Promise<RecipeResult>;
  getRecipe(slug: string): Promise<Recipe | null>;
  getRelated(slug: string, limit?: number): Promise<Recipe[]>;
  suggest(term: string, limit?: number): Promise<Recipe[]>;
  listCountries(): Promise<Country[]>;
  getCountry(slug: string): Promise<Country | null>;
  listCuisines(): Promise<Cuisine[]>;
  getCuisine(slug: string): Promise<Cuisine | null>;
  listRegions(): Promise<Region[]>;
  getReviews(slug: string): Promise<Review[]>;
  getRegionCounts(): Promise<Record<RegionSlug, number>>;
}

export const localAdapter: RecipeAdapter = {
  async listRecipes(query) {
    const matched = applyQuery(recipes, query);
    const page = Math.max(1, query.page ?? 1);
    const perPage = query.perPage ?? 12;
    const start = (page - 1) * perPage;
    const slice = matched.slice(start, start + perPage);

    return {
      recipes: slice,
      total: matched.length,
      page,
      perPage,
      hasMore: start + slice.length < matched.length,
    };
  },

  async getRecipe(slug) {
    return recipeBySlug.get(slug) ?? null;
  },

  async getRelated(slug, limit = 3) {
    const recipe = recipeBySlug.get(slug);
    if (!recipe) return [];

    const explicit = recipe.relatedSlugs
      .map((related) => recipeBySlug.get(related))
      .filter((item): item is Recipe => Boolean(item));

    if (explicit.length >= limit) return explicit.slice(0, limit);

    // Fall back to the same cuisine, then the same region.
    const seen = new Set([slug, ...explicit.map((item) => item.slug)]);
    const nearby = recipes
      .filter((item) => !seen.has(item.slug))
      .sort((a, b) => {
        const score = (candidate: Recipe) =>
          (candidate.cuisineSlug === recipe.cuisineSlug ? 2 : 0) +
          (candidate.region === recipe.region ? 1 : 0);
        return score(b) - score(a) || b.rating - a.rating;
      });

    return [...explicit, ...nearby].slice(0, limit);
  },

  async suggest(term, limit = 6) {
    const trimmed = term.trim();
    if (!trimmed) return [];
    return applyQuery(recipes, { q: trimmed, sort: "relevance" }).slice(0, limit);
  },

  async listCountries() {
    return countries;
  },

  async getCountry(slug) {
    return countryBySlug.get(slug) ?? null;
  },

  async listCuisines() {
    return cuisines;
  },

  async getCuisine(slug) {
    return cuisineBySlug.get(slug) ?? null;
  },

  async listRegions() {
    return regions;
  },

  async getReviews(slug) {
    return reviewsBySlug[slug] ?? [];
  },

  async getRegionCounts() {
    const counts = {} as Record<RegionSlug, number>;
    for (const region of regions) {
      counts[region.slug] = recipes.filter((recipe) => recipe.region === region.slug).length;
    }
    return counts;
  },
};
