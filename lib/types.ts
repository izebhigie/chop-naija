/**
 * The shape of everything WorldPlates knows about food.
 *
 * These types describe the domain, not any particular data source. The service
 * layer in services/ returns exactly these, so swapping local data for a
 * recipe API later is a change of adapter, not a change of app.
 */

export type RegionSlug =
  | "africa"
  | "asia"
  | "europe"
  | "north-america"
  | "south-america"
  | "middle-east"
  | "caribbean"
  | "oceania";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type MealType =
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Snack"
  | "Dessert"
  | "Side";

export type Diet =
  | "Vegetarian"
  | "Vegan"
  | "Gluten-free"
  | "Dairy-free"
  | "Pescatarian"
  | "Low-carb";

export type Allergen =
  | "Gluten"
  | "Dairy"
  | "Eggs"
  | "Fish"
  | "Shellfish"
  | "Peanuts"
  | "Tree nuts"
  | "Soy"
  | "Sesame";

export type CookingMethod =
  | "Simmered"
  | "Grilled"
  | "Fried"
  | "Roasted"
  | "Baked"
  | "Steamed"
  | "Stir-fried"
  | "Braised"
  | "Raw"
  | "No-cook";

/** Where an ingredient lives in a supermarket, used to group the shopping list. */
export type Aisle =
  | "Produce"
  | "Meat & fish"
  | "Dairy & eggs"
  | "Pantry"
  | "Spices"
  | "Bakery"
  | "Frozen";

/**
 * Units are stored metric-first. `piece`, `clove`, `tsp`, `tbsp` and friends
 * read the same in both systems, so they pass through unconverted.
 */
export type Unit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "tsp"
  | "tbsp"
  | "piece"
  | "clove"
  | "pinch"
  | "bunch"
  | "can"
  | "sheet"
  | "handful"
  | "";

export interface Ingredient {
  id: string;
  name: string;
  /** null means "to taste" — the amount is not scalable. */
  qty: number | null;
  unit: Unit;
  aisle: Aisle;
  note?: string;
  optional?: boolean;
}

/** Recipes are grouped by component: "For the stew base", "To serve". */
export interface IngredientGroup {
  title: string;
  items: Ingredient[];
}

export interface Step {
  body: string;
  /** Shown beside the step as a chef's aside, when there is something worth knowing. */
  tip?: string;
  minutes?: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  sugar: number;
  sodium: number;
}

export interface Author {
  name: string;
  role: string;
  initials: string;
}

/** One ingredient that goes on the list when a swap is applied. */
export interface SwapItem {
  name: string;
  /** Leave amount and unit out to use the same amount as the ingredient it replaces. */
  qty?: number | null;
  unit?: Unit;
  aisle?: Aisle;
  note?: string;
}

export interface Substitution {
  /** How the swap is described to a reader. */
  from: string;
  to: string;
  why: string;
  /**
   * The ingredient ids this swap replaces. Explicit rather than matched by
   * name: "Chicken" in khoresh fesenjan names the thighs, but a name match
   * also catches the chicken stock.
   */
  replaces: string[];
  /** What goes on the list instead. Empty means the ingredient is left out. */
  use: SwapItem[];
}

/** Photograph credit. Every image in the app carries one. */
export interface ImageCredit {
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
  author: string;
  licence: string;
  source: string;
}

/**
 * Where a dish actually comes from — the city, not just the country.
 * Jollof rice belongs to Lagos in a way it does not belong to Abuja.
 * These coordinates are printed under every dish title across the app.
 */
export interface Origin {
  city: string;
  lat: number;
  lon: number;
}

export interface Recipe {
  id: string;
  slug: string;
  name: string;
  /** The dish's name in its own language, in its own script. */
  localName?: string;
  localLanguage?: string;
  description: string;
  origin: Origin;
  countrySlug: string;
  cuisineSlug: string;
  region: RegionSlug;
  mealTypes: MealType[];
  categories: string[];
  image: ImageCredit;
  imageAlt: string;
  ingredientGroups: IngredientGroup[];
  steps: Step[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: Difficulty;
  diets: Diet[];
  allergens: Allergen[];
  methods: CookingMethod[];
  mainIngredient: string;
  nutrition: Nutrition;
  rating: number;
  reviewCount: number;
  author: Author;
  /** Where the dish comes from and what it means. */
  story: string;
  tips: string[];
  substitutions: Substitution[];
  relatedSlugs: string[];
  video?: { title: string; duration: string };
  /** ISO date, drives the "newest" sort. */
  addedAt: string;
  /** Cooks this month, drives the "most cooked" sort. */
  cooksThisMonth: number;
  trending?: boolean;
}

export interface Country {
  slug: string;
  name: string;
  /** ISO 3166-1 alpha-2, used to derive the flag. */
  iso2: string;
  region: RegionSlug;
  capital: string;
  /** Decimal degrees for the capital — the origin line depends on these being real. */
  lat: number;
  lon: number;
  cuisineSlugs: string[];
  blurb: string;
  staples: string[];
  methods: string[];
}

export interface Cuisine {
  slug: string;
  name: string;
  region: RegionSlug;
  countrySlugs: string[];
  blurb: string;
  staples: string[];
  methods: string[];
  relatedSlugs: string[];
}

export interface Region {
  slug: RegionSlug;
  name: string;
  blurb: string;
  /** Slug of the recipe whose photograph represents the region. */
  imageRecipeSlug: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  /** Matched against Recipe.categories. */
  icon: string;
}

export interface Review {
  id: string;
  recipeSlug: string;
  author: string;
  initials: string;
  rating: number;
  date: string;
  body: string;
  cookedFor?: string;
}

/* ---------------------------------------------------------------------- */
/* Query + result shapes used by the service layer                         */
/* ---------------------------------------------------------------------- */

export type SortKey =
  | "relevance"
  | "rating"
  | "newest"
  | "time"
  | "popularity";

export interface RecipeQuery {
  q?: string;
  regions?: RegionSlug[];
  countries?: string[];
  cuisines?: string[];
  mealTypes?: MealType[];
  ingredients?: string[];
  diets?: Diet[];
  /** Allergens to *exclude*. */
  allergens?: Allergen[];
  methods?: CookingMethod[];
  maxMinutes?: number;
  difficulty?: Difficulty[];
  minRating?: number;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

export interface RecipeResult {
  recipes: Recipe[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

/* ---------------------------------------------------------------------- */
/* Saved state                                                             */
/* ---------------------------------------------------------------------- */

export interface ShoppingItem {
  id: string;
  name: string;
  qty: number | null;
  unit: Unit;
  aisle: Aisle;
  checked: boolean;
  /** Recipe names this quantity came from, so a cook can trace it back. */
  sources: string[];
  custom?: boolean;
}

export type MealSlot = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface PlannedMeal {
  id: string;
  /** 0 = Monday. */
  day: number;
  slot: MealSlot;
  recipeSlug: string;
  servings: number;
}

export interface Collection {
  id: string;
  name: string;
  recipeSlugs: string[];
}
