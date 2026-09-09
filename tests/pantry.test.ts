import { describe, expect, it } from "vitest";
import { PANTRY, pantryById } from "@/data/pantry";
import { coverageFor, isAssumed, itemsFor, rankByPantry, missingNames } from "@/lib/pantry";
import { recipes, recipeBySlug } from "@/data/recipes";

/**
 * The pantry vocabulary is substring matching, which is the only thing that
 * makes "rice" cover seven kinds of rice — and also what makes it cover flat
 * rice noodles if nobody is watching. Each case below is a wrong answer this
 * gave at some point, kept so it cannot come back.
 */

const covers = (item: string, ingredient: string) => itemsFor(ingredient).includes(item);

describe("the vocabulary does not over-match", () => {
  it("knows rice from things with rice in the name", () => {
    expect(covers("rice", "Long-grain parboiled rice")).toBe(true);
    expect(covers("rice", "Flat rice noodles")).toBe(false);
    expect(covers("rice", "Rice vinegar")).toBe(false);
    expect(covers("noodles", "Flat rice noodles")).toBe(true);
  });

  it("knows butter from butter beans", () => {
    expect(covers("butter", "Butter")).toBe(true);
    expect(covers("butter", "Butter beans")).toBe(false);
    expect(covers("beans", "Butter beans")).toBe(true);
  });

  it("knows olives from olive oil", () => {
    expect(covers("olives", "Green olives")).toBe(true);
    expect(covers("olives", "Extra virgin olive oil")).toBe(false);
    expect(covers("olive-oil", "Extra virgin olive oil")).toBe(true);
  });

  it("knows a lemon from lemongrass", () => {
    expect(covers("lemon", "Lemon juice")).toBe(true);
    expect(covers("lemon", "Lemongrass")).toBe(false);
    expect(covers("lemon", "Preserved lemon")).toBe(false);
    expect(covers("lime", "Kaffir lime leaves")).toBe(false);
  });

  it("knows meat from the stock made of it", () => {
    expect(covers("chicken", "Chicken thighs")).toBe(true);
    expect(covers("chicken", "Chicken stock")).toBe(false);
    expect(covers("beef", "Beef stock")).toBe(false);
    expect(covers("stock", "Chicken stock")).toBe(true);
  });

  it("does not find an egg in Parmigiano Reggiano", () => {
    // R-egg-iano. Found by reading what the vocabulary actually matched.
    expect(covers("egg", "Parmigiano Reggiano")).toBe(false);
    expect(covers("cheese", "Parmigiano Reggiano")).toBe(true);
    expect(covers("egg", "Egg yolks")).toBe(true);
  });

  it("does not find flour in floury potatoes, or fish in ground crayfish", () => {
    expect(covers("flour", "Floury potatoes")).toBe(false);
    expect(covers("potato", "Floury potatoes")).toBe(true);
    expect(covers("fish", "Ground crayfish")).toBe(false);
    expect(covers("fish", "Salt cod")).toBe(true);
  });

  it("does not treat salt cod as salt", () => {
    expect(isAssumed("Sea salt")).toBe(true);
    expect(isAssumed("Salt cod")).toBe(false);
    expect(isAssumed("Salted pork belly")).toBe(false);
  });
});

describe("the vocabulary is well formed", () => {
  it("has unique ids", () => {
    expect(new Set(PANTRY.map((i) => i.id)).size).toBe(PANTRY.length);
  });

  it("has no entry that matches nothing in the catalogue", () => {
    const names = new Set<string>();
    for (const recipe of recipes) {
      for (const group of recipe.ingredientGroups) {
        for (const item of group.items) names.add(item.name);
      }
    }
    const dead = PANTRY.filter(
      (item) => ![...names].some((name) => itemsFor(name).includes(item.id)),
    );
    expect(dead.map((i) => i.id)).toEqual([]);
  });

  it("never lets two aisles claim the same ingredient", () => {
    const names = new Set<string>();
    for (const recipe of recipes) {
      for (const group of recipe.ingredientGroups) {
        for (const item of group.items) names.add(item.name);
      }
    }
    const clashes: string[] = [];
    for (const name of names) {
      const aisles = new Set(itemsFor(name).map((id) => pantryById.get(id)!.aisle));
      if (aisles.size > 1) clashes.push(name);
    }
    expect(clashes).toEqual([]);
  });
});

describe("coverageFor", () => {
  const jollof = recipeBySlug.get("jollof-rice")!;

  it("does not count staples against you", () => {
    const coverage = coverageFor(jollof, []);
    expect(coverage.assumed).toBeGreaterThan(0);
    const names = coverage.missing.map((i) => i.name);
    expect(names.some((n) => /^salt$/i.test(n))).toBe(false);
    expect(names.some((n) => /water/i.test(n))).toBe(false);
  });

  it("does not count optional ingredients as missing", () => {
    const withOptional = recipes.find((r) =>
      r.ingredientGroups.some((g) => g.items.some((i) => i.optional)),
    )!;
    const coverage = coverageFor(withOptional, []);
    expect(coverage.optional.length).toBeGreaterThan(0);
    expect(coverage.missing.some((i) => i.optional)).toBe(false);
  });

  it("moves an ingredient from missing to have when you select it", () => {
    const without = coverageFor(jollof, []);
    const withRice = coverageFor(jollof, ["rice"]);
    expect(withRice.have.length).toBe(without.have.length + 1);
    expect(withRice.missing.length).toBe(without.missing.length - 1);
    expect(withRice.have[0].name).toMatch(/rice/i);
  });

  it("reports a ratio of 1 only when nothing is left to buy", () => {
    expect(coverageFor(jollof, []).ratio).toBeLessThan(1);
    const everything = PANTRY.map((i) => i.id);
    const all = coverageFor(jollof, everything);
    expect(all.ratio).toBe(all.missing.length === 0 ? 1 : all.ratio);
  });
});

describe("rankByPantry", () => {
  it("returns nothing until you have said what you have", () => {
    expect(rankByPantry(recipes, [])).toEqual([]);
  });

  it("leaves out recipes with nothing in common", () => {
    const ranked = rankByPantry(recipes, ["rice"]);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((c) => c.have.length > 0)).toBe(true);
    expect(ranked.length).toBeLessThan(recipes.length);
  });

  it("puts the fewest trips to the shop first", () => {
    const ranked = rankByPantry(recipes, ["rice", "chicken", "onion", "tomato"]);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].missing.length).toBeLessThanOrEqual(ranked[i].missing.length);
    }
  });

  it("gets closer as you add more to the kitchen", () => {
    const few = rankByPantry(recipes, ["rice"]);
    const many = rankByPantry(recipes, ["rice", "chicken", "onion", "tomato", "chilli"]);
    const best = (list: typeof few) => Math.min(...list.map((c) => c.missing.length));
    expect(best(many)).toBeLessThanOrEqual(best(few));
  });

  it("collects what is still needed, without repeats", () => {
    const ranked = rankByPantry(recipes, ["rice", "chicken"]).slice(0, 5);
    const names = missingNames(ranked);
    expect(names.length).toBe(new Set(names).size);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
