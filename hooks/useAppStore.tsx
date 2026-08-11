"use client";

import { useCallback, useSyncExternalStore } from "react";
import type {
  Collection,
  MealSlot,
  PlannedMeal,
  Recipe,
  ShoppingItem,
  Unit,
} from "@/lib/types";
import { scaleQuantity } from "@/lib/units";

/**
 * Saved state for a guest: favorites, collections, the shopping list and the
 * week's meal plan, all persisted to localStorage.
 *
 * localStorage is an external store, so it is read through
 * useSyncExternalStore rather than copied into state inside an effect. React
 * renders the server snapshot (empty, `hydrated: false`) while hydrating and
 * swaps to the real one immediately after, which keeps the server and client
 * markup identical without a manual hydration flag. Components read
 * `hydrated` to show a skeleton rather than briefly claiming you have nothing
 * saved.
 */

const KEY = "worldplates:v1";

interface StoredState {
  favorites: string[];
  collections: Collection[];
  shopping: ShoppingItem[];
  plan: PlannedMeal[];
}

export interface StoreSnapshot extends StoredState {
  hydrated: boolean;
}

const EMPTY: StoredState = { favorites: [], collections: [], shopping: [], plan: [] };

/** Stable object identity matters: getSnapshot must not allocate each call. */
const SERVER_SNAPSHOT: StoreSnapshot = { ...EMPTY, hydrated: false };

function readStored(): StoredState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      collections: Array.isArray(parsed.collections) ? parsed.collections : [],
      shopping: Array.isArray(parsed.shopping) ? parsed.shopping : [],
      plan: Array.isArray(parsed.plan) ? parsed.plan : [],
    };
  } catch {
    // Corrupt or unreadable storage should never take the app down.
    return EMPTY;
  }
}

let snapshot: StoreSnapshot =
  typeof window === "undefined" ? SERVER_SNAPSHOT : { ...readStored(), hydrated: true };

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => SERVER_SNAPSHOT;

/** Applies a change, persists it, and tells every subscriber. */
function update(change: (current: StoredState) => StoredState) {
  const next = change(snapshot);
  snapshot = { ...next, hydrated: true };
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        favorites: next.favorites,
        collections: next.collections,
        shopping: next.shopping,
        plan: next.plan,
      }),
    );
  } catch {
    // Private browsing or a full quota — the app keeps working in memory.
  }
  emit();
}

// Keep two open tabs in step.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    snapshot = { ...readStored(), hydrated: true };
    emit();
  });
}

/* ------------------------------------------------------------ helpers */

/** Ingredients merge on name + unit, so two recipes wanting onions make one line. */
function mergeKey(name: string, unit: Unit): string {
  return `${name.trim().toLowerCase()}|${unit}`;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/* -------------------------------------------------------------- actions */

const toggleFavorite = (slug: string) =>
  update((current) => ({
    ...current,
    favorites: current.favorites.includes(slug)
      ? current.favorites.filter((item) => item !== slug)
      : [slug, ...current.favorites],
  }));

const removeFavorite = (slug: string) =>
  update((current) => ({
    ...current,
    favorites: current.favorites.filter((item) => item !== slug),
    collections: current.collections.map((collection) => ({
      ...collection,
      recipeSlugs: collection.recipeSlugs.filter((item) => item !== slug),
    })),
  }));

const createCollection = (name: string) => {
  const id = makeId("col");
  update((current) => ({
    ...current,
    collections: [...current.collections, { id, name, recipeSlugs: [] }],
  }));
  return id;
};

const deleteCollection = (id: string) =>
  update((current) => ({
    ...current,
    collections: current.collections.filter((collection) => collection.id !== id),
  }));

const toggleInCollection = (collectionId: string, slug: string) =>
  update((current) => ({
    ...current,
    collections: current.collections.map((collection) =>
      collection.id !== collectionId
        ? collection
        : {
            ...collection,
            recipeSlugs: collection.recipeSlugs.includes(slug)
              ? collection.recipeSlugs.filter((item) => item !== slug)
              : [...collection.recipeSlugs, slug],
          },
    ),
  }));

function addRecipeToList(recipe: Recipe, servings?: number): number {
  const target = servings ?? recipe.servings;
  const incoming = recipe.ingredientGroups.flatMap((group) => group.items);

  update((current) => {
    const next = [...current.shopping];
    for (const item of incoming) {
      const qty = scaleQuantity(item.qty, recipe.servings, target);
      const key = mergeKey(item.name, item.unit);
      const existing = next.findIndex(
        (line) => !line.custom && mergeKey(line.name, line.unit) === key,
      );

      if (existing >= 0) {
        const line = next[existing];
        next[existing] = {
          ...line,
          // "To taste" amounts stay unquantified however many recipes ask for them.
          qty: line.qty === null || qty === null ? null : line.qty + qty,
          sources: line.sources.includes(recipe.name)
            ? line.sources
            : [...line.sources, recipe.name],
        };
      } else {
        next.push({
          id: makeId("item"),
          name: item.name,
          qty,
          unit: item.unit,
          aisle: item.aisle,
          checked: false,
          sources: [recipe.name],
        });
      }
    }
    return { ...current, shopping: next };
  });

  return incoming.length;
}

const addCustomItem = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return;
  update((current) => ({
    ...current,
    shopping: [
      ...current.shopping,
      {
        id: makeId("item"),
        name: trimmed,
        qty: null,
        unit: "" as Unit,
        aisle: "Pantry",
        checked: false,
        sources: [],
        custom: true,
      },
    ],
  }));
};

const toggleItem = (id: string) =>
  update((current) => ({
    ...current,
    shopping: current.shopping.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    ),
  }));

const renameItem = (id: string, name: string) =>
  update((current) => ({
    ...current,
    shopping: current.shopping.map((item) => (item.id === id ? { ...item, name } : item)),
  }));

const removeItem = (id: string) =>
  update((current) => ({
    ...current,
    shopping: current.shopping.filter((item) => item.id !== id),
  }));

const clearChecked = () =>
  update((current) => ({
    ...current,
    shopping: current.shopping.filter((item) => !item.checked),
  }));

const clearList = () => update((current) => ({ ...current, shopping: [] }));

const addMeal = (day: number, slot: MealSlot, recipeSlug: string, servings: number) =>
  update((current) => ({
    ...current,
    plan: [...current.plan, { id: makeId("meal"), day, slot, recipeSlug, servings }],
  }));

const updateMeal = (id: string, patch: Partial<Omit<PlannedMeal, "id">>) =>
  update((current) => ({
    ...current,
    plan: current.plan.map((meal) => (meal.id === id ? { ...meal, ...patch } : meal)),
  }));

const removeMeal = (id: string) =>
  update((current) => ({
    ...current,
    plan: current.plan.filter((meal) => meal.id !== id),
  }));

const clearPlan = () => update((current) => ({ ...current, plan: [] }));

/* ---------------------------------------------------------------- hook */

export function useAppStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFavorite = useCallback(
    (slug: string) => state.favorites.includes(slug),
    [state.favorites],
  );

  return {
    ...state,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    createCollection,
    deleteCollection,
    toggleInCollection,
    addRecipeToList,
    addCustomItem,
    toggleItem,
    renameItem,
    removeItem,
    clearChecked,
    clearList,
    addMeal,
    updateMeal,
    removeMeal,
    clearPlan,
  };
}
