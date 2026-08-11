import Link from "next/link";
import { recipes } from "@/data/recipes";
import { toCardList } from "@/lib/cards";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { ButtonLink } from "@/components/ui/primitives";
import { SearchBar } from "@/components/search/SearchBar";

export default function NotFound() {
  // A few genuinely good dishes rather than an apology and a dead end.
  const suggestions = toCardList(
    [...recipes].sort((a, b) => b.rating - a.rating).slice(0, 3),
  );

  return (
    <div className="u-shell py-16">
      <div className="max-w-2xl">
        <p className="u-data text-forest">404 / page not found</p>
        <h1 className="mt-4 text-[length:var(--text-display-lg)]">
          There is no dish at this address
        </h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          The link may be out of date, or the recipe may never have existed. Search for what you
          were after, or start from the collection.
        </p>

        <div className="mt-8">
          <SearchBar />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/recipes">Browse all recipes</ButtonLink>
          <ButtonLink href="/countries" variant="secondary">
            Browse by country
          </ButtonLink>
        </div>
      </div>

      <section aria-labelledby="popular-heading" className="mt-16">
        <h2 id="popular-heading" className="u-data text-forest">
          Highest rated right now
        </h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((card) => (
            <li key={card.slug}>
              <RecipeCard card={card} />
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-muted">
        Think this page should exist?{" "}
        <Link href="/" className="text-forest underline underline-offset-4">
          Let us know from the home page
        </Link>
        .
      </p>
    </div>
  );
}
