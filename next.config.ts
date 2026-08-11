import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Dish photography is served from /public/dishes, so no remote hosts are
    // needed. Next still resizes and re-encodes these at request time.
    formats: ["image/avif", "image/webp"],
    // Next 16 narrowed the default to [75]; the hero is worth a little more.
    qualities: [75, 90],
  },
};

export default nextConfig;
