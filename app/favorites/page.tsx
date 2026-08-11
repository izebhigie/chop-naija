import type { Metadata } from "next";
import { recipes } from "@/data/recipes";
import { toCardList } from "@/lib/cards";
import { FavoritesClient } from "./FavoritesClient";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Recipes you have saved, organized into collections.",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <div className="u-shell py-12">
      <header className="max-w-2xl">
        <p className="u-data text-forest">Your kitchen</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">Saved recipes</h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          Saved on this device. Sign in later and they will come with you.
        </p>
      </header>

      <FavoritesClient all={toCardList(recipes)} />
    </div>
  );
}
