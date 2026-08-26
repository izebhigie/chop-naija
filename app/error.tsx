"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/primitives";

/**
 * The last thing between a thrown render error and a blank page.
 *
 * It sits inside the root layout, so the header, the footer and a way back
 * into the catalogue all survive. `reset` re-renders the segment, which is
 * genuinely worth offering — a failed data read often succeeds on a retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production the message is stripped before it reaches the browser and
    // only `digest` survives, which is the handle for finding it in the logs.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="u-shell py-16">
      <div className="max-w-2xl">
        <p className="u-data text-tomato">Something went wrong</p>
        <h1 className="mt-4 text-[length:var(--text-display-lg)]">
          This page could not be served
        </h1>
        <p className="mt-4 text-[1.0625rem] text-muted">
          The error is on our side, not yours. Trying again often works — if it does not, the
          rest of the site is still fine.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/recipes" variant="secondary">
            Browse all recipes
          </ButtonLink>
        </div>

        {error.digest ? (
          <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
            If you report this, quote the reference{" "}
            <span className="u-data-sm text-ink">{error.digest}</span> — it points at this exact
            failure in the logs.
          </p>
        ) : null}

        <p className="mt-6 text-sm text-muted">
          Anything you had saved — favorites, the shopping list, the meal plan — is stored on this
          device and is unaffected.{" "}
          <Link href="/" className="text-forest underline underline-offset-4">
            Back to the home page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
