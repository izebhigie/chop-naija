import type { Metadata } from "next";
import { ShoppingListClient } from "./ShoppingListClient";

export const metadata: Metadata = {
  title: "Shopping list",
  description: "Ingredients from your saved recipes, grouped by aisle and added together.",
  robots: { index: false, follow: true },
};

export default function ShoppingListPage() {
  return (
    <div className="u-shell py-12">
      <header className="max-w-2xl">
        <p className="u-data text-forest print-hide">Your kitchen</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">Shopping list</h1>
        <p className="mt-4 text-[1.0625rem] text-muted print-hide">
          Grouped the way a shop is laid out. The same ingredient from two recipes becomes one line
          with the amounts added together.
        </p>
      </header>

      <ShoppingListClient />
    </div>
  );
}
