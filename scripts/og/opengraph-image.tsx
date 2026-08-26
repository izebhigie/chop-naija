import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { recipes } from "@/data/recipes";
import { countries } from "@/data/countries";
import { regions } from "@/data/regions";

export const alt =
  "WorldPlates — discover the world, one dish at a time. Recipes from 29 countries across 8 regions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card people see when a link is shared.
 *
 * It repeats the origin line — serif title, hairline, the figures in mono —
 * because that device is what the whole app looks like, and a preview card
 * that looks like the site is doing its job. The counts come from the data so
 * they cannot drift out of date.
 *
 * Fonts are read from `assets/` rather than fetched: Satori needs the real
 * files, and a build that depends on a font CDN staying up is a build that
 * eventually fails for no good reason.
 */
export default async function OpengraphImage() {
  const [serif, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets", "DMSerifDisplay-Regular.ttf")),
    readFile(join(process.cwd(), "assets", "IBMPlexMono-Medium.ttf")),
  ]);

  const figures = [
    `${recipes.length} recipes`,
    `${countries.length} countries`,
    `${regions.length} regions`,
  ].join("   ·   ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#faf6ee",
          color: "#1b211d",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg viewBox="0 0 32 32" width="44" height="44" fill="none" stroke="#0f3d2e">
            <circle cx="16" cy="16" r="14" strokeWidth="1.75" />
            <circle cx="16" cy="16" r="7.5" strokeWidth="1.25" />
            <path d="M16 2c3.6 4 5.4 8.6 5.4 14S19.6 26 16 30" strokeWidth="1.25" opacity="0.75" />
            <path d="M16 2c-3.6 4-5.4 8.6-5.4 14S12.4 26 16 30" strokeWidth="1.25" opacity="0.75" />
            <path d="M2.6 11.5h26.8M2.6 20.5h26.8" strokeWidth="1.25" opacity="0.45" />
          </svg>
          <span style={{ fontFamily: "DM Serif Display", fontSize: 34 }}>WorldPlates</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "DM Serif Display",
              fontSize: 82,
              lineHeight: 1.06,
              letterSpacing: "-0.015em",
              maxWidth: 880,
            }}
          >
            Discover the world, one dish at a time.
          </div>

          {/* The origin-line device: a hairline with the data hung beneath it. */}
          <div style={{ display: "flex", height: 1, backgroundColor: "#e4dbc9", marginTop: 44 }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 22,
              fontFamily: "IBM Plex Mono",
              fontSize: 21,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#0f3d2e",
            }}
          >
            <span>{figures}</span>
            <span style={{ color: "#6b7269" }}>Ìrẹsì Jollof · 6.52°N 3.38°E</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Serif Display", data: serif, weight: 400, style: "normal" },
        { name: "IBM Plex Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
