import type { Aisle } from "./types";

/**
 * Supermarket order, roughly: fresh things first, cupboard things last.
 *
 * This is display order and can change freely. The order aisles travel in
 * inside a shared-list link is fixed separately in lib/share-list.ts.
 */
export const AISLE_ORDER: Aisle[] = [
  "Produce",
  "Meat & fish",
  "Dairy & eggs",
  "Bakery",
  "Frozen",
  "Pantry",
  "Spices",
];
