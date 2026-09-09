import type { Metadata } from "next";
import { Suspense } from "react";
import { recipes } from "@/data/recipes";
import { toPantryList } from "@/lib/pantry";
import { RecipeCardSkeleton } from "@/components/ui/primitives";
import { CookWithClient } from "@/components/pantry/CookWithClient";

export const metadata: Metadata = {
  title: "What can I cook?",
  description:
    "Say what is in your kitchen and see which of 35 recipes you are closest to cooking, with the missing ingredients named.",
  alternates: { canonical: "/cook-with" },
};

/**
 * The matching runs in the browser, so this page ships the catalogue once as a
 * compact index — each card plus the names of what it needs — rather than
 * re-rendering on the server every time a chip is tapped. Selecting six
 * ingredients should feel like six taps, not six navigations.
 */
export default function CookWithPage() {
  const items = toPantryList(recipes);

  return (
    <Suspense
      fallback={
        <div className="u-shell py-12">
          <div className="u-skeleton h-10 w-72 rounded-full" />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <RecipeCardSkeleton />
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <CookWithClient items={items} />
    </Suspense>
  );
}
