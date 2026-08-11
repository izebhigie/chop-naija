import Link from "next/link";
import { cx } from "@/lib/format";

/**
 * A plate seen from above with a meridian through it — the globe and the
 * dish are the same object, which is the whole idea of the product.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cx("size-8", className)}
      fill="none"
      strokeLinecap="round"
    >
      <circle cx="16" cy="16" r="14" className="stroke-current" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="7.5" className="fill-current opacity-15" />
      <circle cx="16" cy="16" r="7.5" className="stroke-current" strokeWidth="1.25" />
      <path d="M16 2c3.6 4 5.4 8.6 5.4 14S19.6 26 16 30" className="stroke-current" strokeWidth="1.25" opacity="0.75" />
      <path d="M16 2c-3.6 4-5.4 8.6-5.4 14S12.4 26 16 30" className="stroke-current" strokeWidth="1.25" opacity="0.75" />
      <path d="M2.6 11.5h26.8M2.6 20.5h26.8" className="stroke-current" strokeWidth="1.25" opacity="0.45" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cx("inline-flex items-center gap-2 text-forest sm:gap-2.5", className)}
      aria-label="WorldPlates, home"
    >
      <LogoMark className="size-7 shrink-0 sm:size-8" />
      <span className="font-display text-[1.1875rem] leading-none tracking-tight text-ink sm:text-[1.375rem]">
        WorldPlates
      </span>
    </Link>
  );
}
