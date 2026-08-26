import { describe, expect, it } from "vitest";
import {
  parseQuery,
  serializeQuery,
  isEmptyQuery,
  countActiveFilters,
  applyQuery,
  sortRecipes,
  facetCounts,
  totalMinutes,
} from "@/lib/filters";
import { recipes } from "@/data/recipes";

/**
 * The URL is the single source of truth for the discovery page, so these run
 * against the real catalogue rather than fixtures: a filter that quietly
 * returns everything, or nothing, is the failure worth catching.
 */

describe("parseQuery", () => {
  it("reads comma-separated lists", () => {
    const query = parseQuery({ region: "asia,europe", diet: "Vegetarian" });
    expect(query.regions).toEqual(["asia", "europe"]);
    expect(query.diets).toEqual(["Vegetarian"]);
  });

  it("ignores a sort key it does not recognise", () => {
    // Straight from the address bar, so it cannot be trusted.
    expect(parseQuery({ sort: "cheapest" }).sort).toBe("relevance");
    expect(parseQuery({ sort: "newest" }).sort).toBe("newest");
  });

  it("drops numbers that mean no filter at all", () => {
    expect(parseQuery({ time: "0" }).maxMinutes).toBeUndefined();
    expect(parseQuery({ time: "banana" }).maxMinutes).toBeUndefined();
    expect(parseQuery({ rating: "-3" }).minRating).toBeUndefined();
    expect(parseQuery({ time: "45" }).maxMinutes).toBe(45);
  });

  it("treats whitespace as absence", () => {
    expect(parseQuery({ q: "   " }).q).toBeUndefined();
  });
});

describe("serializeQuery", () => {
  it("round-trips a filter set through the URL", () => {
    const original = "region=asia%2Ceurope&diet=Vegetarian&time=45&sort=newest";
    const round = serializeQuery(parseQuery(Object.fromEntries(new URLSearchParams(original))));
    expect(round.toString()).toBe(original);
  });

  it("leaves the default sort out of the URL", () => {
    expect(serializeQuery({ sort: "relevance" }).toString()).toBe("");
  });

  it("agrees with isEmptyQuery and countActiveFilters", () => {
    const empty = parseQuery({});
    expect(isEmptyQuery(empty)).toBe(true);
    expect(countActiveFilters(empty)).toBe(0);

    const busy = parseQuery({ region: "asia,europe", diet: "Vegetarian", time: "45" });
    expect(isEmptyQuery(busy)).toBe(false);
    expect(countActiveFilters(busy)).toBe(4);
  });
});

describe("applyQuery", () => {
  it("narrows to the region asked for", () => {
    const found = applyQuery(recipes, { regions: ["asia"] });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((r) => r.region === "asia")).toBe(true);
  });

  it("treats diets as requirements — every one must be satisfied", () => {
    const found = applyQuery(recipes, { diets: ["Vegetarian"] });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((r) => r.diets.includes("Vegetarian"))).toBe(true);
  });

  it("treats allergens as exclusions, which is the opposite", () => {
    // Selecting "Dairy" means "I cannot eat dairy", not "show me dairy".
    const withDairy = recipes.filter((r) => r.allergens.includes("Dairy"));
    expect(withDairy.length).toBeGreaterThan(0);

    const found = applyQuery(recipes, { allergens: ["Dairy"] });
    expect(found.every((r) => !r.allergens.includes("Dairy"))).toBe(true);
    expect(found.length).toBe(recipes.length - withDairy.length);
  });

  it("bounds total time, not just cook time", () => {
    const found = applyQuery(recipes, { maxMinutes: 45 });
    expect(found.every((r) => totalMinutes(r) <= 45)).toBe(true);
    expect(found.length).toBeLessThan(recipes.length);
  });

  it("requires every search word to match", () => {
    const found = applyQuery(recipes, { q: "jollof" });
    expect(found.map((r) => r.slug)).toContain("jollof-rice");
    expect(applyQuery(recipes, { q: "jollof pavlova" })).toHaveLength(0);
  });

  it("combines filters rather than widening them", () => {
    const asia = applyQuery(recipes, { regions: ["asia"] });
    const both = applyQuery(recipes, { regions: ["asia"], maxMinutes: 45 });
    expect(both.length).toBeLessThanOrEqual(asia.length);
    expect(both.every((r) => r.region === "asia" && totalMinutes(r) <= 45)).toBe(true);
  });

  it("returns nothing rather than everything when nothing matches", () => {
    expect(applyQuery(recipes, { q: "zzzznotadish" })).toHaveLength(0);
  });
});

describe("sortRecipes", () => {
  it("orders newest by date, not by insertion", () => {
    const sorted = sortRecipes(recipes, "newest");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].addedAt >= sorted[i].addedAt).toBe(true);
    }
  });

  it("orders by rating, then by how many people rated it", () => {
    const sorted = sortRecipes(recipes, "rating");
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1];
      const b = sorted[i];
      expect(a.rating > b.rating || (a.rating === b.rating && a.reviewCount >= b.reviewCount)).toBe(true);
    }
  });

  it("orders by total time", () => {
    const sorted = sortRecipes(recipes, "time");
    for (let i = 1; i < sorted.length; i++) {
      expect(totalMinutes(sorted[i - 1])).toBeLessThanOrEqual(totalMinutes(sorted[i]));
    }
  });

  it("does not mutate the array it is given", () => {
    const before = recipes.map((r) => r.slug);
    sortRecipes(recipes, "rating");
    expect(recipes.map((r) => r.slug)).toEqual(before);
  });
});

describe("facetCounts", () => {
  it("counts single-valued fields", () => {
    const counts = facetCounts(recipes, (r) => r.region);
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    expect(total).toBe(recipes.length);
  });

  it("counts each value of a multi-valued field once per recipe", () => {
    const counts = facetCounts(recipes, (r) => r.mealTypes);
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    const expected = recipes.reduce((sum, r) => sum + r.mealTypes.length, 0);
    expect(total).toBe(expected);
  });
});
