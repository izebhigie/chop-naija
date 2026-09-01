"use client";

import { useMemo, useState } from "react";
import { Heart, FolderPlus, Trash2, X } from "lucide-react";
import type { RecipeCardData } from "@/lib/cards";
import { useAppStore } from "@/hooks/useAppStore";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { Button, ButtonLink, EmptyState, RecipeCardSkeleton } from "@/components/ui/primitives";
import { cx } from "@/lib/format";

type SortKey = "recent" | "name" | "time" | "rating";

const SORTS: Array<[SortKey, string]> = [
  ["recent", "Recently saved"],
  ["name", "A to Z"],
  ["time", "Quickest first"],
  ["rating", "Highest rated"],
];

export function FavoritesClient({ all }: { all: RecipeCardData[] }) {
  const {
    favorites,
    collections,
    hydrated,
    removeFavorite,
    createCollection,
    deleteCollection,
    toggleInCollection,
  } = useAppStore();

  const [sort, setSort] = useState<SortKey>("recent");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const bySlug = useMemo(() => new Map(all.map((card) => [card.slug, card])), [all]);

  const saved = useMemo(() => {
    const slugs =
      activeCollection === null
        ? favorites
        : (collections.find((c) => c.id === activeCollection)?.recipeSlugs ?? []);

    const cards = slugs
      .map((slug) => bySlug.get(slug))
      .filter((card): card is RecipeCardData => Boolean(card));

    const sorted = [...cards];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "time") sorted.sort((a, b) => a.minutes - b.minutes);
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [favorites, collections, activeCollection, bySlug, sort]);

  if (!hydrated) {
    return (
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index}>
            <RecipeCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState
          icon={<Heart className="size-8" strokeWidth={1.5} />}
          title="Nothing saved yet"
          body="Tap the heart on any recipe and it will wait for you here — on this device, no account needed."
          action={<ButtonLink href="/recipes">Find something to cook</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveCollection(null)}
          aria-pressed={activeCollection === null}
          className={cx(
            "u-data rounded-full px-4 py-2.5 ring-1 transition-colors",
            activeCollection === null
              ? "bg-forest text-cream ring-forest"
              : "bg-paper text-muted ring-line hover:text-ink",
          )}
        >
          All saved ({favorites.length})
        </button>

        {collections.map((collection) => (
          <span key={collection.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => setActiveCollection(collection.id)}
              aria-pressed={activeCollection === collection.id}
              className={cx(
                "u-data rounded-l-full px-4 py-2.5 ring-1 transition-colors",
                activeCollection === collection.id
                  ? "bg-forest text-cream ring-forest"
                  : "bg-paper text-muted ring-line hover:text-ink",
              )}
            >
              {collection.name} ({collection.recipeSlugs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                deleteCollection(collection.id);
                if (activeCollection === collection.id) setActiveCollection(null);
              }}
              aria-label={`Delete the ${collection.name} collection`}
              className="grid h-[42px] w-9 place-items-center rounded-r-full bg-paper text-muted ring-1 ring-line transition-colors hover:text-tomato"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}

        {creating ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!newName.trim()) return;
              createCollection(newName.trim());
              setNewName("");
              setCreating(false);
            }}
            className="inline-flex items-center gap-2"
          >
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Weeknight dinners"
              aria-label="Collection name"
              className="h-[42px] rounded-full bg-paper px-4 text-sm text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-forest"
            />
            <Button size="sm" type="submit">
              Create
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="u-data inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2.5 text-muted ring-1 ring-line transition-colors hover:text-forest"
          >
            <FolderPlus aria-hidden="true" className="size-3.5" />
            New collection
          </button>
        )}

        <label className="ml-auto inline-flex items-center gap-2">
          <span className="u-data text-muted">Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-11 rounded-full bg-paper px-4 text-[0.9375rem] text-ink ring-1 ring-line"
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {saved.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="This collection is empty"
            body="Add saved recipes to it from the menu on any card below."
            action={
              <Button variant="secondary" onClick={() => setActiveCollection(null)}>
                Show all saved
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((card) => (
            <li key={card.slug} className="flex flex-col gap-2">
              <RecipeCard card={card} />

              <div className="flex flex-wrap items-center gap-2">
                {collections.map((collection) => {
                  const inside = collection.recipeSlugs.includes(card.slug);
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => toggleInCollection(collection.id, card.slug)}
                      aria-pressed={inside}
                      className={cx(
                        "u-data-sm rounded-full px-2.5 py-1.5 ring-1 transition-colors",
                        inside
                          ? "bg-forest-wash text-forest ring-forest/25"
                          : "bg-paper text-muted ring-line hover:text-ink",
                      )}
                    >
                      {inside ? "✓ " : "+ "}
                      {collection.name}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => removeFavorite(card.slug)}
                  className="u-data-sm ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-tomato-wash hover:text-tomato"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
