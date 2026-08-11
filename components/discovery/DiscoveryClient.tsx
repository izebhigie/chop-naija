"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, LayoutGrid, Rows3, Search } from "lucide-react";
import type { RecipeQuery } from "@/lib/types";
import type { RecipeCardData } from "@/lib/cards";
import { SORT_LABELS, countActiveFilters, parseQuery, type ViewMode } from "@/lib/filters";
import { cx } from "@/lib/format";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { FilterPanel, type FilterGroupSpec } from "./FilterPanel";
import { Button, ButtonLink, EmptyState } from "@/components/ui/primitives";

const PAGE_SIZE = 12;

/** Human labels for the chips above the results. */
const GROUP_LABELS: Partial<Record<keyof RecipeQuery, string>> = {
  regions: "Region",
  countries: "Country",
  cuisines: "Cuisine",
  mealTypes: "Meal",
  ingredients: "Ingredient",
  diets: "Diet",
  allergens: "No",
  methods: "Method",
  difficulty: "Difficulty",
};

export function DiscoveryClient({
  results,
  groups,
  total,
}: {
  results: RecipeCardData[];
  groups: FilterGroupSpec[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<ViewMode>("grid");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useMemo(
    () => parseQuery(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const activeCount = countActiveFilters(query);

  /** Rewrites the URL — the single source of truth for every filter. */
  const push = useCallback(
    (next: URLSearchParams) => {
      const search = next.toString();
      router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
      setShown(PAGE_SIZE);
    },
    [router, pathname],
  );

  const toggleValue = useCallback(
    (key: keyof RecipeQuery, value: string) => {
      const param = KEY_TO_PARAM[key];
      if (!param) return;
      const next = new URLSearchParams(searchParams.toString());
      const current = (next.get(param)?.split(",").filter(Boolean) ?? []) as string[];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (updated.length) next.set(param, updated.join(","));
      else next.delete(param);
      push(next);
    },
    [searchParams, push],
  );

  const setNumber = useCallback(
    (key: "maxMinutes" | "minRating", value: number | undefined) => {
      const param = key === "maxMinutes" ? "time" : "rating";
      const next = new URLSearchParams(searchParams.toString());
      if (value === undefined) next.delete(param);
      else next.set(param, String(value));
      push(next);
    },
    [searchParams, push],
  );

  const setSort = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "relevance") next.delete("sort");
      else next.set("sort", value);
      push(next);
    },
    [searchParams, push],
  );

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
    setShown(PAGE_SIZE);
  }, [router, pathname]);

  const chips = useMemo(() => {
    const list: Array<{ key: keyof RecipeQuery | "q" | "time" | "rating"; value: string; label: string }> = [];
    if (query.q) list.push({ key: "q", value: query.q, label: `“${query.q}”` });

    for (const [key, label] of Object.entries(GROUP_LABELS) as Array<[keyof RecipeQuery, string]>) {
      const values = (query[key] as string[] | undefined) ?? [];
      const group = groups.find((item) => item.key === key);
      for (const value of values) {
        const option = group?.options.find((item) => item.value === value);
        list.push({ key, value, label: `${label}: ${option?.label ?? value}` });
      }
    }

    if (query.maxMinutes) {
      list.push({ key: "time", value: "", label: `Under ${query.maxMinutes} min` });
    }
    if (query.minRating) {
      list.push({ key: "rating", value: "", label: `${query.minRating.toFixed(1)}+ rating` });
    }
    return list;
  }, [query, groups]);

  const visible = results.slice(0, shown);
  const hasMore = shown < results.length;

  function removeChip(chip: { key: string; value: string }) {
    const next = new URLSearchParams(searchParams.toString());
    if (chip.key === "q") next.delete("q");
    else if (chip.key === "time") next.delete("time");
    else if (chip.key === "rating") next.delete("rating");
    else toggleValue(chip.key as keyof RecipeQuery, chip.value);

    if (["q", "time", "rating"].includes(chip.key)) push(next);
  }

  const filterRail = (
    <FilterPanel
      groups={groups}
      query={query}
      onToggle={toggleValue}
      onSetNumber={setNumber}
      idPrefix={drawerOpen ? "drawer" : "rail"}
    />
  );

  return (
    <div className="u-shell pb-20 pt-10">
      <header className="max-w-3xl">
        <p className="u-data text-forest">Recipe collection</p>
        <h1 className="mt-3 text-[length:var(--text-display-lg)]">
          {query.q ? `Recipes for “${query.q}”` : "Every dish on WorldPlates"}
        </h1>
        <p className="mt-3 text-[1.0625rem] text-muted">
          <span className="tabular-nums">{results.length}</span>{" "}
          {results.length === 1 ? "recipe" : "recipes"}
          {activeCount > 0 ? ` match your filters, out of ${total}` : " from 29 countries"}.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-cream-deep lg:hidden"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
          {activeCount > 0 ? (
            <span className="u-data-sm rounded-full bg-forest px-1.5 py-0.5 text-cream">
              {activeCount}
            </span>
          ) : null}
        </button>

        <label className="inline-flex items-center gap-2">
          <span className="u-data text-muted">Sort</span>
          <select
            value={query.sort ?? "relevance"}
            onChange={(event) => setSort(event.target.value)}
            className="h-11 rounded-full bg-paper px-4 text-[0.9375rem] text-ink ring-1 ring-line"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div
          role="group"
          aria-label="Result layout"
          className="ml-auto inline-flex rounded-full bg-paper p-1 ring-1 ring-line"
        >
          {([
            ["grid", LayoutGrid, "Grid"],
            ["list", Rows3, "List"],
          ] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              className={cx(
                "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors",
                view === mode ? "bg-forest text-cream" : "text-muted hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={`${String(chip.key)}-${chip.value}-${chip.label}`}
              type="button"
              onClick={() => removeChip(chip as { key: string; value: string })}
              className="group inline-flex items-center gap-1.5 rounded-full bg-forest-wash px-3 py-1.5 text-sm text-forest transition-colors hover:bg-forest hover:text-cream"
            >
              {chip.label}
              <X aria-hidden="true" className="size-3.5" />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="u-data ml-1 text-muted underline underline-offset-4 transition-colors hover:text-tomato"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div className="mt-10 flex gap-10">
        <aside className="hidden w-[268px] shrink-0 lg:block">
          <h2 className="u-data mb-2 text-forest">Refine</h2>
          {filterRail}
        </aside>

        <div className="min-w-0 flex-1">
          {results.length === 0 ? (
            <EmptyState
              icon={<Search className="size-8" strokeWidth={1.5} />}
              title="No recipes match these filters"
              body="Try removing the cooking time or a dietary filter — those narrow things down fastest."
              action={
                <>
                  <Button variant="secondary" onClick={clearAll}>
                    Clear all filters
                  </Button>
                  <ButtonLink href="/recipes" variant="primary">
                    Browse all {total} recipes
                  </ButtonLink>
                </>
              }
            />
          ) : (
            <>
              <ul
                className={cx(
                  view === "grid" ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4",
                )}
              >
                {visible.map((card, index) => (
                  <li key={card.slug}>
                    <RecipeCard card={card} view={view} priority={index < 3} />
                  </li>
                ))}
              </ul>

              {hasMore ? (
                <div className="mt-10 flex flex-col items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShown((count) => count + PAGE_SIZE)}
                  >
                    Load {Math.min(PAGE_SIZE, results.length - shown)} more
                  </Button>
                  <p aria-live="polite" className="u-data text-muted">
                    Showing {visible.length} of {results.length}
                  </p>
                </div>
              ) : (
                <p aria-live="polite" className="u-data mt-10 text-center text-faint">
                  That is all {results.length} {results.length === 1 ? "recipe" : "recipes"}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-60 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 right-0 flex w-[min(92vw,380px)] flex-col bg-cream shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-xl">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid size-9 place-items-center rounded-full text-muted hover:bg-cream-deep hover:text-ink"
                aria-label="Close filters"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="u-scrollbar-thin flex-1 overflow-y-auto px-5">{filterRail}</div>

            <div className="flex gap-3 border-t border-line px-5 py-4">
              <Button variant="secondary" className="flex-1" onClick={clearAll}>
                Clear all
              </Button>
              <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
                Show {results.length} {results.length === 1 ? "recipe" : "recipes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Maps a RecipeQuery key to its URL parameter name. */
const KEY_TO_PARAM: Partial<Record<keyof RecipeQuery, string>> = {
  regions: "region",
  countries: "country",
  cuisines: "cuisine",
  mealTypes: "meal",
  ingredients: "ingredient",
  diets: "diet",
  allergens: "allergen",
  methods: "method",
  difficulty: "difficulty",
};
