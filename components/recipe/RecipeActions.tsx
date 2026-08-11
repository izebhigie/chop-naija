"use client";

import { useState } from "react";
import { Share2, Printer, CalendarPlus, Check } from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { useAppStore } from "@/hooks/useAppStore";
import type { MealSlot } from "@/lib/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS: MealSlot[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

/** Save, share, print, and drop the recipe into the week's plan. */
export function RecipeActions({
  slug,
  name,
  servings,
}: {
  slug: string;
  name: string;
  servings: number;
}) {
  const { addMeal } = useAppStore();
  const [shareNote, setShareNote] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [planNote, setPlanNote] = useState("");
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<MealSlot>("Dinner");

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
      window.setTimeout(() => setShareNote(""), 2500);
    } catch {
      // A cancelled share sheet is not an error worth reporting.
      setShareNote("");
    }
  }

  return (
    <div className="print-hide">
      <div className="flex flex-wrap items-center gap-3">
        <FavoriteButton slug={slug} name={name} variant="inline" />

        <button
          type="button"
          onClick={share}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-cream-deep"
        >
          {shareNote ? (
            <Check aria-hidden="true" className="size-4 text-forest" />
          ) : (
            <Share2 aria-hidden="true" className="size-4" />
          )}
          {shareNote || "Share"}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-cream-deep"
        >
          <Printer aria-hidden="true" className="size-4" />
          Print
        </button>

        <button
          type="button"
          onClick={() => setPlanOpen((open) => !open)}
          aria-expanded={planOpen}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-cream-deep"
        >
          <CalendarPlus aria-hidden="true" className="size-4" />
          Add to plan
        </button>
      </div>

      {planOpen ? (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
          <label className="flex flex-col gap-1.5">
            <span className="u-data text-muted">Day</span>
            <select
              value={day}
              onChange={(event) => setDay(Number(event.target.value))}
              className="h-11 rounded-full bg-cream px-4 text-[0.9375rem] text-ink ring-1 ring-line"
            >
              {DAYS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="u-data text-muted">Meal</span>
            <select
              value={slot}
              onChange={(event) => setSlot(event.target.value as MealSlot)}
              className="h-11 rounded-full bg-cream px-4 text-[0.9375rem] text-ink ring-1 ring-line"
            >
              {SLOTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              addMeal(day, slot, slug, servings);
              setPlanNote(`Added to ${DAYS[day]} ${slot.toLowerCase()}`);
              setPlanOpen(false);
              window.setTimeout(() => setPlanNote(""), 3000);
            }}
            className="inline-flex h-11 items-center rounded-full bg-forest px-5 text-[0.9375rem] font-semibold text-cream transition-colors hover:bg-forest-mid"
          >
            Add to plan
          </button>
        </div>
      ) : null}

      <p aria-live="polite" className={planNote ? "u-data mt-3 text-forest" : "sr-only"}>
        {planNote}
      </p>
    </div>
  );
}
