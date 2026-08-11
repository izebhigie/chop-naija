import type { Origin } from "@/lib/types";
import { formatCoordinates, cx } from "@/lib/format";
import { Flag } from "./Flag";

/**
 * The origin line — the one element that appears under every dish in the app.
 *
 * A dish's name in its own language, the country it belongs to, and the real
 * coordinates of the city it comes from. A global recipe app is the only kind
 * that can say this, so it is worth saying everywhere.
 */
export function OriginLine({
  origin,
  countryName,
  iso2,
  localName,
  cuisineName,
  size = "md",
  className,
}: {
  origin: Origin;
  countryName: string;
  iso2: string;
  localName?: string;
  cuisineName?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const small = size === "sm";

  return (
    <div className={cx("border-t border-line pt-2.5", className)}>
      {localName ? (
        <p
          className={cx(
            "u-script text-muted leading-snug",
            small ? "text-[0.8125rem]" : "text-sm",
          )}
          lang="und"
        >
          {localName}
        </p>
      ) : null}

      <div
        className={cx(
          "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-forest",
          small ? "u-data-sm" : "u-data",
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <Flag iso2={iso2} title={countryName} className={small ? "h-2.5" : "h-3"} />
          {countryName}
        </span>
        <span aria-hidden="true" className="text-line">
          /
        </span>
        <span className="text-muted tabular-nums">
          {formatCoordinates(origin.lat, origin.lon)}
        </span>
        {cuisineName ? (
          <>
            <span aria-hidden="true" className="text-line">
              /
            </span>
            <span className="text-muted">{cuisineName}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
