import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments serve the whole site on a throwaway domain; indexing
  // them would duplicate every page in search and compete with production.
  if (!isIndexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The API routes back the search box and the discovery grid — they
      // return JSON, and the pages that use them are already listed.
      // The three kitchen pages read device-local storage, so a crawler
      // only ever sees an empty state.
      disallow: ["/api/", "/favorites", "/shopping-list", "/meal-planner", "/offline"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
