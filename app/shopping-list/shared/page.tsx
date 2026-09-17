import type { Metadata } from "next";
import { SharedListClient } from "@/components/shopping/SharedListClient";

export const metadata: Metadata = {
  title: "Shared shopping list",
  description: "A shopping list someone sent you from WorldPlates.",
  // The list lives in the link's fragment, so to a crawler this page is always empty.
  robots: { index: false, follow: false },
};

export default function SharedListPage() {
  return (
    <div className="u-shell py-12">
      <header className="max-w-2xl">
        <p className="u-data text-forest">Shared with you</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">A shopping list</h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          Sent from someone&rsquo;s WorldPlates list. It arrived inside the link itself, so nothing
          was uploaded to get it here.
        </p>
      </header>

      <SharedListClient />
    </div>
  );
}
