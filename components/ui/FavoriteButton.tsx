"use client";

import { Heart } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { cx } from "@/lib/format";

/**
 * Saves a recipe. Until the store has read localStorage it renders in the
 * unsaved state, so the button never claims something it does not yet know.
 *
 * It deliberately does not toggle `disabled` on hydration: varying a DOM
 * attribute between the server and client render is a hydration mismatch, and
 * it buys nothing — before hydration there is no click handler to fire.
 */
export function FavoriteButton({
  slug,
  name,
  variant = "overlay",
  className,
}: {
  slug: string;
  name: string;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const { isFavorite, toggleFavorite, hydrated } = useAppStore();
  const saved = hydrated && isFavorite(slug);
  const onToggle = () => {
    if (hydrated) toggleFavorite(slug);
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        className={cx(
          "inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-semibold ring-1 transition-colors",
          saved
            ? "bg-tomato-wash text-tomato ring-tomato/30"
            : "bg-paper text-ink ring-line hover:bg-cream-deep",
          className,
        )}
      >
        <Heart aria-hidden="true" className={cx("size-4", saved && "fill-tomato")} />
        {saved ? "Saved" : "Save recipe"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
      className={cx(
        "absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-paper/92 text-ink shadow-[var(--shadow-chip)] backdrop-blur-sm transition-transform duration-200 hover:scale-105 active:scale-95",
        className,
      )}
    >
      <Heart
        aria-hidden="true"
        className={cx("size-4 transition-colors", saved ? "fill-tomato text-tomato" : "text-ink/70")}
      />
    </button>
  );
}
