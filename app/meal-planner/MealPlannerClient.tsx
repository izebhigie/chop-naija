"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X, Minus, ShoppingBasket, Loader2, CalendarDays } from "lucide-react";
import type { MealSlot, Recipe } from "@/lib/types";
import { useAppStore } from "@/hooks/useAppStore";
import { formatDuration } from "@/lib/units";
import { cx } from "@/lib/format";
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/Flag";

export interface PlannerRecipe {
  slug: string;
  name: string;
  minutes: number;
  servings: number;
  iso2: string;
  country: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS: MealSlot[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export function MealPlannerClient({ options }: { options: PlannerRecipe[] }) {
  const { plan, hydrated, addMeal, updateMeal, removeMeal, clearPlan, addRecipeToList } =
    useAppStore();

  const [picker, setPicker] = useState<{ day: number; slot: MealSlot } | null>(null);
  const [term, setTerm] = useState("");
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [note, setNote] = useState("");

  const bySlug = useMemo(() => new Map(options.map((item) => [item.slug, item])), [options]);

  const totalMinutes = plan.reduce(
    (sum, meal) => sum + (bySlug.get(meal.recipeSlug)?.minutes ?? 0),
    0,
  );

  const filtered = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return options.slice(0, 40);
    return options
      .filter(
        (item) =>
          item.name.toLowerCase().includes(query) || item.country.toLowerCase().includes(query),
      )
      .slice(0, 40);
  }, [options, term]);

  /** Pulls full ingredient lists, then merges them into the shopping list. */
  async function buildShoppingList() {
    if (plan.length === 0) return;
    setBuilding(true);
    setBuildError("");

    try {
      const slugs = [...new Set(plan.map((meal) => meal.recipeSlug))].join(",");
      const response = await fetch(`/api/recipes?slugs=${encodeURIComponent(slugs)}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { recipes: Recipe[] };

      const lookup = new Map(data.recipes.map((recipe) => [recipe.slug, recipe]));
      let added = 0;
      for (const meal of plan) {
        const recipe = lookup.get(meal.recipeSlug);
        if (recipe) added += addRecipeToList(recipe, meal.servings);
      }
      setNote(`${added} ingredients added to your shopping list from ${plan.length} meals.`);
    } catch {
      setBuildError("The shopping list could not be built. Check your connection and try again.");
    } finally {
      setBuilding(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mt-10 grid gap-3 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="u-data rounded-full bg-paper px-4 py-2.5 text-muted ring-1 ring-line">
          {plan.length} {plan.length === 1 ? "meal" : "meals"} planned
        </div>
        <div className="u-data rounded-full bg-paper px-4 py-2.5 text-muted ring-1 ring-line">
          {formatDuration(totalMinutes)} at the stove
        </div>

        <Button onClick={buildShoppingList} disabled={plan.length === 0 || building}>
          {building ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ShoppingBasket aria-hidden="true" className="size-4" />
          )}
          {building ? "Building list" : "Build shopping list"}
        </Button>

        {plan.length > 0 ? (
          <Button variant="ghost" onClick={clearPlan}>
            Clear the week
          </Button>
        ) : null}
      </div>

      <p aria-live="polite" className={note ? "mt-4" : "sr-only"}>
        {note ? (
          <span className="inline-block rounded-xl bg-forest-wash px-4 py-3 text-sm text-forest">
            {note}{" "}
            <Link href="/shopping-list" className="font-semibold underline underline-offset-4">
              Open shopping list
            </Link>
          </span>
        ) : (
          note
        )}
      </p>

      {buildError ? (
        <div className="mt-4">
          <ErrorState body={buildError} onRetry={buildShoppingList} />
        </div>
      ) : null}

      {plan.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<CalendarDays className="size-8" strokeWidth={1.5} />}
            title="Nothing planned this week"
            body="Add a recipe to any slot below, or start from a dish and use “Add to plan”."
            action={<ButtonLink href="/recipes">Browse recipes</ButtonLink>}
          />
        </div>
      ) : null}

      <div className="u-scrollbar-thin mt-8 overflow-x-auto pb-2">
        <div className="grid min-w-[900px] grid-cols-7 gap-3">
          {DAYS.map((day, dayIndex) => (
            <section
              key={day}
              aria-labelledby={`day-${dayIndex}`}
              className="rounded-[var(--radius-card)] bg-paper p-3 ring-1 ring-line-soft"
            >
              <h2 id={`day-${dayIndex}`} className="u-data border-b border-line pb-2 text-forest">
                {day.slice(0, 3)}
              </h2>

              <div className="mt-3 space-y-4">
                {SLOTS.map((slot) => {
                  const meals = plan.filter(
                    (meal) => meal.day === dayIndex && meal.slot === slot,
                  );

                  return (
                    <div key={slot}>
                      <p className="u-data-sm text-muted">{slot}</p>

                      <ul className="mt-1.5 space-y-1.5">
                        {meals.map((meal) => {
                          const recipe = bySlug.get(meal.recipeSlug);
                          if (!recipe) return null;

                          return (
                            <li
                              key={meal.id}
                              className="rounded-xl bg-cream p-2.5 ring-1 ring-line-soft"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <Link
                                  href={`/recipes/${recipe.slug}`}
                                  className="text-[0.8125rem] font-semibold leading-snug text-ink hover:text-forest"
                                >
                                  {recipe.name}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => removeMeal(meal.id)}
                                  aria-label={`Remove ${recipe.name} from ${day} ${slot.toLowerCase()}`}
                                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-tomato-wash hover:text-tomato"
                                >
                                  <X aria-hidden="true" className="size-3.5" />
                                </button>
                              </div>

                              <div className="mt-1.5 flex items-center gap-1.5">
                                <Flag iso2={recipe.iso2} title={recipe.country} className="h-2.5" />
                                <span className="u-data-sm text-muted">
                                  {formatDuration(recipe.minutes)}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateMeal(meal.id, {
                                      servings: Math.max(1, meal.servings - 1),
                                    })
                                  }
                                  aria-label={`Fewer servings of ${recipe.name}`}
                                  className="grid size-6 place-items-center rounded-full bg-paper text-ink ring-1 ring-line"
                                >
                                  <Minus aria-hidden="true" className="size-3" />
                                </button>
                                <span className="u-data-sm min-w-8 text-center text-ink tabular-nums">
                                  {meal.servings}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateMeal(meal.id, {
                                      servings: Math.min(24, meal.servings + 1),
                                    })
                                  }
                                  aria-label={`More servings of ${recipe.name}`}
                                  className="grid size-6 place-items-center rounded-full bg-paper text-ink ring-1 ring-line"
                                >
                                  <Plus aria-hidden="true" className="size-3" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      <button
                        type="button"
                        onClick={() => {
                          setPicker({ day: dayIndex, slot });
                          setTerm("");
                        }}
                        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-line py-2 text-muted transition-colors hover:border-forest hover:text-forest"
                        aria-label={`Add a recipe to ${day} ${slot.toLowerCase()}`}
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                        <span className="u-data-sm">Add</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {picker ? (
        <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close recipe picker"
            onClick={() => setPicker(null)}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Add a recipe to ${DAYS[picker.day]} ${picker.slot.toLowerCase()}`}
            className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-[var(--radius-media)] bg-cream shadow-[var(--shadow-lift)] sm:rounded-[var(--radius-media)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="u-data text-forest">
                  {DAYS[picker.day]} / {picker.slot}
                </p>
                <h2 className="mt-1 font-display text-xl">Choose a recipe</h2>
              </div>
              <button
                type="button"
                onClick={() => setPicker(null)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-full text-muted hover:bg-cream-deep hover:text-ink"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              <label htmlFor="planner-search" className="sr-only">
                Search recipes
              </label>
              <input
                id="planner-search"
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search by dish or country"
                className="h-11 w-full rounded-full bg-paper px-4 text-[0.9375rem] text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-forest placeholder:text-muted"
              />
            </div>

            <ul className="u-scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted">
                  No recipe matches “{term.trim()}”.
                </li>
              ) : (
                filtered.map((recipe) => (
                  <li key={recipe.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        addMeal(picker.day, picker.slot, recipe.slug, recipe.servings);
                        setPicker(null);
                      }}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-paper",
                      )}
                    >
                      <Flag iso2={recipe.iso2} title={recipe.country} className="h-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-semibold text-ink">
                          {recipe.name}
                        </span>
                        <span className="u-data-sm block text-muted">
                          {recipe.country} / {formatDuration(recipe.minutes)}
                        </span>
                      </span>
                      <Plus aria-hidden="true" className="size-4 shrink-0 text-forest" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
