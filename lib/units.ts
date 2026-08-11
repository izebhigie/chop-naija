import type { Unit } from "./types";

/**
 * Quantity scaling and unit conversion.
 *
 * Quantities are stored metric. Everything a cook sees is derived from that,
 * because the two things that break recipe apps are scaling to a number nobody
 * can measure ("0.333 cups") and rounding so hard the recipe stops working.
 * Weights round to something a scale can read; spoons and cups round to
 * fractions a measuring set actually has.
 */

export type UnitSystem = "metric" | "imperial";

const G_PER_OZ = 28.3495;
const G_PER_LB = 453.592;
const ML_PER_FL_OZ = 29.5735;
const ML_PER_CUP = 236.588;

/** Units that read the same in both systems and are never converted. */
const NEUTRAL: Unit[] = ["tsp", "tbsp", "piece", "clove", "pinch", "bunch", "can", "sheet", "handful", ""];

const VULGAR: Record<string, string> = {
  "1/8": "⅛",
  "1/4": "¼",
  "1/3": "⅓",
  "3/8": "⅜",
  "1/2": "½",
  "5/8": "⅝",
  "2/3": "⅔",
  "3/4": "¾",
  "7/8": "⅞",
};

/** How a unit is written next to a number. */
const LABEL: Record<string, { one: string; many: string; space: boolean }> = {
  g: { one: "g", many: "g", space: false },
  kg: { one: "kg", many: "kg", space: false },
  ml: { one: "ml", many: "ml", space: false },
  l: { one: "l", many: "l", space: false },
  oz: { one: "oz", many: "oz", space: true },
  lb: { one: "lb", many: "lb", space: true },
  "fl oz": { one: "fl oz", many: "fl oz", space: true },
  cup: { one: "cup", many: "cups", space: true },
  tsp: { one: "tsp", many: "tsp", space: true },
  tbsp: { one: "tbsp", many: "tbsp", space: true },
  piece: { one: "", many: "", space: false },
  clove: { one: "clove", many: "cloves", space: true },
  pinch: { one: "pinch", many: "pinches", space: true },
  bunch: { one: "bunch", many: "bunches", space: true },
  can: { one: "can", many: "cans", space: true },
  sheet: { one: "sheet", many: "sheets", space: true },
  handful: { one: "handful", many: "handfuls", space: true },
  "": { one: "", many: "", space: false },
};

export function scaleQuantity(qty: number | null, baseServings: number, servings: number): number | null {
  if (qty === null || baseServings <= 0) return qty;
  return (qty * servings) / baseServings;
}

/** Convert a stored metric amount into the requested system. */
export function convert(qty: number, unit: Unit, system: UnitSystem): { qty: number; unit: string } {
  if (system === "metric" || NEUTRAL.includes(unit)) {
    // Promote large metric amounts so nobody reads "1500g".
    if (system === "metric" && unit === "g" && qty >= 1000) return { qty: qty / 1000, unit: "kg" };
    if (system === "metric" && unit === "ml" && qty >= 1000) return { qty: qty / 1000, unit: "l" };
    return { qty, unit };
  }

  switch (unit) {
    case "g": {
      if (qty >= G_PER_LB) return { qty: qty / G_PER_LB, unit: "lb" };
      return { qty: qty / G_PER_OZ, unit: "oz" };
    }
    case "kg":
      return { qty: (qty * 1000) / G_PER_LB, unit: "lb" };
    case "ml": {
      if (qty >= ML_PER_CUP * 0.75) return { qty: qty / ML_PER_CUP, unit: "cup" };
      return { qty: qty / ML_PER_FL_OZ, unit: "fl oz" };
    }
    case "l":
      return { qty: (qty * 1000) / ML_PER_CUP, unit: "cup" };
    default:
      return { qty, unit };
  }
}

/** Nearest fraction with a denominator a measuring set actually has. */
function toFraction(value: number): string {
  const whole = Math.floor(value);
  const remainder = value - whole;

  const options: Array<[number, string]> = [
    [0, ""],
    [1 / 8, "1/8"],
    [1 / 4, "1/4"],
    [1 / 3, "1/3"],
    [3 / 8, "3/8"],
    [1 / 2, "1/2"],
    [5 / 8, "5/8"],
    [2 / 3, "2/3"],
    [3 / 4, "3/4"],
    [7 / 8, "7/8"],
    [1, "+1"],
  ];

  let best = options[0];
  let bestGap = Math.abs(remainder);
  for (const option of options) {
    const gap = Math.abs(remainder - option[0]);
    if (gap < bestGap) {
      bestGap = gap;
      best = option;
    }
  }

  if (best[1] === "+1") return String(whole + 1);
  if (!best[1]) return whole === 0 ? "0" : String(whole);
  const glyph = VULGAR[best[1]] ?? best[1];
  return whole === 0 ? glyph : `${whole}${glyph}`;
}

/** Weights get sensible round numbers rather than false precision. */
function roundWeight(value: number): number {
  if (value >= 500) return Math.round(value / 25) * 25;
  if (value >= 100) return Math.round(value / 10) * 10;
  if (value >= 20) return Math.round(value / 5) * 5;
  if (value >= 10) return Math.round(value);
  return Math.round(value * 2) / 2;
}

function formatNumber(value: number, unit: string): string {
  // Spoons, cups and counts read best as fractions.
  if (["tsp", "tbsp", "cup", "piece", "clove", "sheet", "can", "bunch", "handful", ""].includes(unit)) {
    if (value < 0.05) return "0";
    return toFraction(value);
  }

  if (unit === "kg" || unit === "l" || unit === "lb") {
    const rounded = Math.round(value * 100) / 100;
    return String(Number(rounded.toFixed(2)));
  }

  if (unit === "oz" || unit === "fl oz") {
    return toFraction(Math.round(value * 4) / 4);
  }

  return String(roundWeight(value));
}

/**
 * The full display string for an ingredient amount, already scaled.
 * Returns an empty string for "to taste" amounts so the caller can omit it.
 */
export function formatQuantity(
  qty: number | null,
  unit: Unit,
  system: UnitSystem = "metric",
): string {
  if (qty === null) return "";

  const converted = convert(qty, unit, system);
  const value = formatNumber(converted.qty, converted.unit);
  const label = LABEL[converted.unit] ?? { one: converted.unit, many: converted.unit, space: true };

  if (!label.one) return value;

  // "½ cup" and "1 cup" are singular; "1½ cups" and "2 cups" are plural.
  const word = converted.qty > 1.0001 ? label.many : label.one;

  return label.space ? `${value} ${word}` : `${value}${word}`;
}

/** "1 hr 25 min" reads better than "85 min" once you pass an hour. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

/** Compact form for cards, where space is tight. */
export function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** ISO 8601 duration for Schema.org Recipe markup. */
export function toIsoDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `PT${hours ? `${hours}H` : ""}${rest ? `${rest}M` : hours ? "" : "0M"}`;
}
