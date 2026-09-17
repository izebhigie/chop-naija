"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ListPlus } from "lucide-react";
import type { Aisle } from "@/lib/types";
import { useAppStore } from "@/hooks/useAppStore";
import { decodeList, ShareError, type ShareProblem, type SharedItem } from "@/lib/share-list";
import { formatQuantity, type UnitSystem } from "@/lib/units";
import { AISLE_ORDER } from "@/lib/aisles";
import { cx } from "@/lib/format";
import { Button, ButtonLink, EmptyState, Skeleton } from "@/components/ui/primitives";

type LinkState =
  | { status: "reading" }
  | { status: "empty" }
  | { status: "broken"; problem: ShareProblem }
  | { status: "ready"; items: SharedItem[] };

const PROBLEMS: Record<ShareProblem, { title: string; body: string }> = {
  damaged: {
    title: "This link looks incomplete",
    body: "Part of the list is missing — messaging apps sometimes cut a long link short. Ask for it to be sent again, ideally copied rather than retyped.",
  },
  unsupported: {
    title: "This browser can't open this list",
    body: "The link was made by a newer version of WorldPlates, or needs a newer browser than this one. Updating the browser usually fixes it.",
  },
  "too-large": {
    title: "This list is too big for a link",
    body: "Shared lists are capped so a link can't be used to flood a device. Ask for the list to be split, or sent as text with Copy list.",
  },
};

/**
 * Opens a shopping list someone sent as a link.
 *
 * Everything comes from the URL fragment, which the browser never sends to
 * the server — so this page is static, and the list is read and checked here
 * on the device.
 */
export function SharedListClient() {
  const { importItems } = useAppStore();
  const [link, setLink] = useState<LinkState>({ status: "reading" });
  const [system, setSystem] = useState<UnitSystem>("metric");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function read(): Promise<LinkState> {
      const payload = window.location.hash.slice(1);
      if (!payload) return { status: "empty" };
      try {
        return { status: "ready", items: await decodeList(payload) };
      } catch (error) {
        return {
          status: "broken",
          problem: error instanceof ShareError ? error.problem : "damaged",
        };
      }
    }

    const load = () => {
      void read().then((next) => {
        setLink(next);
        setAdded(false);
      });
    };
    load();
    // Pasting a different link into this same tab only changes the fragment.
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  const items = useMemo(() => (link.status === "ready" ? link.items : []), [link]);

  const grouped = useMemo(() => {
    const map = new Map<Aisle, SharedItem[]>();
    for (const item of items) map.set(item.aisle, [...(map.get(item.aisle) ?? []), item]);
    return AISLE_ORDER.filter((aisle) => map.has(aisle)).map((aisle) => ({
      aisle,
      items: map.get(aisle)!,
    }));
  }, [items]);

  const recipes = useMemo(() => [...new Set(items.flatMap((item) => item.sources))], [items]);

  if (link.status === "reading") {
    return (
      <div className="mt-10 space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (link.status !== "ready" || items.length === 0) {
    const copy =
      link.status === "broken"
        ? PROBLEMS[link.problem]
        : {
            title: "This link doesn't carry a list",
            body: "Shared lists arrive as a link from someone's WorldPlates shopping list. Ask them to send it again.",
          };
    return (
      <div className="mt-10">
        <EmptyState
          title={copy.title}
          body={copy.body}
          action={<ButtonLink href="/shopping-list">Go to your shopping list</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 rounded-[var(--radius-card)] bg-paper p-5 ring-1 ring-line-soft sm:p-6">
        <p className="font-display text-2xl leading-tight text-ink">
          {items.length} {items.length === 1 ? "thing" : "things"} to buy
        </p>
        {recipes.length ? (
          <p className="mt-1 text-[0.9375rem] text-muted">For {recipes.join(", ")}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {added ? (
            <>
              <p role="status" className="inline-flex items-center gap-2 font-semibold text-forest">
                <Check aria-hidden="true" className="size-4" />
                Added to your shopping list
              </p>
              <ButtonLink href="/shopping-list" variant="secondary" size="sm">
                View your list
              </ButtonLink>
            </>
          ) : (
            <Button
              onClick={() => {
                importItems(items);
                setAdded(true);
              }}
            >
              <ListPlus aria-hidden="true" className="size-4" />
              Add all {items.length} to my shopping list
            </Button>
          )}
        </div>
        <p className="mt-3 text-sm text-muted">
          Anything already on your list is added together rather than repeated.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
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
      </div>

      <div className="mt-8 space-y-8">
        {grouped.map(({ aisle, items: inAisle }) => (
          <section key={aisle} aria-labelledby={`shared-${aisle}`}>
            <h2 id={`shared-${aisle}`} className="u-data border-b border-line pb-2 text-forest">
              {aisle} <span className="text-muted">({inAisle.length})</span>
            </h2>
            <ul className="mt-2 divide-y divide-line-soft">
              {inAisle.map((item, index) => {
                const amount = formatQuantity(item.qty, item.unit, system);
                return (
                  <li key={`${item.name}-${item.unit}-${index}`} className="py-3">
                    <p className="text-[0.9375rem] text-ink">
                      {amount ? <span className="font-semibold tabular-nums">{amount} </span> : null}
                      {item.name}
                    </p>
                    <p className="u-data-sm mt-0.5 text-muted">
                      {item.sources.length ? `for ${item.sources.join(", ")}` : "added by hand"}
                    </p>
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
