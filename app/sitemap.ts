import type { MetadataRoute } from "next";
import { recipes } from "@/data/recipes";
import { countries } from "@/data/countries";
import { cuisines } from "@/data/cuisines";
import { absoluteUrl } from "@/lib/site";

/**
 * Every page a crawler should know about.
 *
 * Favorites, the shopping list and the meal planner are deliberately absent:
 * they render from device-local storage, so to a crawler they are three
 * identical empty states. `/recipes` is listed once without its filter
 * params — the filtered views are the same 35 dishes in a different order and
 * indexing them would just compete with the dish pages themselves.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const catalogue = recipes.map((recipe) => ({
    url: absoluteUrl(`/recipes/${recipe.slug}`),
    lastModified: new Date(recipe.addedAt),
    changeFrequency: "yearly" as const,
    priority: 0.8,
  }));

  // The dish pages are what people search for, so the browse pages that lead
  // to them rank just under the catalogue rather than alongside it.
  const browse = [
    ...countries.map((country) => `/countries/${country.slug}`),
    ...cuisines.map((cuisine) => `/cuisines/${cuisine.slug}`),
  ].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/recipes"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/cook-with"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/countries"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/cuisines"), changeFrequency: "monthly", priority: 0.7 },
    ...catalogue,
    ...browse,
  ];
}
