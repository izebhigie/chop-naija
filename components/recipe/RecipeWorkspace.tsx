"use client";

import { useMemo, useState } from "react";
import {
  Minus,
  Plus,
  ShoppingBasket,
  PlayCircle,
  Lightbulb,
  Check,
  ArrowRightLeft,
  Undo2,
} from "lucide-react";
import type { Recipe } from "@/lib/types";
import { formatQuantity, scaleQuantity, formatDuration, type UnitSystem } from "@/lib/units";
import { applySwaps } from "@/lib/swaps";
import { cx } from "@/lib/format";
import { useAppStore } from "@/hooks/useAppStore";
import { CookingMode } from "./CookingMode";

/**
 * The part of a recipe page you actually cook from: serving size, units,
 * ingredients and steps.
 *
 * Changing the servings rescales every quantity live, and the unit switch
 * converts from the stored metric amounts. Both are held here rather than in
 * the URL because they are a preference for this session, not something you
 * would share a link to.
 */
export function RecipeWorkspace({ recipe }: { recipe: Recipe }) {
  const { addRecipeToList } = useAppStore();

  const [servings, setServings] = useState(recipe.servings);
  const [system, setSystem] = useState<UnitSystem>("metric");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [cooking, setCooking] = useState(false);
  const [status, setStatus] = useState("");
  /** Indices into recipe.substitutions that are switched on. */
  const [active, setActive] = useState<number[]>([]);
  const [swapStatus, setSwapStatus] = useState("");

  const swapped = useMemo(() => applySwaps(recipe, active), [recipe, active]);

  const listed = swapped.groups.flatMap((group) => group.items);
  const totalItems = listed.filter((item) => !item.leftOut).length;
  // Only count ticks on lines still on the list; a swapped-out line's tick
  // would otherwise inflate "gathered" for something no longer needed.
  const checkedCount = listed.filter((item) => !item.leftOut && checked[item.id]).length;

  function addToList() {
    const count = addRecipeToList(swapped.recipe, servings);
    const swaps = active.length
      ? `, with ${active.length} ${active.length === 1 ? "swap" : "swaps"}`
      : "";
    setStatus(
      `${count} ingredients from ${recipe.name} added to your shopping list, for ${servings} servings${swaps}.`,
    );
  }

  function toggleSwap(index: number) {
    const swap = recipe.substitutions[index];
    const on = !active.includes(index);
    setActive((current) =>
      on ? [...current, index] : current.filter((value) => value !== index),
    );
    setSwapStatus(
      on
        ? swap.use.length
          ? `${swap.from} swapped for ${swap.use.map((use) => use.name.toLowerCase()).join(" and ")} in the ingredient list.`
          : `${swap.from} left out of the ingredient list.`
        : `${swap.from} is back in the ingredient list.`,
    );
  }

  return (
    <>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-16">
        {/* ---------------------------------------------------- Ingredients */}
        <section aria-labelledby="ingredients-heading">
          <div className="rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line-soft print-plain">
            <h2 id="ingredients-heading" className="font-display text-2xl">
              Ingredients
            </h2>

            <div className="mt-5 flex flex-wrap items-center gap-3 print-hide">
              <div className="inline-flex items-center gap-1 rounded-full bg-cream p-1 ring-1 ring-line">
                <button
                  type="button"
                  onClick={() => setServings((value) => Math.max(1, value - 1))}
                  disabled={servings <= 1}
                  aria-label="Fewer servings"
                  className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-paper disabled:opacity-35"
                >
                  <Minus aria-hidden="true" className="size-4" />
                </button>
                <span
                  aria-live="polite"
                  className="min-w-[5.5rem] text-center text-sm font-semibold text-ink tabular-nums"
                >
                  {servings} {servings === 1 ? "serving" : "servings"}
                </span>
                <button
                  type="button"
                  onClick={() => setServings((value) => Math.min(24, value + 1))}
                  disabled={servings >= 24}
                  aria-label="More servings"
                  className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-paper disabled:opacity-35"
                >
                  <Plus aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div
                role="group"
                aria-label="Measurement units"
                className="inline-flex rounded-full bg-cream p-1 ring-1 ring-line"
              >
                {(["metric", "imperial"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSystem(option)}
                    aria-pressed={system === option}
                    className={cx(
                      "u-data-sm rounded-full px-3 py-2 transition-colors",
                      system === option ? "bg-forest text-cream" : "text-muted hover:text-ink",
                    )}
                  >
                    {option === "metric" ? "Metric" : "US"}
                  </button>
                ))}
              </div>
            </div>

            {servings !== recipe.servings ? (
              <p className="u-data-sm mt-3 text-forest print-hide">
                Scaled from {recipe.servings} servings
              </p>
            ) : null}

            {active.length ? (
              <div className="mt-4 flex flex-col gap-2 rounded-xl bg-forest-wash px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 print-hide">
                <p className="text-sm text-forest">
                  <span className="font-semibold">
                    {active.length} {active.length === 1 ? "swap" : "swaps"} applied.
                  </span>{" "}
                  Allergens, nutrition and the method still describe the original recipe.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActive([]);
                    setSwapStatus("All swaps undone. The ingredient list is back to the original.");
                  }}
                  className="-ml-2 inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2 py-1 text-sm font-semibold text-forest underline-offset-4 hover:underline sm:ml-0"
                >
                  <Undo2 aria-hidden="true" className="size-3.5" />
                  Undo all
                </button>
              </div>
            ) : null}

            <div className="mt-6 space-y-6">
              {swapped.groups.map((group) => (
                <div key={group.title}>
                  <h3 className="u-data text-forest">{group.title}</h3>
                  <ul className="mt-3 space-y-1">
                    {group.items.map((item) => {
                      const scaled = scaleQuantity(item.qty, recipe.servings, servings);
                      const amount = formatQuantity(scaled, item.unit, system);
                      const isChecked = Boolean(checked[item.id]);

                      if (item.leftOut) {
                        return (
                          <li key={item.id} className="flex items-baseline gap-3 px-2 py-2">
                            <span aria-hidden="true" className="size-4 shrink-0" />
                            <span className="min-w-0 flex-1 text-[0.9375rem] text-muted">
                              <span className="line-through">
                                {amount ? `${amount} ` : ""}
                                {item.name}
                              </span>
                              <span className="u-data-sm ml-2 text-forest">left out</span>
                            </span>
                          </li>
                        );
                      }

                      return (
                        <li key={item.id}>
                          <label
                            className={cx(
                              "flex cursor-pointer items-baseline gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-cream",
                              isChecked && "opacity-50",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                setChecked((current) => ({
                                  ...current,
                                  [item.id]: !current[item.id],
                                }))
                              }
                              className="size-4 shrink-0 translate-y-0.5 accent-[var(--color-forest)]"
                            />
                            <span
                              className={cx(
                                "min-w-0 flex-1 text-[0.9375rem] text-ink",
                                isChecked && "line-through",
                              )}
                            >
                              {amount ? (
                                <span className="font-semibold tabular-nums">{amount} </span>
                              ) : null}
                              {item.name}
                              {item.note ? (
                                <span className="text-muted">, {item.note}</span>
                              ) : null}
                              {!amount ? <span className="text-muted"> — to taste</span> : null}
                              {item.optional ? (
                                <span className="u-data-sm ml-2 text-muted">optional</span>
                              ) : null}
                              {item.swappedFrom ? (
                                <span className="u-data-sm ml-2 text-forest">
                                  instead of {item.swappedFrom.toLowerCase()}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <p aria-live="polite" className="u-data-sm mt-5 text-muted print-hide">
              {checkedCount} of {totalItems} gathered
            </p>

            <button
              type="button"
              onClick={addToList}
              // min-h rather than h: on a 320px phone the label wraps to two
              // lines, and a fixed height let it spill out of the button.
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-center leading-snug font-semibold text-cream transition-colors hover:bg-forest-mid print-hide"
            >
              <ShoppingBasket aria-hidden="true" className="size-4" />
              Add ingredients to shopping list
            </button>
            <p aria-live="polite" className="sr-only">
              {status}
            </p>
            {status ? (
              <p className="mt-3 rounded-xl bg-forest-wash px-4 py-3 text-sm text-forest print-hide">
                {status}{" "}
                <a href="/shopping-list" className="font-semibold underline underline-offset-4">
                  View list
                </a>
              </p>
            ) : null}
          </div>
        </section>

        {/* ---------------------------------------------------------- Steps */}
        <section aria-labelledby="method-heading">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="method-heading" className="font-display text-2xl">
              Method
            </h2>
            <button
              type="button"
              onClick={() => setCooking(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-deep px-5 text-[0.9375rem] font-semibold text-cream transition-colors hover:bg-forest print-hide"
            >
              <PlayCircle aria-hidden="true" className="size-4" />
              Start cooking mode
            </button>
          </div>

          <p className="mt-2 text-[0.9375rem] text-muted">
            {recipe.steps.length} steps / {formatDuration(recipe.prepMinutes + recipe.cookMinutes)}{" "}
            from start to finish
          </p>

          {/* Numbered because the order genuinely matters. */}
          <ol className="mt-8 space-y-8">
            {recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="mt-1 font-display text-3xl leading-none text-forest/30 tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1 border-b border-line-soft pb-8 last:border-0">
                  <p className="text-[1.0625rem] leading-relaxed text-ink">{step.body}</p>
                  {step.minutes ? (
                    <p className="u-data-sm mt-2 text-muted">
                      About {formatDuration(step.minutes)}
                    </p>
                  ) : null}
                  {step.tip ? (
                    <div className="mt-4 flex gap-3 rounded-2xl bg-cream-deep p-4">
                      <Lightbulb aria-hidden="true" className="size-4 shrink-0 text-saffron" />
                      <p className="text-[0.9375rem] leading-relaxed text-muted">{step.tip}</p>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {recipe.tips.length ? (
            <div className="mt-10 rounded-[var(--radius-card)] bg-forest-wash p-6">
              <h3 className="u-data text-forest">Chef&rsquo;s notes</h3>
              <ul className="mt-4 space-y-3">
                {recipe.tips.map((tip) => (
                  <li key={tip} className="flex gap-3 text-[0.9375rem] text-ink">
                    <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-forest" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {recipe.substitutions.length ? (
            <div className="mt-6 rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line-soft">
              <h3 className="u-data text-forest">Swaps that work</h3>
              <p className="mt-2 text-sm text-muted print-hide">
                Use one and the ingredient list and shopping list change to match.
              </p>
              <ul className="mt-4 divide-y divide-line-soft">
                {recipe.substitutions.map((swap, index) => {
                  const on = active.includes(index);
                  return (
                    <li
                      key={swap.from}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] font-semibold text-ink">
                          {swap.from} → {swap.to}
                        </p>
                        <p className="mt-1 text-[0.9375rem] text-muted">{swap.why}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSwap(index)}
                        aria-pressed={on}
                        aria-label={
                          on
                            ? `Undo swap: put ${swap.from.toLowerCase()} back`
                            : swap.use.length
                              ? `Use ${swap.use.map((use) => use.name.toLowerCase()).join(" and ")} instead of ${swap.from.toLowerCase()}`
                              : `Leave out ${swap.from.toLowerCase()}`
                        }
                        className={cx(
                          "inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full px-4 text-sm font-semibold transition-colors print-hide",
                          on
                            ? "bg-forest text-cream hover:bg-forest-mid"
                            : "bg-cream text-forest ring-1 ring-line hover:bg-forest-wash",
                        )}
                      >
                        {on ? (
                          <Check aria-hidden="true" className="size-3.5" />
                        ) : (
                          <ArrowRightLeft aria-hidden="true" className="size-3.5" />
                        )}
                        {on ? "Swapped" : swap.use.length ? "Use this swap" : "Leave it out"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p aria-live="polite" className="u-data-sm mt-4 text-forest print-hide">
                {swapStatus}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {cooking ? (
        <CookingMode
          steps={recipe.steps}
          recipeName={recipe.name}
          onClose={() => setCooking(false)}
        />
      ) : null}
    </>
  );
}
