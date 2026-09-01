import { describe, expect, it } from "vitest";
import {
  scaleQuantity,
  convert,
  formatQuantity,
  formatDuration,
  formatDurationShort,
  toIsoDuration,
  formatClock,
} from "@/lib/units";

/**
 * Quantities are the part of a recipe app that has to be right. A wrong
 * ingredient amount ruins the dish silently, and the failure only shows up in
 * a pan an hour later.
 */

describe("scaleQuantity", () => {
  it("scales in proportion to servings", () => {
    expect(scaleQuantity(500, 4, 8)).toBe(1000);
    expect(scaleQuantity(500, 4, 2)).toBe(250);
    expect(scaleQuantity(500, 4, 4)).toBe(500);
  });

  it("leaves 'to taste' amounts alone", () => {
    // null means unquantified — doubling it must not invent a number.
    expect(scaleQuantity(null, 4, 8)).toBeNull();
  });

  it("refuses to divide by a zero serving count", () => {
    expect(scaleQuantity(500, 0, 8)).toBe(500);
  });
});

describe("convert", () => {
  it("promotes large metric amounts rather than printing 1500g", () => {
    expect(convert(1500, "g", "metric")).toEqual({ qty: 1.5, unit: "kg" });
    expect(convert(1000, "ml", "metric")).toEqual({ qty: 1, unit: "l" });
    expect(convert(999, "g", "metric")).toEqual({ qty: 999, unit: "g" });
  });

  it("crosses from ounces to pounds at a pound", () => {
    expect(convert(453.592, "g", "imperial").unit).toBe("lb");
    expect(convert(400, "g", "imperial").unit).toBe("oz");
  });

  it("leaves units that read the same in both systems", () => {
    // A teaspoon is a teaspoon. Converting it would be noise.
    expect(convert(2, "tsp", "imperial")).toEqual({ qty: 2, unit: "tsp" });
    expect(convert(3, "clove", "imperial")).toEqual({ qty: 3, unit: "clove" });
  });
});

describe("formatQuantity", () => {
  it("writes metric weights plainly", () => {
    expect(formatQuantity(500, "g")).toBe("500g");
    expect(formatQuantity(1000, "g")).toBe("1kg");
  });

  it("writes spoons as fractions, never as decimals", () => {
    // "0.333 tsp" is unmeasurable; a measuring set has a third.
    expect(formatQuantity(0.5, "tsp")).toBe("½ tsp");
    expect(formatQuantity(1 / 3, "tsp")).toBe("⅓ tsp");
    expect(formatQuantity(0.25, "tsp")).toBe("¼ tsp");
  });

  it("pluralises on the amount, not on the fraction", () => {
    // Regression: fractions under one printed as "¾ cups" until the
    // comparison was fixed. Cups only ever arrive by converting stored
    // millilitres, so the test goes in the way the app does.
    expect(formatQuantity(189.3, "ml", "imperial")).toBe("¾ cup");
    expect(formatQuantity(236.588, "ml", "imperial")).toBe("1 cup");
    expect(formatQuantity(354.9, "ml", "imperial")).toBe("1½ cups");
    expect(formatQuantity(473.2, "ml", "imperial")).toBe("2 cups");
  });

  it("pluralises counted units too", () => {
    expect(formatQuantity(1, "clove")).toBe("1 clove");
    expect(formatQuantity(2, "clove")).toBe("2 cloves");
    expect(formatQuantity(1, "can")).toBe("1 can");
    expect(formatQuantity(2, "can")).toBe("2 cans");
  });

  it("drops to fluid ounces when a cup would be a fiddly fraction", () => {
    expect(formatQuantity(118.3, "ml", "imperial")).toBe("4 fl oz");
  });

  it("returns nothing for a 'to taste' amount", () => {
    expect(formatQuantity(null, "g")).toBe("");
  });

  it("converts to imperial on request", () => {
    expect(formatQuantity(1000, "g", "imperial")).toBe("2.2 lb");
  });

  it("survives a doubled recipe", () => {
    const doubled = scaleQuantity(500, 4, 8);
    expect(formatQuantity(doubled, "g")).toBe("1kg");
  });
});

describe("durations", () => {
  it("reads as hours once past sixty minutes", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(85)).toBe("1 hr 25 min");
  });

  it("has a compact form for cards", () => {
    expect(formatDurationShort(45)).toBe("45m");
    expect(formatDurationShort(60)).toBe("1h");
    expect(formatDurationShort(85)).toBe("1h 25m");
  });

  it("emits ISO 8601 for Schema.org", () => {
    // Search engines parse these; a malformed one drops the rich result.
    expect(toIsoDuration(45)).toBe("PT45M");
    expect(toIsoDuration(60)).toBe("PT1H");
    expect(toIsoDuration(85)).toBe("PT1H25M");
    expect(toIsoDuration(0)).toBe("PT0M");
  });
});

describe("formatClock", () => {
  it("keeps seconds two digits so the number does not jump", () => {
    expect(formatClock(900)).toBe("15:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(5)).toBe("0:05");
  });

  it("shows hours only when there are hours", () => {
    expect(formatClock(3660)).toBe("1:01:00");
    expect(formatClock(3599)).toBe("59:59");
  });

  it("never counts below zero", () => {
    // A late interval tick can arrive after the deadline has passed.
    expect(formatClock(-30)).toBe("0:00");
  });
});
