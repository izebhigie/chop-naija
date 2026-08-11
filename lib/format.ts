import type { Origin } from "./types";

/**
 * The origin line is the app's signature: every dish carries the coordinates
 * of the city it comes from. These helpers keep that formatting identical
 * everywhere it appears.
 */

export function formatLatitude(lat: number): string {
  const hemisphere = lat >= 0 ? "N" : "S";
  return `${Math.abs(lat).toFixed(2)}°${hemisphere}`;
}

export function formatLongitude(lon: number): string {
  const hemisphere = lon >= 0 ? "E" : "W";
  return `${Math.abs(lon).toFixed(2)}°${hemisphere}`;
}

export function formatCoordinates(lat: number, lon: number): string {
  return `${formatLatitude(lat)} ${formatLongitude(lon)}`;
}

export function formatOrigin(origin: Origin): string {
  return `${origin.city} · ${formatCoordinates(origin.lat, origin.lon)}`;
}

/** Flags ship as local SVGs — Windows renders flag emoji as bare letter pairs. */
export function flagSrc(iso2: string): string {
  return `/flags/${iso2.toLowerCase()}.svg`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Joins with commas and a final "and". */
export function listToSentence(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/** Initials for a reviewer avatar, from a display name. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
