import type { Recipe } from "@/lib/types";
import { africaRecipes } from "./africa";
import { asiaRecipes } from "./asia";
import { europeRecipes } from "./europe";
import { americasRecipes } from "./americas";
import { middleEastRecipes } from "./middle-east";
import { islandsRecipes } from "./islands";

export const recipes: Recipe[] = [
  ...africaRecipes,
  ...asiaRecipes,
  ...europeRecipes,
  ...americasRecipes,
  ...middleEastRecipes,
  ...islandsRecipes,
];

export const recipeBySlug = new Map(recipes.map((r) => [r.slug, r]));
