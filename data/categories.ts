import type { Category } from "@/lib/types";

/**
 * Quick entry points into the catalogue. The `slug` is matched against
 * Recipe.categories, except for the diet-based ones which are resolved
 * against Recipe.diets by the service layer.
 */
export const categories: Category[] = [
  {
    slug: "quick-easy",
    name: "Quick & easy",
    description: "On the table in under 45 minutes",
    icon: "Timer",
  },
  {
    slug: "vegetarian",
    name: "Vegetarian",
    description: "No meat or fish, no compromise",
    icon: "Sprout",
  },
  {
    slug: "street-food",
    name: "Street food",
    description: "Cooked at stalls and eaten standing up",
    icon: "Store",
  },
  {
    slug: "comfort-food",
    name: "Comfort food",
    description: "Slow pots and full plates",
    icon: "Soup",
  },
  {
    slug: "healthy",
    name: "Healthy",
    description: "Light on fat, heavy on flavor",
    icon: "Leaf",
  },
  {
    slug: "desserts",
    name: "Desserts",
    description: "Custards, meringues and cakes",
    icon: "CakeSlice",
  },
  {
    slug: "seafood",
    name: "Seafood",
    description: "Cured, fried and simmered from the coast",
    icon: "Fish",
  },
  {
    slug: "baking",
    name: "Baking",
    description: "Doughs, breads and things that rise",
    icon: "CookingPot",
  },
];

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
