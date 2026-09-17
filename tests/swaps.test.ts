import { describe, expect, it } from "vitest";
import { recipes, recipeBySlug } from "@/data/recipes";
import { applySwaps } from "@/lib/swaps";
import type { Recipe } from "@/lib/types";

const get = (slug: string): Recipe => {
  const recipe = recipeBySlug.get(slug);
  if (!recipe) throw new Error(`no recipe ${slug}`);
  return recipe;
};

const swapIndex = (recipe: Recipe, from: string) => {
  const index = recipe.substitutions.findIndex((swap) => swap.from === from);
  if (index < 0) throw new Error(`${recipe.slug} has no swap from ${from}`);
  return index;
};

const lines = (recipe: Recipe) => recipe.ingredientGroups.flatMap((group) => group.items);

/*
 * The swap data is hand-written, and a mistake in it is silent: a swap that
 * points at the wrong ingredient id still renders, it just replaces the wrong
 * line. These checks run over every substitution in the catalogue.
 */
describe("swap data", () => {
  const all = recipes.flatMap((recipe) =>
    recipe.substitutions.map((swap) => ({ recipe, swap })),
  );

  it("covers every substitution", () => {
    expect(all.length).toBe(78);
  });

  it("only replaces ingredients the recipe actually has", () => {
    const broken = all.flatMap(({ recipe, swap }) => {
      const ids = new Set(lines(recipe).map((item) => item.id));
      return swap.replaces.filter((id) => !ids.has(id)).map((id) => `${recipe.slug}: ${id}`);
    });
    expect(broken).toEqual([]);
  });

  it("never has two swaps competing for the same line", () => {
    const clashes = recipes.flatMap((recipe) => {
      const seen = new Map<string, string>();
      return recipe.substitutions.flatMap((swap) =>
        swap.replaces.flatMap((id) => {
          const first = seen.get(id);
          seen.set(id, swap.from);
          return first ? [`${recipe.slug}: ${id} (${first} / ${swap.from})`] : [];
        }),
      );
    });
    expect(clashes).toEqual([]);
  });

  it("gives an amount and a unit together, or neither", () => {
    const half = all.flatMap(({ recipe, swap }) =>
      swap.use
        .filter((use) => (use.qty === undefined) !== (use.unit === undefined))
        .map((use) => `${recipe.slug}: ${use.name}`),
    );
    expect(half).toEqual([]);
  });

  it("states amounts outright when one swap replaces several lines", () => {
    // There is no single amount to inherit from kiwifruit *and* passionfruit.
    const ambiguous = all.flatMap(({ recipe, swap }) =>
      swap.replaces.length > 1
        ? swap.use.filter((use) => use.qty === undefined).map((use) => `${recipe.slug}: ${use.name}`)
        : [],
    );
    expect(ambiguous).toEqual([]);
  });
});

describe("applySwaps", () => {
  it("changes nothing when no swap is active", () => {
    const recipe = get("jollof-rice");
    const { groups, recipe: forList } = applySwaps(recipe, []);
    expect(groups).toEqual(recipe.ingredientGroups);
    expect(forList.ingredientGroups).toEqual(recipe.ingredientGroups);
  });

  it("uses the amount the swap states, in place of the original line", () => {
    const recipe = get("jollof-rice");
    const before = lines(recipe).map((item) => item.id);
    const { groups } = applySwaps(recipe, [swapIndex(recipe, "Ground crayfish")]);
    const after = groups.flatMap((group) => group.items);

    const position = before.indexOf("jr-13");
    expect(after[position]).toMatchObject({
      name: "Smoked paprika",
      qty: 1,
      unit: "tsp",
      aisle: "Spices",
      swappedFrom: "Ground crayfish",
    });
    expect(after.some((item) => item.id === "jr-13")).toBe(false);
  });

  it("keeps the original amount when the swap does not state one", () => {
    const recipe = get("jollof-rice");
    const stock = lines(recipe).find((item) => item.id === "jr-12")!;
    const { recipe: forList } = applySwaps(recipe, [swapIndex(recipe, "Chicken stock")]);
    const swapped = lines(forList).find((item) => item.name === "Vegetable stock");
    expect(swapped).toMatchObject({ qty: stock.qty, unit: stock.unit, aisle: stock.aisle });
  });

  it("replaces only the line a swap names, not everything that shares a word", () => {
    // Regression guard for the reason the data carries ids: in fesenjan,
    // "Chicken" matched by name also catches the chicken stock.
    const recipe = get("khoresh-fesenjan");
    const { recipe: forList } = applySwaps(recipe, [swapIndex(recipe, "Chicken")]);
    const names = lines(forList).map((item) => item.name);
    expect(names).toContain("Duck legs");
    expect(names).toContain("Chicken stock");
    expect(names).not.toContain("Chicken thighs");
  });

  it("lets one swap replace several lines", () => {
    const recipe = get("pavlova");
    const { recipe: forList } = applySwaps(recipe, [
      swapIndex(recipe, "Kiwifruit and passionfruit"),
    ]);
    const names = lines(forList).map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining(["Raspberries", "Blackberries"]));
    expect(names).not.toContain("Kiwifruit");
    expect(names).not.toContain("Passionfruit");
    expect(lines(forList)).toHaveLength(lines(recipe).length);
  });

  it("shows a left-out ingredient struck through, and keeps it off the list", () => {
    const recipe = get("shakshuka");
    const { groups, recipe: forList } = applySwaps(recipe, [swapIndex(recipe, "Feta")]);
    const shown = groups.flatMap((group) => group.items).find((item) => item.id === "sk-12");
    expect(shown?.leftOut).toBe(true);
    expect(lines(forList).some((item) => item.id === "sk-12")).toBe(false);
  });

  it("applies several swaps at once", () => {
    const recipe = get("jerk-chicken");
    const active = recipe.substitutions.map((_, index) => index);
    const names = lines(applySwaps(recipe, active).recipe).map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining(["Habanero chillies", "Oak wood chips", "Tamari"]));
  });

  it("leaves the recipe it was given untouched", () => {
    const recipe = get("pavlova");
    const snapshot = JSON.stringify(recipe);
    applySwaps(recipe, recipe.substitutions.map((_, index) => index));
    expect(JSON.stringify(recipe)).toBe(snapshot);
  });

  it("applies every swap in the catalogue without error", () => {
    for (const recipe of recipes) {
      const active = recipe.substitutions.map((_, index) => index);
      expect(() => applySwaps(recipe, active)).not.toThrow();
    }
  });
});
