"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Registers the service worker and tells it which pages to keep.
 *
 * The worker saves pages as they are requested, but most visits reach a
 * recipe through a soft navigation, which fetches an RSC payload rather than
 * the page itself. So on every route change the app asks the worker to save
 * the page it is now showing. The first message also carries the resources
 * the page loaded before the worker was in control of it.
 *
 * Production only. In development the worker would serve stale chunks to the
 * dev server, so any registration left over from a production run is removed.
 */
export function OfflineSupport() {
  const pathname = usePathname();
  const ready = useRef<Promise<ServiceWorkerRegistration> | null>(null);
  const reported = useRef(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => void r.unregister()));
      return;
    }

    ready.current = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready);
  }, []);

  useEffect(() => {
    const registered = ready.current;
    if (!registered) return;

    void registered
      .then((registration) => {
        const entries = performance.getEntriesByType("resource");
        const resources = entries
          .slice(reported.current)
          .map((entry) => entry.name)
          .filter((name) => name.startsWith(window.location.origin));
        reported.current = entries.length;

        registration.active?.postMessage({
          type: "SAVE_PAGE",
          url: window.location.pathname + window.location.search,
          resources,
        });
      })
      .catch(() => {
        // Registration failed (private mode, storage blocked): the app still works online.
      });
  }, [pathname]);

  return null;
}
