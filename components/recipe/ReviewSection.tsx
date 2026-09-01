"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { Review } from "@/lib/types";
import { cx, formatDate } from "@/lib/format";
import { Rating } from "@/components/ui/primitives";

/**
 * Existing reviews plus a form to add one.
 *
 * There is no backend, so a submitted review is added to the list on screen
 * and clearly marked as unsaved rather than pretending to have been posted.
 */
export function ReviewSection({
  reviews,
  recipeName,
  rating,
  reviewCount,
}: {
  reviews: Review[];
  recipeName: string;
  rating: number;
  reviewCount: number;
}) {
  const [added, setAdded] = useState<Review[]>([]);
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (body.trim().length < 10) {
      setError("Tell us a little more — at least a sentence about how it went.");
      return;
    }
    setError("");
    setAdded((current) => [
      {
        id: `local-${current.length}`,
        recipeSlug: "",
        author: name.trim() || "You",
        initials: (name.trim() || "You").slice(0, 2).toUpperCase(),
        rating: stars,
        date: new Date().toISOString().slice(0, 10),
        body: body.trim(),
        cookedFor: "Just cooked",
      },
      ...current,
    ]);
    setBody("");
    setName("");
  }

  const all = [...added, ...reviews];

  return (
    <section aria-labelledby="reviews-heading" className="print-hide">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="u-data text-forest">From the community</p>
          <h2 id="reviews-heading" className="mt-3 text-[length:var(--text-display-md)]">
            Reviews
          </h2>
        </div>
        <Rating rating={rating} reviewCount={reviewCount} />
      </div>

      <form
        onSubmit={submit}
        className="mt-8 rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line-soft"
      >
        <h3 className="font-display text-xl">Cooked {recipeName}? Rate it</h3>

        <fieldset className="mt-4">
          <legend className="u-data text-muted">Your rating</legend>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStars(value)}
                aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                aria-pressed={stars === value}
                className="grid size-10 place-items-center rounded-full transition-colors hover:bg-cream"
              >
                <Star
                  aria-hidden="true"
                  className={cx(
                    "size-6 transition-colors",
                    value <= stars ? "fill-saffron text-saffron" : "text-line",
                  )}
                />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="u-data text-muted">Your name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional"
              className="h-11 rounded-full bg-cream px-4 text-[0.9375rem] text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-forest placeholder:text-muted"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="u-data text-muted">How did it go?</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              aria-describedby={error ? "review-error" : undefined}
              aria-invalid={Boolean(error)}
              placeholder="What worked, what you changed, what you would do differently."
              className="rounded-2xl bg-cream px-4 py-3 text-[0.9375rem] text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-forest placeholder:text-muted"
            />
          </label>
        </div>

        {error ? (
          <p id="review-error" role="alert" className="mt-3 text-sm text-tomato">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-full bg-forest px-6 font-semibold text-cream transition-colors hover:bg-forest-mid"
          >
            Post review
          </button>
          <p className="text-sm text-muted">
            Reviews stay on this device — WorldPlates has no account system yet.
          </p>
        </div>
      </form>

      <ul className="mt-8 space-y-4">
        {all.map((review) => (
          <li
            key={review.id}
            className="rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line-soft"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="u-data-sm grid size-9 place-items-center rounded-full bg-forest-wash text-forest"
                >
                  {review.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{review.author}</p>
                  <p className="u-data-sm text-muted">
                    {formatDate(review.date)}
                    {review.cookedFor ? ` / ${review.cookedFor}` : ""}
                  </p>
                </div>
              </div>
              <Rating rating={review.rating} size="sm" />
            </div>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink">{review.body}</p>
            {review.id.startsWith("local-") ? (
              <p className="u-data-sm mt-3 text-muted">Saved on this device only</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
