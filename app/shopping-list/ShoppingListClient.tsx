"use client";

import { useMemo, useState } from "react";
import { ShoppingBasket, Printer, Copy, Check, Trash2, Plus, X } from "lucide-react";
import type { Aisle, ShoppingItem } from "@/lib/types";
import { useAppStore } from "@/hooks/useAppStore";
import { formatQuantity, type UnitSystem } from "@/lib/units";
import { cx } from "@/lib/format";
import { Button, ButtonLink, EmptyState, Skeleton } from "@/components/ui/primitives";

/** Supermarket order, roughly: fresh things first, cupboard things last. */
const AISLE_ORDER: Aisle[] = [
  "Produce",
  "Meat & fish",
  "Dairy & eggs",
  "Bakery",
  "Frozen",
  "Pantry",
  "Spices",
];

export function ShoppingListClient() {
  const {
    shopping,
    hydrated,
    toggleItem,
    renameItem,
    removeItem,
    addCustomItem,
    clearChecked,
    clearList,
  } = useAppStore();

  const [system, setSystem] = useState<UnitSystem>("metric");
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<Aisle, ShoppingItem[]>();
    for (const item of shopping) {
      const list = map.get(item.aisle) ?? [];
      list.push(item);
      map.set(item.aisle, list);
    }
    return AISLE_ORDER.filter((aisle) => map.has(aisle)).map(
      (aisle) => [aisle, map.get(aisle)!] as const,
    );
  }, [shopping]);

  const remaining = shopping.filter((item) => !item.checked).length;

  function asText() {
    return grouped
      .map(([aisle, items]) => {
        const lines = items.map((item) => {
          const amount = formatQuantity(item.qty, item.unit, system);
          return `- ${[amount, item.name].filter(Boolean).join(" ")}`;
        });
        return `${aisle}\n${lines.join("\n")}`;
      })
      .join("\n\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mt-10 space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (shopping.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState
          icon={<ShoppingBasket className="size-8" strokeWidth={1.5} />}
          title="Your shopping list is empty"
          body="Open a recipe, set the servings you need, then send its ingredients here. Amounts from different recipes are added together."
          action={<ButtonLink href="/recipes">Pick a recipe</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3 print-hide">
        <div
          role="group"
          aria-label="Measurement units"
          className="inline-flex rounded-full bg-paper p-1 ring-1 ring-line"
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

        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden="true" className="size-4" />
          Print
        </Button>

        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? (
            <Check aria-hidden="true" className="size-4 text-forest" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? "Copied" : "Copy list"}
        </Button>

        <Button variant="ghost" size="sm" onClick={clearChecked}>
          Clear ticked
        </Button>
        <Button variant="danger" size="sm" onClick={clearList}>
          <Trash2 aria-hidden="true" className="size-4" />
          Empty list
        </Button>

        <p aria-live="polite" className="u-data ml-auto text-muted">
          {remaining} of {shopping.length} left
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          addCustomItem(newItem);
          setNewItem("");
        }}
        className="mt-6 flex gap-3 print-hide"
      >
        <label htmlFor="new-item" className="sr-only">
          Add an item
        </label>
        <input
          id="new-item"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Add something else — kitchen roll, olive oil…"
          className="h-12 flex-1 rounded-full bg-paper px-5 text-[0.9375rem] text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-forest placeholder:text-muted"
        />
        <Button type="submit" disabled={!newItem.trim()}>
          <Plus aria-hidden="true" className="size-4" />
          Add
        </Button>
      </form>

      <div className="mt-10 space-y-8">
        {grouped.map(([aisle, items]) => (
          <section key={aisle} aria-labelledby={`aisle-${aisle}`}>
            <h2
              id={`aisle-${aisle}`}
              className="u-data border-b border-line pb-2 text-forest"
            >
              {aisle} <span className="text-muted">({items.length})</span>
            </h2>

            <ul className="mt-2 divide-y divide-line-soft">
              {items.map((item) => {
                const amount = formatQuantity(item.qty, item.unit, system);
                const isEditing = editing === item.id;

                return (
                  <li key={item.id} className="flex items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                      aria-label={`Tick off ${item.name}`}
                      className="mt-1 size-4 shrink-0 accent-[var(--color-forest)]"
                    />

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            renameItem(item.id, draft.trim() || item.name);
                            setEditing(null);
                          }}
                          className="flex gap-2"
                        >
                          <input
                            autoFocus
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            aria-label={`Rename ${item.name}`}
                            className="h-10 flex-1 rounded-full bg-paper px-4 text-[0.9375rem] text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-forest"
                          />
                          <Button size="sm" type="submit">
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item.id);
                              setDraft(item.name);
                            }}
                            className={cx(
                              "text-left text-[0.9375rem] text-ink transition-opacity",
                              item.checked && "line-through opacity-45",
                            )}
                          >
                            {amount ? (
                              <span className="font-semibold tabular-nums">{amount} </span>
                            ) : null}
                            {item.name}
                          </button>

                          {item.sources.length ? (
                            <p className="u-data-sm mt-0.5 text-muted">
                              for {item.sources.join(", ")}
                            </p>
                          ) : (
                            <p className="u-data-sm mt-0.5 text-muted">added by you</p>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-tomato-wash hover:text-tomato print-hide"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
