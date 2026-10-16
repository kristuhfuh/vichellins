import type { Condition, ShopQuery, Sort } from "./types";

type RawParams = Record<string, string | string[] | undefined>;

const SORTS: Sort[] = ["featured", "newest", "price-asc", "price-desc", "popular"];
const CONDITIONS: Condition[] = ["new", "refurbished", "used"];

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function num(value: string | string[] | undefined): number | undefined {
  const n = Number(list(value)[0]);
  return Number.isFinite(n) && list(value)[0] !== undefined && n >= 0 ? n : undefined;
}

export function parseShopQuery(params: RawParams, category?: string): ShopQuery {
  const specs: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("spec.")) specs[key.slice(5)] = list(value);
  }
  const sort = list(params.sort)[0] as Sort | undefined;
  return {
    category,
    brands: list(params.brand),
    conditions: list(params.condition).filter((c): c is Condition =>
      CONDITIONS.includes(c as Condition),
    ),
    min: num(params.min),
    max: num(params.max),
    inStock: list(params.stock)[0] === "1",
    q: list(params.q)[0]?.trim() || undefined,
    sort: sort && SORTS.includes(sort) ? sort : "featured",
    page: Math.floor(num(params.page) ?? 1) || 1,
    specs,
  };
}

/** Rebuilds a URL from current params with some overridden; used for sort and pagination links. */
export function withParams(base: string, params: RawParams, overrides: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key in overrides) continue;
    for (const v of list(value)) next.append(key, v);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}
