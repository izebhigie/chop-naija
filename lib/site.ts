/**
 * Where this deployment actually lives.
 *
 * Canonical URLs, sitemap entries and Open Graph images all have to be
 * absolute, and they have to name the production domain rather than whichever
 * host happened to answer the request. Vercel supplies both:
 * `VERCEL_PROJECT_PRODUCTION_URL` is the stable production host and
 * `VERCEL_URL` is the throwaway per-deployment one, so a preview build
 * describes itself and a production build describes production.
 *
 * Set `NEXT_PUBLIC_SITE_URL` to override everything once a custom domain is
 * attached — that is the only value that needs configuring by hand.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(
      explicit.startsWith("http") ? explicit : `https://${explicit}`,
    );
  }

  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  if (host) return `https://${host}`;

  return "http://localhost:3000";
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const siteUrl = resolveSiteUrl();

/**
 * Preview deployments serve the whole catalogue on a throwaway domain. Letting
 * a crawler index that duplicates every page in search results and competes
 * with production, so previews say no. An unset `VERCEL_ENV` means a local or
 * self-hosted build, which is assumed to be the real thing.
 */
export const isIndexable =
  process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === "production";

/** Absolute URL for a path — sitemap entries and JSON-LD both need these. */
export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
