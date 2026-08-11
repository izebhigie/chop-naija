"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search as SearchIcon } from "lucide-react";
import type { RecipeQuery } from "@/lib/types";
import { cx } from "@/lib/format";

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterGroupSpec {
  /** The key in RecipeQuery this group writes to. */
  key: keyof RecipeQuery;
  title: string;
  options: FilterOption[];
  /** Long lists get a box to search within them. */
  searchable?: boolean;
  defaultOpen?: boolean;
}

/**
 * The filter rail. Every control writes straight into the URL through
 * `onToggle`, so the page state is always the address bar — a filtered view
 * can be bookmarked, shared or reloaded and comes back identical.
 */
export function FilterPanel({
  groups,
  query,
  onToggle,
  onSetNumber,
  idPrefix = "filter",
}: {
  groups: FilterGroupSpec[];
  query: RecipeQuery;
  onToggle: (key: keyof RecipeQuery, value: string) => void;
  onSetNumber: (key: "maxMinutes" | "minRating", value: number | undefined) => void;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-1">
      <TimeFilter value={query.maxMinutes} onChange={(v) => onSetNumber("maxMinutes", v)} />
      <RatingFilter value={query.minRating} onChange={(v) => onSetNumber("minRating", v)} />

      {groups.map((group) => (
        <CheckboxGroup
          key={String(group.key)}
          spec={group}
          selected={(query[group.key] as string[] | undefined) ?? []}
          onToggle={(value) => onToggle(group.key, value)}
          idPrefix={idPrefix}
        />
      ))}
    </div>
  );
}

function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line-soft py-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="u-data text-ink">{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cx(
            "size-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="pb-4">{children}</div> : null}
    </div>
  );
}

function CheckboxGroup({
  spec,
  selected,
  onToggle,
  idPrefix,
}: {
  spec: FilterGroupSpec;
  selected: string[];
  onToggle: (value: string) => void;
  idPrefix: string;
}) {
  const [term, setTerm] = useState("");

  const visible = useMemo(() => {
    if (!spec.searchable || !term.trim()) return spec.options;
    const lower = term.trim().toLowerCase();
    return spec.options.filter((option) => option.label.toLowerCase().includes(lower));
  }, [spec.options, spec.searchable, term]);

  return (
    <Disclosure title={spec.title} defaultOpen={spec.defaultOpen || selected.length > 0}>
      {spec.searchable ? (
        <div className="relative mb-3">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={`Search ${spec.title.toLowerCase()}`}
            aria-label={`Search within ${spec.title}`}
            className="h-9 w-full rounded-full bg-cream pl-8 pr-3 text-sm text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-forest placeholder:text-faint [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      ) : null}

      <div
        className={cx(
          "space-y-0.5",
          spec.searchable && "u-scrollbar-thin max-h-56 overflow-y-auto pr-1",
        )}
      >
        {visible.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted">Nothing matches “{term.trim()}”.</p>
        ) : (
          visible.map((option) => {
            const id = `${idPrefix}-${String(spec.key)}-${option.value}`;
            const checked = selected.includes(option.value);
            const empty = option.count === 0 && !checked;

            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-cream",
                  empty && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  disabled={empty}
                  onChange={() => onToggle(option.value)}
                  className="size-4 shrink-0 accent-[var(--color-forest)]"
                />
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink">
                  {option.label}
                </span>
                <span className="u-data-sm shrink-0 text-faint tabular-nums">{option.count}</span>
              </label>
            );
          })
        )}
      </div>
    </Disclosure>
  );
}

const TIME_STEPS = [30, 45, 60, 90, 180];

function TimeFilter({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Disclosure title="Total time" defaultOpen>
      <div className="flex flex-wrap gap-2">
        {TIME_STEPS.map((minutes) => {
          const active = value === minutes;
          return (
            <button
              key={minutes}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? undefined : minutes)}
              className={cx(
                "u-data-sm rounded-full px-3 py-2 ring-1 transition-colors",
                active
                  ? "bg-forest text-cream ring-forest"
                  : "bg-paper text-muted ring-line hover:text-ink",
              )}
            >
              Under {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
            </button>
          );
        })}
      </div>
    </Disclosure>
  );
}

function RatingFilter({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Disclosure title="Rating" defaultOpen>
      <div className="flex flex-wrap gap-2">
        {[4.9, 4.8, 4.7, 4.5].map((rating) => {
          const active = value === rating;
          return (
            <button
              key={rating}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? undefined : rating)}
              className={cx(
                "u-data-sm rounded-full px-3 py-2 ring-1 transition-colors",
                active
                  ? "bg-forest text-cream ring-forest"
                  : "bg-paper text-muted ring-line hover:text-ink",
              )}
            >
              {rating.toFixed(1)}+
            </button>
          );
        })}
      </div>
    </Disclosure>
  );
}
