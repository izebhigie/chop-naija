import type { Metadata } from "next";
import { recipes } from "@/data/recipes";
import { countryBySlug } from "@/data/countries";
import { MealPlannerClient, type PlannerRecipe } from "./MealPlannerClient";

export const metadata: Metadata = {
  title: "Meal planner",
  description: "Plan a week of meals and turn it into one shopping list.",
  robots: { index: false, follow: true },
};

export default function MealPlannerPage() {
  const options: PlannerRecipe[] = recipes
    .map((recipe) => {
      const country = countryBySlug.get(recipe.countrySlug);
      return {
        slug: recipe.slug,
        name: recipe.name,
        minutes: recipe.prepMinutes + recipe.cookMinutes,
        servings: recipe.servings,
        iso2: country?.iso2 ?? "un",
        country: country?.name ?? recipe.countrySlug,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="u-shell py-12">
      <header className="max-w-2xl">
        <p className="u-data text-forest">Your kitchen</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">This week&rsquo;s meals</h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          Put dishes in the days you will cook them, set how many you are feeding, then turn the
          whole week into a single shopping list.
        </p>
      </header>

      <MealPlannerClient options={options} />
    </div>
  );
}
