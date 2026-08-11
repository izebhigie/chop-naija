import { NextResponse } from "next/server";
import { recipeBySlug } from "@/data/recipes";

/**
 * Returns full recipes for the given slugs.
 *
 * The meal planner only needs complete ingredient lists at the moment somebody
 * asks it to build a shopping list, so it fetches them then rather than
 * shipping every recipe's ingredients to the browser up front.
 */
export async function GET(request: Request) {
  const slugs = (new URL(request.url).searchParams.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 40);

  const found = slugs
    .map((slug) => recipeBySlug.get(slug))
    .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe));

  if (slugs.length && found.length === 0) {
    return NextResponse.json({ error: "No recipes matched those slugs" }, { status: 404 });
  }

  return NextResponse.json({ recipes: found });
}
