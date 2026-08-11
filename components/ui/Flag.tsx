import { flagSrc, cx } from "@/lib/format";

/**
 * Country flags ship as local SVGs rather than emoji: Windows renders flag
 * emoji as bare letter pairs ("NG"), so an emoji flag would simply not be a
 * flag for a large share of visitors.
 */
export function Flag({
  iso2,
  title,
  className,
}: {
  iso2: string;
  title: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a 1KB local SVG needs no optimiser
    <img
      src={flagSrc(iso2)}
      alt=""
      aria-hidden="true"
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      title={title}
      className={cx(
        "inline-block w-auto rounded-[2px] object-cover ring-1 ring-black/10",
        className ?? "h-3",
      )}
    />
  );
}
