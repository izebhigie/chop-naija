"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, Search, Plus, ShoppingBasket } from "lucide-react";
import type { Aisle } from "@/lib/types";
import { PANTRY } from "@/data/pantry";
import { matchKitchen, type PantryRecipe } from "@/lib/pantry";
import { cx } from "@/lib/format";
import { useAppStore } from "@/hooks/useAppStore";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { Button, ButtonLink, EmptyState } from "@/components/ui/primitives";

const AISLE_ORDER: Aisle[] = [
  "Produce",
  "Meat & fish",
  "Dairy & eggs",
  "Pantry",
  "Spices",
  "Bakery",
];

/** A kitchen that gets you a long way, offered so the page is never a blank wall. */
const STARTER = ["onion", "garlic", "tomato", "rice", "chicken", "egg", "olive-oil"];

export function CookWithClient({ items }: { items: PantryRecipe[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const { addCustomItem } = useAppStore();

  /*
   * The kitchen lives in state and is mirrored out to the URL, not read back
   * from it on every click.
   *
   * Deriving it from searchParams looked tidier and was wrong: router updates
   * are asynchronous, so four chips tapped in quick succession each computed
   * their next value from the same stale URL and overwrote one another. Only
   * the last one survived. State updates synchronously, so taps accumulate.
   */
  const [selected, setSelected] = useState<string[]>(() => {
    const known = new Set(PANTRY.map((item) => item.id));
    return (searchParams.get("have") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => known.has(id));
  });

  /*
   * Written back with replace rather than push: you tap six things to describe
   * a kitchen, and with push the back button would walk you through all six
   * before leaving the page. That also means there is no history to come back
   * from, so the URL is only ever read at mount — a shared link arrives with
   * its ingredients, and after that state leads.
   */
  const lastWritten = useRef(selected.join(","));
  useEffect(() => {
    const key = selected.join(",");
    if (key === lastWritten.current) return;
    lastWritten.current = key;

    const params = new URLSearchParams(window.location.search);
    if (key) params.set("have", key);
    else params.delete("have");
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [selected, router, pathname]);

  const toggle = useCallback((id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }, []);

  const matches = useMemo(() => matchKitchen(items, selected), [items, selected]);
  const shown = readyOnly ? matches.filter((m) => m.missing.length === 0) : matches;
  const readyCount = matches.filter((m) => m.missing.length === 0).length;

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = term
      ? PANTRY.filter((item) => item.label.toLowerCase().includes(term))
      : PANTRY;
    return AISLE_ORDER.map((aisle) => ({
      aisle,
      entries: visible.filter((item) => item.aisle === aisle),
    })).filter((group) => group.entries.length > 0);
  }, [query]);

  function addMissing(names: string[], slug: string) {
    for (const name of names) addCustomItem(name);
    setAdded((current) => [...current, slug]);
  }

  return (
    <div className="u-shell py-12">
      <header className="max-w-2xl">
        <p className="u-data text-forest">Cook with what you have</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">What can I cook tonight?</h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          Tell the kitchen what is in it. Nothing is filtered out — recipes are ordered by how
          little you would have to go and buy, and each one names what is still missing.
        </p>
      </header>

      {/* ------------------------------------------------------- the kitchen */}

      <section aria-labelledby="kitchen-heading" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <h2 id="kitchen-heading" className="u-data text-forest">
            Your kitchen
            {selected.length ? (
              <span className="ml-2 text-muted">
                {selected.length} {selected.length === 1 ? "item" : "items"}
              </span>
            ) : null}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find an ingredient"
                aria-label="Find an ingredient"
                className="h-10 w-56 rounded-full bg-paper pr-3 pl-9 text-sm text-ink ring-1 ring-line outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-forest"
              />
            </div>
            {selected.length ? (
              <Button variant="secondary" size="sm" onClick={() => setSelected([])}>
                Clear kitchen
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setSelected(STARTER)}>
                Start with the basics
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <div key={group.aisle}>
              <h3 className="u-data-sm text-muted">{group.aisle}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.entries.map((item) => {
                  const on = selected.includes(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-pressed={on}
                        className={cx(
                          "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[0.9375rem] transition-colors",
                          on
                            ? "bg-forest font-semibold text-cream"
                            : "bg-paper text-ink ring-1 ring-line hover:ring-forest",
                        )}
                      >
                        {on ? <Check aria-hidden="true" className="size-3.5" /> : null}
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {groups.length === 0 ? (
            <p className="text-[0.9375rem] text-muted">
              Nothing here matches “{query}”. It may still be in a recipe — the list above is what
              a kitchen usually keeps, not everything the recipes use.
            </p>
          ) : null}
        </div>

        <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
          Salt, pepper, sugar, water and cooking oil are assumed, so they are never counted as
          missing. Ingredients a recipe marks optional are not counted either.
        </p>
      </section>

      {/* --------------------------------------------------------- the results */}

      <section aria-labelledby="results-heading" className="mt-14">
        {selected.length === 0 ? (
          <>
            <h2 id="results-heading" className="sr-only">
              Results
            </h2>
            <EmptyState
              title="Say what you have and this fills up"
              body="Pick a few things above — a protein and two or three vegetables is usually enough to put a real dinner within reach."
              action={<Button onClick={() => setSelected(STARTER)}>Start with the basics</Button>}
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
              {/*
                "Within reach" would flatter the number: select onions and most
                of the catalogue matches something. The count says what is
                true, and the order does the work of putting the closest first.
              */}
              <h2 id="results-heading" className="font-display text-2xl">
                {matches.length} {matches.length === 1 ? "recipe uses" : "recipes use"} something
                you have
                {readyCount > 0 ? (
                  <span className="u-data ml-3 text-forest">{readyCount} ready now</span>
                ) : null}
              </h2>

              <label className="inline-flex items-center gap-2.5 text-[0.9375rem] text-ink">
                <input
                  type="checkbox"
                  checked={readyOnly}
                  onChange={(event) => setReadyOnly(event.target.checked)}
                  className="size-4 accent-[var(--color-forest)]"
                />
                Only what I can make now
              </label>
            </div>

            {shown.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title="Nothing is fully within reach yet"
                  body={`You are closest to ${matches[0]?.card.name ?? "a few dishes"}, ${matches[0]?.missing.length ?? 0} ingredients away. Add a couple more things, or turn the filter off to see near misses.`}
                  action={
                    <Button variant="secondary" onClick={() => setReadyOnly(false)}>
                      Show near misses
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((match) => {
                  const ready = match.missing.length === 0;
                  const names = match.missing.map((need) => need.name);
                  const isAdded = added.includes(match.card.slug);

                  return (
                    <li key={match.card.slug} className="flex flex-col">
                      <RecipeCard card={match.card} />

                      <div
                        className={cx(
                          "mt-3 rounded-[var(--radius-field)] px-4 py-3",
                          ready ? "bg-forest-wash" : "bg-cream-deep",
                        )}
                      >
                        <p className="u-data-sm text-forest">
                          {ready
                            ? "Ready to cook"
                            : `You have ${match.have.length} of ${match.needs.length}`}
                        </p>

                        {ready ? (
                          <p className="mt-1.5 text-[0.9375rem] text-muted">
                            Everything this needs is in your kitchen.
                          </p>
                        ) : (
                          <>
                            <p className="mt-1.5 text-[0.9375rem] text-ink">
                              Still need: <span className="text-muted">{names.join(" · ")}</span>
                            </p>
                            <button
                              type="button"
                              onClick={() => addMissing(names, match.card.slug)}
                              disabled={isAdded}
                              className="u-data-sm mt-2.5 inline-flex items-center gap-1.5 text-forest underline-offset-4 hover:underline disabled:no-underline disabled:opacity-60"
                            >
                              {isAdded ? (
                                <>
                                  <ShoppingBasket aria-hidden="true" className="size-3.5" />
                                  Added to list
                                </>
                              ) : (
                                <>
                                  <Plus aria-hidden="true" className="size-3.5" />
                                  Add {names.length} to shopping list
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-10 text-sm text-muted">
              Not seeing what you want?{" "}
              <ButtonLink href="/recipes" variant="ghost" size="sm">
                Browse everything instead
              </ButtonLink>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
