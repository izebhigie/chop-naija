"use client";

import Image from "next/image";
import { useState } from "react";
import type { ImageCredit } from "@/lib/types";
import { cx } from "@/lib/format";

/**
 * Every photograph in the app goes through here.
 *
 * The frame has a fixed aspect ratio, so the layout never shifts as images
 * arrive. A blurred 16px preview holds the space in the meantime. If a file
 * ever fails to load, an on-brand tile takes its place — the one thing that
 * should never appear is a broken image icon.
 */
export function FoodImage({
  image,
  alt,
  sizes,
  ratio = "4 / 3",
  priority = false,
  quality,
  className,
  imageClassName,
}: {
  image: ImageCredit;
  alt: string;
  sizes: string;
  ratio?: string;
  priority?: boolean;
  quality?: number;
  className?: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={cx("u-frame", className)} style={{ aspectRatio: ratio }}>
      {failed ? (
        <div
          className="flex h-full w-full items-center justify-center bg-forest-wash"
          role="img"
          aria-label={alt}
        >
          <span className="font-display text-3xl text-forest/40">{alt.charAt(0)}</span>
        </div>
      ) : (
        <Image
          src={image.src}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder="blur"
          blurDataURL={image.blurDataURL}
          onError={() => setFailed(true)}
          className={cx("object-cover", imageClassName)}
        />
      )}
    </div>
  );
}
