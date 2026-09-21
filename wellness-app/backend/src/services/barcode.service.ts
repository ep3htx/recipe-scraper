import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import type { Food, Supplement } from "@prisma/client";

// ---------------------------------------------------------------------------
// Barcode normalisation
// ---------------------------------------------------------------------------
// USB / Bluetooth scanners and manual typing produce UPC-A (12 digits),
// EAN-13, EAN-8 or GTIN-14 strings. The same physical product can be read as
// "012345678905" or "0012345678905", so everything is stored and matched as a
// zero-padded 14-digit GTIN.

const VALID_LENGTHS = new Set([8, 12, 13, 14]);

function hasValidCheckDigit(digits: string): boolean {
  const body = digits.slice(0, -1);
  const check = Number(digits[digits.length - 1]);
  let sum = 0;
  // Weights alternate 3,1,3,1... starting from the digit next to the check digit.
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === check;
}

/** Returns the zero-padded 14-digit GTIN, or throws a 400 for malformed input. */
export function normalizeBarcode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!VALID_LENGTHS.has(digits.length)) {
    throw AppError.badRequest("Barcode must be 8, 12, 13 or 14 digits (UPC/EAN)", "INVALID_BARCODE");
  }
  if (!hasValidCheckDigit(digits)) {
    throw AppError.badRequest("That barcode's check digit doesn't match — re-scan or re-type it", "INVALID_BARCODE");
  }
  return digits.padStart(14, "0");
}

// ---------------------------------------------------------------------------
// Open Food Facts lookup
// ---------------------------------------------------------------------------

export interface FoodCandidate {
  name: string;
  brand?: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number; // mg
}

export interface BarcodeLookupResult {
  code: string; // normalised GTIN-14
  found: boolean;
  source?: "local" | "openfoodfacts";
  kind?: "food" | "supplement";
  food?: Food;
  supplement?: Supplement;
  candidate?: FoodCandidate;
  lookupUnavailable?: boolean;
}

interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  categories_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
}

const OFF_TIMEOUT_MS = 6000;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function mapOffProduct(p: OffProduct): FoodCandidate | null {
  const name = p.product_name?.trim();
  if (!name) return null;
  const n = p.nutriments ?? {};
  const num = (key: string): number | undefined => {
    const v = n[key];
    if (v === undefined || v === "") return undefined;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  // Prefer the label's per-serving numbers; otherwise scale per-100g values to
  // the serving weight when known, or fall back to a 100 g "serving".
  const hasServing = num("energy-kcal_serving") !== undefined || num("energy_serving") !== undefined;
  const servingGrams = Number(p.serving_quantity) || undefined;
  let suffix: "_serving" | "_100g" = hasServing ? "_serving" : "_100g";
  let factor = 1;
  let servingSize = p.serving_size?.trim() || "1 serving";
  if (!hasServing) {
    if (servingGrams) {
      factor = servingGrams / 100;
      servingSize = p.serving_size?.trim() || `${servingGrams} g`;
    } else {
      servingSize = "100 g";
    }
  }
  const val = (key: string) => {
    const v = num(`${key}${suffix}`);
    return v === undefined ? undefined : v * factor;
  };

  let calories = val("energy-kcal");
  if (calories === undefined) {
    const kj = val("energy");
    calories = kj === undefined ? 0 : kj / 4.184;
  }
  // OFF reports sodium/salt in grams; the app tracks sodium in mg.
  let sodiumG = val("sodium");
  if (sodiumG === undefined) {
    const salt = val("salt");
    if (salt !== undefined) sodiumG = salt / 2.5;
  }
  const fiber = val("fiber");

  return {
    name,
    brand: p.brands?.split(",")[0]?.trim() || undefined,
    servingSize,
    calories: Math.round(calories),
    protein: round1(val("proteins") ?? 0),
    carbs: round1(val("carbohydrates") ?? 0),
    fat: round1(val("fat") ?? 0),
    fiber: fiber === undefined ? undefined : round1(fiber),
    sodium: sodiumG === undefined ? undefined : Math.round(sodiumG * 1000),
  };
}

async function fetchOpenFoodFacts(gtin14: string): Promise<{ candidate: FoodCandidate; isSupplement: boolean } | null> {
  // OFF stores UPC-A as EAN-13 (one leading zero); drop the GTIN-14 padding.
  const code = gtin14.startsWith("0") ? gtin14.slice(1) : gtin14;
  const fields = "product_name,brands,serving_size,serving_quantity,nutriments,categories_tags";
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "WellnessDashboard/1.0 (self-hosted, personal use)" },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Open Food Facts responded ${res.status}`);
    const body = (await res.json()) as { status?: number; product?: OffProduct };
    if (body.status !== 1 || !body.product) return null;
    const candidate = mapOffProduct(body.product);
    if (!candidate) return null;
    const isSupplement = (body.product.categories_tags ?? []).some((t) => t.includes("dietary-supplement"));
    return { candidate, isSupplement };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Lookup: the user's own library first (instant, works offline), then OFF.
// ---------------------------------------------------------------------------

export async function lookupBarcode(userId: string, rawCode: string): Promise<BarcodeLookupResult> {
  const code = normalizeBarcode(rawCode);

  const supplement = await prisma.supplement.findFirst({ where: { userId, barcode: code } });
  if (supplement) return { code, found: true, source: "local", kind: "supplement", supplement };

  const food = await prisma.food.findFirst({ where: { OR: [{ userId }, { userId: null }], barcode: code } });
  if (food) return { code, found: true, source: "local", kind: "food", food };

  try {
    const off = await fetchOpenFoodFacts(code);
    if (off) {
      return { code, found: true, source: "openfoodfacts", kind: off.isSupplement ? "supplement" : "food", candidate: off.candidate };
    }
    return { code, found: false };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Open Food Facts lookup failed:", err instanceof Error ? err.message : err);
    return { code, found: false, lookupUnavailable: true };
  }
}
