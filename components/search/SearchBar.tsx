"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search, Loader2, CornerDownLeft } from "lucide-react";
import { cx, flagSrc } from "@/lib/format";

interface Suggestion {
  slug: string;
  name: string;
  localName: string | null;
  country: string;
  iso2: string;
  city: string;
}

/**
 * Search with autocomplete.
 *
 * Implements the combobox keyboard contract: Down/Up move through the list,
 * Enter opens the highlighted dish or runs a full search, Escape closes the
 * list. The active option is announced via aria-activedescendant rather than
 * by moving focus, so typing continues to work while browsing suggestions.
 */
export function SearchBar({
  defaultValue = "",
  placeholder = "Search dishes, ingredients, or countries…",
  size = "md",
  autoFocus = false,
  onNavigate,
  className,
}: {
  defaultValue?: string;
  placeholder?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState(defaultValue);
  const [results, setResults] = useState<Suggestion[]>([]);
  // The term the current results belong to, so a stale set is never shown
  // against a newer query.
  const [resultsFor, setResultsFor] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  // Bumped by "Try again" so the lookup re-runs on an unchanged term.
  const [retry, setRetry] = useState(0);

  // Debounced lookup. Each run aborts the previous request so a slow response
  // can never overwrite a newer one. Nothing is set synchronously in the
  // effect body: a term shorter than two characters simply skips the fetch,
  // and the results below are filtered on the current term instead.
  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { results: Suggestion[] };
        setResults(data.results);
        setResultsFor(query);
        setActive(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setFailed(true);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, retry]);

  // Close when focus or a click leaves the component.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToSearch(value: string) {
    const query = value.trim();
    onNavigate?.();
    setOpen(false);
    router.push(query ? `/recipes?q=${encodeURIComponent(query)}` : "/recipes");
  }

  function openRecipe(slug: string) {
    onNavigate?.();
    setOpen(false);
    router.push(`/recipes/${slug}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!visible.length) return;
      event.preventDefault();
      setOpen(true);
      setActive((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        if (next < 0) return visible.length - 1;
        if (next >= visible.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && active >= 0 && visible[active]) openRecipe(visible[active].slug);
      else goToSearch(term);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const query = term.trim();
  const showList = open && query.length >= 2;
  const visible = resultsFor === query ? results : [];
  const tall = size === "lg";

  return (
    <div ref={containerRef} className={cx("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          goToSearch(term);
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search recipes
        </label>

        <div
          className={cx(
            "flex items-center gap-3 rounded-full bg-paper ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-forest",
            tall ? "h-14 pl-5 pr-2" : "h-12 pl-4 pr-2",
          )}
        >
          <Search aria-hidden="true" className="size-5 shrink-0 text-muted" />
          <input
            id={`${listId}-input`}
            ref={inputRef}
            type="search"
            value={term}
            autoFocus={autoFocus}
            autoComplete="off"
            placeholder={placeholder}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showList}
            aria-controls={showList ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:appearance-none"
          />
          {loading ? (
            <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted" />
          ) : null}
          <button
            type="submit"
            className={cx(
              "shrink-0 rounded-full bg-forest font-semibold text-cream transition-colors hover:bg-forest-mid",
              tall ? "h-11 px-6 text-[0.9375rem]" : "h-9 px-5 text-sm",
            )}
          >
            Search
          </button>
        </div>
      </form>

      {showList ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-lift)] ring-1 ring-line">
          {failed ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-ink">Suggestions did not load.</p>
              <button
                type="button"
                onClick={() => setRetry((count) => count + 1)}
                className="u-data mt-2 text-forest underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          ) : visible.length === 0 && !loading ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-ink">No dish matches “{term.trim()}”.</p>
              <button
                type="button"
                onClick={() => goToSearch("")}
                className="u-data mt-2 text-forest underline underline-offset-4"
              >
                Browse all recipes
              </button>
            </div>
          ) : (
            <ul id={listId} role="listbox" aria-label="Recipe suggestions" className="py-1.5">
              {visible.map((item, index) => (
                <li key={item.slug} role="none">
                  <button
                    type="button"
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openRecipe(item.slug)}
                    className={cx(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      index === active ? "bg-forest-wash" : "hover:bg-cream",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 1KB local SVG */}
                    <img
                      src={flagSrc(item.iso2)}
                      alt=""
                      width={20}
                      height={15}
                      className="h-3 w-auto shrink-0 rounded-[2px] ring-1 ring-black/10"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold text-ink">
                        {item.name}
                      </span>
                      <span className="u-data-sm block truncate text-muted">
                        {item.city} / {item.country}
                      </span>
                    </span>
                    {index === active ? (
                      <CornerDownLeft aria-hidden="true" className="size-3.5 shrink-0 text-forest" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
