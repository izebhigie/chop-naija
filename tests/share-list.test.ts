import { describe, expect, it } from "vitest";
import { decodeList, encodeList, ShareError, type SharedItem } from "@/lib/share-list";
import { recipeBySlug } from "@/data/recipes";

const sample: SharedItem[] = [
  { name: "Long-grain parboiled rice", qty: 500, unit: "g", aisle: "Pantry", sources: ["Jollof Rice"] },
  { name: "Crème fraîche", qty: 150, unit: "ml", aisle: "Dairy & eggs", sources: ["Pierogi"] },
  { name: "Kūmara", qty: 1000, unit: "g", aisle: "Produce", sources: ["Hāngī Lamb"] },
  { name: "Salt", qty: null, unit: "", aisle: "Spices", sources: ["Jollof Rice", "Pierogi"] },
  { name: "Kitchen roll", qty: null, unit: "", aisle: "Pantry", sources: [] },
];

/** Every ingredient line of a recipe, as it would sit on a shopping list. */
const listFor = (slug: string): SharedItem[] => {
  const recipe = recipeBySlug.get(slug)!;
  return recipe.ingredientGroups.flatMap((group) =>
    group.items.map((item) => ({
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      aisle: item.aisle,
      sources: [recipe.name],
    })),
  );
};

/** Builds a raw payload by hand, to feed the decoder things the encoder never makes. */
const rawPayload = (wire: unknown) =>
  `1j.${Buffer.from(JSON.stringify(wire)).toString("base64url")}`;

const problem = async (payload: string) => {
  try {
    await decodeList(payload);
    return "decoded";
  } catch (error) {
    return error instanceof ShareError ? error.problem : `threw ${String(error)}`;
  }
};

describe("sharing a list in a link", () => {
  it("survives the round trip, accents and all", async () => {
    expect(await decodeList(await encodeList(sample))).toEqual(sample);
  });

  it("round-trips without compression too, for browsers that lack it", async () => {
    const payload = await encodeList(sample, { compress: false });
    expect(payload.startsWith("1j.")).toBe(true);
    expect(await decodeList(payload)).toEqual(sample);
  });

  it("uses only characters that are safe in a URL", async () => {
    expect(await encodeList(sample)).toMatch(/^1d\.[A-Za-z0-9_-]+$/);
  });

  it("trims long scaled amounts rather than sending every decimal", async () => {
    const [item] = await decodeList(
      await encodeList([{ ...sample[0], qty: 333.3333333333 }]),
    );
    expect(item.qty).toBe(333.333);
  });

  it("keeps a real week's shopping short enough to send as a message", async () => {
    const week = [
      ...listFor("jollof-rice"),
      ...listFor("shoyu-ramen"),
      ...listFor("lamb-tagine"),
      ...listFor("butter-chicken"),
    ];
    const compressed = await encodeList(week);
    const plain = await encodeList(week, { compress: false });
    // Message apps and SMS gateways start mangling links somewhere past 2,000 characters.
    expect(compressed.length).toBeLessThan(2000);
    expect(compressed.length).toBeLessThan(plain.length);
  });
});

describe("a link is untrusted input", () => {
  it("rejects garbage", async () => {
    expect(await problem("hello")).toBe("damaged");
    expect(await problem("1d.not-really-deflate")).toBe("damaged");
  });

  it("rejects a link cut short by the app it was pasted through", async () => {
    const payload = await encodeList(listFor("lamb-tagine"));
    expect(await problem(payload.slice(0, Math.floor(payload.length * 0.6)))).toBe("damaged");
  });

  it("says a newer link is unsupported rather than damaged", async () => {
    expect(await problem("2d.AAAA")).toBe("unsupported");
    expect(await problem(rawPayload({ v: 2, r: [], i: [] }))).toBe("unsupported");
  });

  it("rejects every field that is out of bounds", async () => {
    const good = ["Onions", 2, "piece", 0, [0]];
    const wire = (item: unknown[]) => rawPayload({ v: 1, r: ["Jollof Rice"], i: [item] });

    expect(await problem(wire(good))).toBe("decoded");
    expect(await problem(wire(["", 2, "piece", 0, [0]]))).toBe("damaged");
    expect(await problem(wire(["x".repeat(121), 2, "piece", 0, [0]]))).toBe("damaged");
    expect(await problem(wire(["Onions", -2, "piece", 0, [0]]))).toBe("damaged");
    expect(await problem(wire(["Onions", "2", "piece", 0, [0]]))).toBe("damaged");
    expect(await problem(wire(["Onions", 2, "bucket", 0, [0]]))).toBe("damaged");
    expect(await problem(wire(["Onions", 2, "piece", 7, [0]]))).toBe("damaged");
    expect(await problem(wire(["Onions", 2, "piece", 0, [3]]))).toBe("damaged");
    expect(await problem(wire(["Onions", 2, "piece", 0]))).toBe("damaged");
    // A key that exists on every object is not a unit.
    expect(await problem(wire(["Onions", 2, "toString", 0, [0]]))).toBe("damaged");
  });

  it("refuses more items than any list needs", async () => {
    const item = ["Onions", 1, "piece", 0, []];
    expect(await problem(rawPayload({ v: 1, r: [], i: Array(301).fill(item) }))).toBe("too-large");
  });

  it("refuses a small link that inflates into megabytes", async () => {
    // A megabyte of spaces compresses to a few kilobytes: a classic decompression bomb.
    const bomb = new TextEncoder().encode(" ".repeat(1_000_000));
    const stream = new Blob([bomb]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    const payload = `1d.${Buffer.from(compressed).toString("base64url")}`;
    expect(payload.length).toBeLessThan(24_000);
    expect(await problem(payload)).toBe("too-large");
  });
});
