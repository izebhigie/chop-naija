import type { ImageCredit } from "@/lib/types";
import manifest from "../images.generated.json";

const images = manifest as Record<string, ImageCredit>;

/**
 * Looks up a dish photograph by slug. Throws at build time rather than
 * rendering a gap, so a missing image can never reach a page.
 */
export function img(slug: string): ImageCredit {
  const found = images[slug];
  if (!found) {
    throw new Error(
      `No photograph for "${slug}". Run: node scripts/fetch-images.mjs`,
    );
  }
  return found;
}
