import type { Aisle, Unit } from "./types";

/**
 * A shopping list that travels inside a link.
 *
 * There is no backend, so a list cannot be sent to anyone — but it can ride
 * in the URL fragment. The fragment never leaves the browser: it is not sent
 * with the request, so nothing is uploaded, logged or stored anywhere but the
 * two devices.
 *
 * A link is untrusted input the moment it is pasted, so decoding validates
 * every field and caps every size rather than trusting what it is handed.
 */

export interface SharedItem {
  name: string;
  /** null means an unquantified line — "to taste", or something added by hand. */
  qty: number | null;
  unit: Unit;
  aisle: Aisle;
  /** The recipes this line was for. Empty for things added by hand. */
  sources: string[];
}

export type ShareProblem = "damaged" | "unsupported" | "too-large";

export class ShareError extends Error {
  constructor(readonly problem: ShareProblem) {
    super(problem);
    this.name = "ShareError";
  }
}

/* Exhaustive by construction: adding a unit or aisle to the types fails to compile here. */
const UNITS: Record<Unit, true> = {
  g: true, kg: true, ml: true, l: true, tsp: true, tbsp: true, piece: true, clove: true,
  pinch: true, bunch: true, can: true, sheet: true, handful: true, "": true,
};
const AISLE_SET: Record<Aisle, true> = {
  Produce: true, "Meat & fish": true, "Dairy & eggs": true, Bakery: true, Frozen: true,
  Pantry: true, Spices: true,
};
/** Order is part of the wire format — aisles travel as indexes. Append only. */
const AISLES = Object.keys(AISLE_SET) as Aisle[];

const VERSION = 1;
export const LIMITS = {
  items: 300,
  recipes: 60,
  text: 120,
  /** Characters in the link payload itself. */
  payload: 24_000,
  /** Bytes after decompression, so a tiny link cannot inflate into megabytes. */
  inflated: 256_000,
} as const;

type WireItem = [name: string, qty: number | null, unit: Unit, aisle: number, sources: number[]];
interface Wire {
  v: number;
  r: string[];
  i: WireItem[];
}

/* ------------------------------------------------------------------ encode */

export async function encodeList(
  items: SharedItem[],
  { compress = true }: { compress?: boolean } = {},
): Promise<string> {
  // Recipe names repeat across lines; send each once and refer to it by index.
  const recipes: string[] = [];
  const recipeIndex = (name: string) => {
    let index = recipes.indexOf(name);
    if (index < 0) index = recipes.push(name) - 1;
    return index;
  };

  const wire: Wire = {
    v: VERSION,
    r: recipes,
    i: items.map((item) => [
      item.name,
      // Scaled amounts carry long tails like 333.33333; a gram's thousandth is plenty.
      item.qty === null ? null : Math.round(item.qty * 1000) / 1000,
      item.unit,
      AISLES.indexOf(item.aisle),
      item.sources.map(recipeIndex),
    ]),
  };

  const bytes = new TextEncoder().encode(JSON.stringify(wire));
  const canCompress = compress && typeof CompressionStream !== "undefined";
  const body = canCompress ? await pipe(bytes, new CompressionStream("deflate-raw")) : bytes;
  return `${VERSION}${canCompress ? "d" : "j"}.${toBase64Url(body)}`;
}

/* ------------------------------------------------------------------ decode */

export async function decodeList(payload: string): Promise<SharedItem[]> {
  const trimmed = payload.trim();
  if (trimmed.length > LIMITS.payload) throw new ShareError("too-large");

  const match = trimmed.match(/^(\d+)([dj])\.([A-Za-z0-9_-]+)$/);
  if (!match) throw new ShareError("damaged");
  if (Number(match[1]) !== VERSION) throw new ShareError("unsupported");

  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(match[3]);
  } catch {
    throw new ShareError("damaged");
  }

  if (match[2] === "d") {
    if (typeof DecompressionStream === "undefined") throw new ShareError("unsupported");
    bytes = await pipe(bytes, new DecompressionStream("deflate-raw"), LIMITS.inflated);
  } else if (bytes.length > LIMITS.inflated) {
    throw new ShareError("too-large");
  }

  let wire: unknown;
  try {
    wire = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ShareError("damaged");
  }
  return validate(wire);
}

function validate(wire: unknown): SharedItem[] {
  if (!isObject(wire)) throw new ShareError("damaged");
  if (wire.v !== VERSION) throw new ShareError("unsupported");

  const { r, i } = wire;
  if (!Array.isArray(r) || !Array.isArray(i)) throw new ShareError("damaged");
  if (r.length > LIMITS.recipes || i.length > LIMITS.items) throw new ShareError("too-large");

  const recipes = r.map((name) => {
    if (!isText(name)) throw new ShareError("damaged");
    return name.trim();
  });

  return i.map((entry): SharedItem => {
    if (!Array.isArray(entry) || entry.length !== 5) throw new ShareError("damaged");
    const [name, qty, unit, aisle, sources] = entry as unknown[];

    if (!isText(name)) throw new ShareError("damaged");
    const amountOk =
      qty === null || (typeof qty === "number" && Number.isFinite(qty) && qty > 0 && qty <= 1_000_000);
    if (!amountOk) throw new ShareError("damaged");
    if (typeof unit !== "string" || !Object.hasOwn(UNITS, unit)) throw new ShareError("damaged");
    if (!Number.isInteger(aisle) || (aisle as number) < 0 || (aisle as number) >= AISLES.length) {
      throw new ShareError("damaged");
    }
    if (!Array.isArray(sources) || sources.length > LIMITS.recipes) throw new ShareError("damaged");
    const names = sources.map((index) => {
      if (!Number.isInteger(index) || index < 0 || index >= recipes.length) {
        throw new ShareError("damaged");
      }
      return recipes[index];
    });

    return {
      name: name.trim(),
      qty: qty as number | null,
      unit: unit as Unit,
      aisle: AISLES[aisle as number],
      sources: [...new Set(names)],
    };
  });
}

/* ----------------------------------------------------------------- helpers */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= LIMITS.text;
}

/** Runs bytes through a compression stream, stopping early past `limit` bytes. */
async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  limit = Infinity,
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Bad input surfaces as a rejected read below; these would otherwise be unhandled.
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => undefined);
  writer.close().catch(() => undefined);

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new ShareError("too-large");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ShareError) throw error;
    throw new ShareError("damaged");
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
