import type { Region } from "@/lib/types";

/**
 * The eight regions the catalogue is organized by. On the home page these are
 * laid out by how many recipes each actually holds, so the shape of the
 * collection is visible before you click anything.
 */
export const regions: Region[] = [
  {
    slug: "asia",
    name: "Asia",
    blurb:
      "Broth simmered for a day, rice cooked to the grain, and heat balanced against sour and sweet.",
    imageRecipeSlug: "shoyu-ramen",
  },
  {
    slug: "europe",
    name: "Europe",
    blurb:
      "Slow technique and short ingredient lists — the flavor comes from patience and good butter.",
    imageRecipeSlug: "risotto-alla-milanese",
  },
  {
    slug: "africa",
    name: "Africa",
    blurb:
      "One pot, deep spice, and a smoky base built before anything else goes in.",
    imageRecipeSlug: "jollof-rice",
  },
  {
    slug: "middle-east",
    name: "Middle East",
    blurb:
      "Table food. Bread, herbs, sesame and pomegranate, laid out to be shared.",
    imageRecipeSlug: "shakshuka",
  },
  {
    slug: "north-america",
    name: "North America",
    blurb:
      "Griddles, smoke and roux — cooking shaped by everyone who arrived and stayed.",
    imageRecipeSlug: "tacos-al-pastor",
  },
  {
    slug: "south-america",
    name: "South America",
    blurb:
      "Maize, beans and citrus. Dishes that feed a table of twelve without ceremony.",
    imageRecipeSlug: "feijoada",
  },
  {
    slug: "caribbean",
    name: "Caribbean",
    blurb:
      "Allspice, scotch bonnet and slow fire, cooked over wood wherever possible.",
    imageRecipeSlug: "jerk-chicken",
  },
  {
    slug: "oceania",
    name: "Oceania",
    blurb:
      "Earth ovens, cream and stone fruit — cooking built around gathering outdoors.",
    imageRecipeSlug: "pavlova",
  },
];

export const regionBySlug = new Map(regions.map((r) => [r.slug, r]));
