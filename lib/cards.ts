import type { Diet, ImageCredit, Recipe } from "./types";
import { countryBySlug } from "@/data/countries";
import { cuisineBySlug } from "@/data/cuisines";

/**
 * Exactly what a recipe card needs to render, and nothing else.
 *
 * Recipe objects carry ingredients, steps, tips and cultural notes — several
 * kilobytes each. The discovery grid is interactive, so its data crosses to
 * the browser; sending the full objects would ship the entire cookbook to
 * render a list of titles. Country and cuisine names are resolved here too,
 * so the card never has to reach into the data layer.
 */
export interface RecipeCardData {
  slug: string;
  name: string;
  localName?: string;
  description: string;
  image: ImageCredit;
  imageAlt: string;
  countryName: string;
  iso2: string;
  cuisineName: string;
  city: string;
  lat: number;
  lon: number;
  minutes: number;
  difficulty: string;
  rating: number;
  reviewCount: number;
  diets: Diet[];
  trending: boolean;
}

export function toCardData(recipe: Recipe): RecipeCardData {
  const country = countryBySlug.get(recipe.countrySlug);
  const cuisine = cuisineBySlug.get(recipe.cuisineSlug);

  return {
    slug: recipe.slug,
    name: recipe.name,
    localName: recipe.localName,
    description: recipe.description,
    image: recipe.image,
    imageAlt: recipe.imageAlt,
    countryName: country?.name ?? recipe.countrySlug,
    iso2: country?.iso2 ?? "un",
    cuisineName: cuisine?.name ?? recipe.cuisineSlug,
    city: recipe.origin.city,
    lat: recipe.origin.lat,
    lon: recipe.origin.lon,
    minutes: recipe.prepMinutes + recipe.cookMinutes,
    difficulty: recipe.difficulty,
    rating: recipe.rating,
    reviewCount: recipe.reviewCount,
    diets: recipe.diets,
    trending: Boolean(recipe.trending),
  };
}

export function toCardList(recipes: Recipe[]): RecipeCardData[] {
  return recipes.map(toCardData);
}
