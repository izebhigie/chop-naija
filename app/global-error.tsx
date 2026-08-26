"use client";

import { useEffect } from "react";

/**
 * The floor beneath the floor. A global error means the root layout itself
 * failed, so this replaces it entirely — no header, no footer, and no
 * guarantee that the stylesheet or the webfonts ever loaded. Everything here
 * is therefore inline and self-contained, using the palette literally rather
 * than through the design tokens it cannot count on.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          backgroundColor: "#faf6ee",
          color: "#1b211d",
          fontFamily:
            "Manrope, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            width="36"
            height="36"
            fill="none"
            stroke="#0f3d2e"
          >
            <circle cx="16" cy="16" r="14" strokeWidth="1.75" />
            <circle cx="16" cy="16" r="7.5" strokeWidth="1.25" />
            <path d="M16 2c3.6 4 5.4 8.6 5.4 14S19.6 26 16 30" strokeWidth="1.25" opacity="0.75" />
            <path d="M16 2c-3.6 4-5.4 8.6-5.4 14S12.4 26 16 30" strokeWidth="1.25" opacity="0.75" />
            <path d="M2.6 11.5h26.8M2.6 20.5h26.8" strokeWidth="1.25" opacity="0.45" />
          </svg>

          <h1
            style={{
              margin: "1.5rem 0 0",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 400,
              lineHeight: 1.15,
              fontFamily: "'DM Serif Display', Georgia, 'Times New Roman', serif",
            }}
          >
            WorldPlates could not start
          </h1>

          <p style={{ margin: "1rem 0 0", fontSize: "1.0625rem", color: "#6b7269" }}>
            Something failed before the page could be built. Reloading usually clears it.
          </p>

          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={reset}
              style={{
                font: "inherit",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                borderRadius: "999px",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#0f3d2e",
                color: "#faf6ee",
              }}
            >
              Reload the page
            </button>
            {/*
              A real navigation, not next/link. A global error means the root
              layout failed, so the router is exactly the thing that cannot be
              trusted to get anyone out of here.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                font: "inherit",
                fontWeight: 600,
                textDecoration: "none",
                borderRadius: "999px",
                padding: "0.75rem 1.5rem",
                border: "1px solid #e4dbc9",
                backgroundColor: "#ffffff",
                color: "#1b211d",
              }}
            >
              Home page
            </a>
          </div>

          {error.digest ? (
            <p
              style={{
                margin: "2.5rem 0 0",
                paddingTop: "1.5rem",
                borderTop: "1px solid #e4dbc9",
                fontSize: "0.875rem",
                color: "#6b7269",
              }}
            >
              Reference{" "}
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
                  color: "#1b211d",
                }}
              >
                {error.digest}
              </span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
