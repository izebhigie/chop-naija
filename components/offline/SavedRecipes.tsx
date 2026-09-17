"use client";

import { useEffect, useState } from "react";
import { WifiOff, ArrowRight } from "lucide-react";

export interface CatalogueEntry {
  slug: string;
  name: string;
  country: string;
}

interface DeviceState {
  /** Recipes with a saved copy on this device. Null while the cache is being read. */
  saved: CatalogueEntry[] | null;
  /** The page asked for, when the service worker redirected here from it. */
  from: string | null;
  supported: boolean;
}

/**
 * Lists the recipes that will open with no connection, read from the service
 * worker's own cache — so the list is exactly what is on this device, not a
 * guess at it.
 *
 * Links are plain anchors on purpose. A client-side navigation would first
 * fetch an RSC payload, which fails offline; a full navigation goes straight
 * to the service worker and its saved copy.
 */
export function SavedRecipes({ catalogue }: { catalogue: CatalogueEntry[] }) {
  const [state, setState] = useState<DeviceState>({ saved: null, from: null, supported: true });

  useEffect(() => {
    async function read(): Promise<DeviceState> {
      const raw = new URLSearchParams(window.location.search).get("from");
      // Only a path on this site; never echo an arbitrary URL back as a link.
      const from = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;

      if (!("caches" in window)) return { saved: [], from, supported: false };

      const slugs = new Set<string>();
      for (const name of await caches.keys()) {
        if (!name.startsWith("wp-pages-")) continue;
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          const match = new URL(request.url).pathname.match(/^\/recipes\/([a-z0-9-]+)$/);
          if (match) slugs.add(match[1]);
        }
      }
      return { saved: catalogue.filter((entry) => slugs.has(entry.slug)), from, supported: true };
    }

    void read()
      .then(setState)
      .catch(() => setState({ saved: [], from: null, supported: false }));
  }, [catalogue]);

  const { saved, from, supported } = state;

  // Name the dish when the missing page was a recipe; a path is a poor stand-in for "Moussaka".
  const wanted = from
    ? catalogue.find((entry) => from.split("?")[0] === `/recipes/${entry.slug}`)
    : undefined;

  return (
    <div className="mt-10 max-w-3xl">
      {from ? (
        <div className="flex gap-3 rounded-[var(--radius-card)] bg-cream-deep p-5">
          <WifiOff aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-forest" />
          <div>
            <p className="font-semibold text-ink">
              You&rsquo;re offline, and {wanted ? wanted.name : "that page"} isn&rsquo;t saved on
              this device yet.
            </p>
            <p className="mt-1 text-[0.9375rem] text-muted">
              {wanted ? "It" : <span className="u-data-sm break-all">{from}</span>} will open once
              you&rsquo;re back online.{" "}
              <a href={from} className="font-semibold text-forest underline underline-offset-4">
                Try again
              </a>
            </p>
          </div>
        </div>
      ) : null}

      <h2 className="u-data mt-10 text-forest">Ready without a connection</h2>

      {saved === null ? (
        <p className="mt-4 text-[0.9375rem] text-muted">Checking this device&hellip;</p>
      ) : !supported ? (
        <p className="mt-4 text-[0.9375rem] text-muted">
          This browser doesn&rsquo;t allow pages to be saved for offline use, so recipes need a
          connection here.
        </p>
      ) : saved.length === 0 ? (
        <p className="mt-4 text-[0.9375rem] text-muted">
          Nothing saved yet. Open a recipe while you&rsquo;re online and it will be kept here,
          ready for when the connection drops.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line-soft rounded-[var(--radius-card)] bg-paper ring-1 ring-line-soft">
          {saved.map((entry) => (
            <li key={entry.slug}>
              <a
                href={`/recipes/${entry.slug}`}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-cream"
              >
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-tight text-ink">
                    {entry.name}
                  </span>
                  <span className="u-data-sm text-muted">{entry.country}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-forest transition-transform group-hover:translate-x-0.5"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
