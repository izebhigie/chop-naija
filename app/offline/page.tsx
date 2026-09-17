import type { Metadata } from "next";
import { recipes } from "@/data/recipes";
import { countryBySlug } from "@/data/countries";
import { SavedRecipes } from "@/components/offline/SavedRecipes";

export const metadata: Metadata = {
  title: "Saved for offline",
  description: "The recipes you have opened on this device, ready to cook from without a connection.",
  // A per-device page: to a crawler it is always empty.
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  const catalogue = recipes
    .map((recipe) => ({
      slug: recipe.slug,
      name: recipe.name,
      country: countryBySlug.get(recipe.countrySlug)?.name ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="u-shell py-14">
      <div className="max-w-2xl">
        <p className="u-data text-forest">Saved on this device</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">Cooking without a connection</h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          Every recipe you open is kept on this device, so it still loads when the kitchen wifi
          drops — photos, servings, swaps, cooking mode and timers included.
        </p>
      </div>

      <SavedRecipes catalogue={catalogue} />
    </div>
  );
}
