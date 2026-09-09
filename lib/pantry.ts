import type { Ingredient, Recipe } from "./types";
import { toCardData, type RecipeCardData } from "./cards";
import { ASSUMED, PANTRY, pantryById, type MatchRule } from "@/data/pantry";

/**
 * Matching a kitchen against a recipe.
 *
 * The question this answers is "what can I cook tonight", which is not the
 * question the filters answer. Filters remove things; this removes nothing and
 * ranks by how much of each recipe you already have, then names what you would
 * still need. A recipe you are two ingredients away from is worth seeing.
 */

/** Whether one rule covers an ingredient line. Vetoes win. */
export function ruleMatches(rule: MatchRule, name: string): boolean {
  const lower = name.toLowerCase();
  if (rule.except?.some((veto) => lower.includes(veto))) return false;
  if (rule.exact?.some((word) => lower === word)) return true;
  return rule.match?.some((term) => lower.includes(term)) ?? false;
}

/** Salt, water, sugar and the frying oil — never counted against you. */
export function isAssumed(name: string): boolean {
  return ASSUMED.some((rule) => ruleMatches(rule, name));
}

/** Every pantry entry that covers this ingredient line. */
export function itemsFor(name: string): string[] {
  return PANTRY.filter((item) => ruleMatches(item, name)).map((item) => item.id);
}

export interface Coverage {
  recipe: Recipe;
  /** Ingredients your selection covers. */
  have: Ingredient[];
  /** What you would have to buy. This is the number that matters. */
  missing: Ingredient[];
  /** Marked optional in the recipe, so never counted against you. */
  optional: Ingredient[];
  /** How many lines were taken as given. Shown so the count is explainable. */
  assumed: number;
  /** have / (have + missing). 1 when nothing is required beyond staples. */
  ratio: number;
}

function requiredIngredients(recipe: Recipe): Ingredient[] {
  return recipe.ingredientGroups.flatMap((group) => group.items);
}

export function coverageFor(recipe: Recipe, selected: string[]): Coverage {
  const rules = selected.map((id) => pantryById.get(id)).filter((item) => item !== undefined);

  const have: Ingredient[] = [];
  const missing: Ingredient[] = [];
  const optional: Ingredient[] = [];
  let assumed = 0;

  for (const ingredient of requiredIngredients(recipe)) {
    if (ingredient.optional) {
      optional.push(ingredient);
      continue;
    }
    if (isAssumed(ingredient.name)) {
      assumed += 1;
      continue;
    }
    if (rules.some((rule) => ruleMatches(rule, ingredient.name))) have.push(ingredient);
    else missing.push(ingredient);
  }

  const counted = have.length + missing.length;
  return {
    recipe,
    have,
    missing,
    optional,
    assumed,
    ratio: counted === 0 ? 1 : have.length / counted,
  };
}

/**
 * Ranked by how many trips to the shop it would take, not by percentage.
 * A short recipe missing two things and a long one missing two things are
 * equally far away, and the shorter one is not more cookable for being short.
 *
 * One comparator, used by both the server-side and the browser-side path, so
 * the order cannot drift between them.
 */
function byShoppingTrip(
  a: { missing: unknown[]; ratio: number; rating: number },
  b: { missing: unknown[]; ratio: number; rating: number },
): number {
  return a.missing.length - b.missing.length || b.ratio - a.ratio || b.rating - a.rating;
}

export function rankByPantry(recipes: Recipe[], selected: string[]): Coverage[] {
  if (!selected.length) return [];

  return recipes
    .map((recipe) => coverageFor(recipe, selected))
    // Nothing in common is not a near miss, it is a different meal.
    .filter((coverage) => coverage.have.length > 0)
    .sort((a, b) =>
      byShoppingTrip(
        { ...a, rating: a.recipe.rating },
        { ...b, rating: b.recipe.rating },
      ),
    );
}

/* ------------------------------------------------ the browser-side shape */

/** One thing a recipe needs, and the pantry entries that would cover it. */
export interface Need {
  name: string;
  ids: string[];
}

/**
 * What the picker page sends to the browser.
 *
 * Toggling an ingredient has to feel instant — you tap six things in a row —
 * so the matching runs client-side. Sending whole recipes to do that would
 * ship the cookbook; this sends each card plus the names of what it needs,
 * which is a few hundred short strings for the entire catalogue.
 */
export interface PantryRecipe {
  card: RecipeCardData;
  needs: Need[];
  /** Counted only so the page can explain the numbers it shows. */
  optional: number;
  assumed: number;
}

export function toPantryList(recipes: Recipe[]): PantryRecipe[] {
  return recipes.map((recipe) => {
    const needs: Need[] = [];
    let optional = 0;
    let assumed = 0;

    for (const ingredient of requiredIngredients(recipe)) {
      if (ingredient.optional) optional += 1;
      else if (isAssumed(ingredient.name)) assumed += 1;
      else needs.push({ name: ingredient.name, ids: itemsFor(ingredient.name) });
    }

    return { card: toCardData(recipe), needs, optional, assumed };
  });
}

export interface Match extends PantryRecipe {
  have: Need[];
  missing: Need[];
  ratio: number;
}

export function matchKitchen(items: PantryRecipe[], selected: string[]): Match[] {
  if (!selected.length) return [];
  const kitchen = new Set(selected);

  return items
    .map((item) => {
      const have = item.needs.filter((need) => need.ids.some((id) => kitchen.has(id)));
      const missing = item.needs.filter((need) => !need.ids.some((id) => kitchen.has(id)));
      return {
        ...item,
        have,
        missing,
        ratio: item.needs.length === 0 ? 1 : have.length / item.needs.length,
      };
    })
    .filter((match) => match.have.length > 0)
    .sort((a, b) =>
      byShoppingTrip(
        { ...a, rating: a.card.rating },
        { ...b, rating: b.card.rating },
      ),
    );
}

/** Distinct ingredient names still needed, for the "add to list" shortcut. */
export function missingNames(coverages: Coverage[]): string[] {
  const seen = new Set<string>();
  for (const coverage of coverages) {
    for (const ingredient of coverage.missing) seen.add(ingredient.name);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
