import type { Ingredient, Recipe, Substitution } from "./types";

/**
 * Applying substitutions to a recipe's ingredient list.
 *
 * Pure, so the page, the shopping list and the tests all see the same result.
 * The output is an ordinary recipe with its ingredients rewritten, which means
 * scaling, unit conversion and the shopping list need no special handling for
 * swapped lines — they are just lines.
 */

/** An ingredient line as displayed once swaps are applied. */
export interface ListedIngredient extends Ingredient {
  /** What this line stands in for, when it came from a swap. */
  swappedFrom?: string;
  /** Kept on the displayed list, struck through, rather than silently vanishing. */
  leftOut?: boolean;
}

export interface ListedGroup {
  title: string;
  items: ListedIngredient[];
}

export interface SwapResult {
  /** For display: swapped lines marked, left-out lines kept and flagged. */
  groups: ListedGroup[];
  /** For the shopping list: the same recipe with left-out lines removed. */
  recipe: Recipe;
}

export function applySwaps(recipe: Recipe, active: readonly number[]): SwapResult {
  const byId = new Map(
    recipe.ingredientGroups.flatMap((group) => group.items).map((item) => [item.id, item]),
  );

  /** Which swap claims each ingredient, and whether it is the line the swap takes over. */
  const claims = new Map<string, { swap: Substitution; anchor: boolean }>();
  for (const index of active) {
    const swap = recipe.substitutions[index];
    if (!swap) continue;
    swap.replaces.forEach((id, position) => {
      if (claims.has(id)) {
        throw new Error(`${recipe.slug}: ingredient ${id} is replaced by two swaps at once`);
      }
      claims.set(id, { swap, anchor: position === 0 });
    });
  }

  const groups: ListedGroup[] = recipe.ingredientGroups.map((group) => ({
    title: group.title,
    items: group.items.flatMap((item): ListedIngredient[] => {
      const claim = claims.get(item.id);
      if (!claim) return [item];

      const { swap, anchor } = claim;
      if (swap.use.length === 0) return [{ ...item, leftOut: true }];
      // A swap replacing several lines puts its substitutes where the first
      // one was, so the list keeps its order.
      if (!anchor) return [];

      const replaced = swap.replaces
        .map((id) => byId.get(id)?.name)
        .filter((name): name is string => Boolean(name))
        .join(" and ");

      return swap.use.map((use, k) => {
        const inherit = use.qty === undefined;
        return {
          id: `${item.id}~${k}`,
          name: use.name,
          qty: inherit ? item.qty : (use.qty ?? null),
          unit: inherit ? item.unit : (use.unit ?? item.unit),
          aisle: use.aisle ?? item.aisle,
          // The original note describes the original ingredient — "soaked
          // overnight" means nothing on a tin — so it is never carried over.
          note: use.note,
          optional: item.optional,
          swappedFrom: replaced,
        };
      });
    }),
  }));

  const forList: Recipe = {
    ...recipe,
    ingredientGroups: groups.map((group) => ({
      title: group.title,
      items: group.items.filter((item) => !item.leftOut),
    })),
  };

  return { groups, recipe: forList };
}
