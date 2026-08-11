import { localAdapter, type RecipeAdapter } from "./adapters/localAdapter";

/**
 * The only thing the UI talks to for catalogue data.
 *
 * Today it reads a local dataset. Pointing it at a recipe API means writing
 * one more adapter with the same shape and swapping the line below — no page
 * or component changes, because nothing above this line knows where recipes
 * come from.
 *
 * An API key would be read here, e.g.:
 *   const adapter = process.env.RECIPE_API_KEY ? httpAdapter : localAdapter
 */
const adapter: RecipeAdapter = localAdapter;

export const recipeService = adapter;

export type { RecipeAdapter };
