import { NextResponse } from "next/server";
import { recipeService } from "@/services/recipeService";
import { countryBySlug } from "@/data/countries";

/**
 * Autocomplete for the search field.
 *
 * This exists so the browser does not have to download the whole catalogue to
 * search it, and so the search box has a real network call to show loading and
 * error states for.
 */
export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) return NextResponse.json({ results: [] });

  const matches = await recipeService.suggest(term, 6);

  return NextResponse.json({
    results: matches.map((recipe) => ({
      slug: recipe.slug,
      name: recipe.name,
      localName: recipe.localName ?? null,
      country: countryBySlug.get(recipe.countrySlug)?.name ?? recipe.countrySlug,
      iso2: countryBySlug.get(recipe.countrySlug)?.iso2 ?? "un",
      city: recipe.origin.city,
    })),
  });
}
