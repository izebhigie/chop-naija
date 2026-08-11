import Link from "next/link";
import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cx, formatRating, formatCount } from "@/lib/format";

/* ---------------------------------------------------------------- Buttons */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const BUTTON_VARIANTS = {
  primary: "bg-forest text-cream hover:bg-forest-mid active:bg-forest-deep",
  secondary: "bg-paper text-ink ring-1 ring-line hover:bg-cream-deep active:bg-line-soft",
  ghost: "text-forest hover:bg-forest-wash active:bg-forest-wash/70",
  danger: "text-tomato hover:bg-tomato-wash active:bg-tomato-wash/70",
} as const;

const BUTTON_SIZES = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;
type ButtonSize = keyof typeof BUTTON_SIZES;

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ Rating */

export function Rating({
  rating,
  reviewCount,
  size = "md",
  className,
}: {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const label =
    reviewCount === undefined
      ? `Rated ${formatRating(rating)} out of 5`
      : `Rated ${formatRating(rating)} out of 5 from ${reviewCount} reviews`;

  return (
    <span className={cx("inline-flex items-center gap-1.5", className)} title={label}>
      <Star
        aria-hidden="true"
        className={cx("shrink-0 fill-saffron text-saffron", size === "sm" ? "size-3.5" : "size-4")}
      />
      <span className={cx("font-semibold text-ink tabular-nums", size === "sm" ? "text-xs" : "text-sm")}>
        {formatRating(rating)}
      </span>
      {reviewCount !== undefined ? (
        <span className={cx("text-muted tabular-nums", size === "sm" ? "text-xs" : "text-sm")}>
          ({formatCount(reviewCount)})
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------- Chip */

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "forest" | "tomato";
  className?: string;
}) {
  const tones = {
    neutral: "bg-cream-deep text-muted",
    forest: "bg-forest-wash text-forest",
    tomato: "bg-tomato-wash text-tomato",
  } as const;

  return (
    <span
      className={cx(
        "u-data-sm inline-flex items-center rounded-full px-2.5 py-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- Section head */

export function SectionHeading({
  eyebrow,
  title,
  intro,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        <p className="u-data text-forest">{eyebrow}</p>
        <h2 className="mt-3 text-[length:var(--text-display-md)]">{title}</h2>
        {intro ? <p className="mt-3 text-[1.0625rem] text-muted">{intro}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Skeletons */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("u-skeleton rounded-[var(--radius-field)]", className)} />;
}

export function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper ring-1 ring-line-soft">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ States */

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
      {icon ? <div className="mb-4 flex justify-center text-forest/50">{icon}</div> : null}
      <h3 className="text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[0.9375rem] text-muted">{body}</p>
      {action ? <div className="mt-6 flex justify-center gap-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "That did not load",
  body,
  onRetry,
}: {
  title?: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-tomato/25 bg-tomato-wash px-6 py-10 text-center">
      <h3 className="text-lg text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[0.9375rem] text-muted">{body}</p>
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
