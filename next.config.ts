import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Dish photography is served from /public/dishes, so no remote hosts are
    // needed. Next still resizes and re-encodes these at request time.
    formats: ["image/avif", "image/webp"],
    // Next 16 narrowed the default to [75]; the hero is worth a little more.
    qualities: [75, 90],
  },
  async headers() {
    return [
      {
        // The worker decides what every other file's freshness means, so it
        // must never be served stale itself — a cached old worker keeps
        // serving old pages after a deploy.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
