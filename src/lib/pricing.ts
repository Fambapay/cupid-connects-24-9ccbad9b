// Single source of truth for plan + pack pricing per country.
// Client NEVER sends prices — only plan_tier or pack_id (+country).
// Server recomputes amount from this catalog.

import {
  COUNTRY_CONFIG,
  DEFAULT_COUNTRY,
  formatCountryPrice,
  normalizePhoneForCountry,
  type CountryCode,
  type PaymentMethodCode,
} from "./country/config";

export type PlanTier = "select" | "plus" | "elite";
export type PackKind = "boost" | "super_like";
export type BillingPeriod = "monthly" | "annual";

export interface PlanPrice {
  price: number;          // monthly price in country currency
  annualPrice: number;    // annual price (already discounted)
  monthlyDays: number;
  annualDays: number;
  label: string;
}

export type Pack = {
  id: string;
  kind: PackKind;
  quantity: number;
  price: number;
  popular?: boolean;
  best?: boolean;
};

// ────────────────────────────────────────────────────────────
//  Per-country catalogs
// ────────────────────────────────────────────────────────────

const PLAN_PRICES_MZ: Record<PlanTier, PlanPrice> = {
  select: { price: 199, annualPrice: 1590, monthlyDays: 30, annualDays: 365, label: "Select" },
  plus:   { price: 599, annualPrice: 4790, monthlyDays: 30, annualDays: 365, label: "Plus" },
  elite:  { price: 999, annualPrice: 7990, monthlyDays: 30, annualDays: 365, label: "Elite" },
};

const PLAN_PRICES_AO: Record<PlanTier, PlanPrice> = {
  select: { price: 1500, annualPrice: 12000, monthlyDays: 30, annualDays: 365, label: "Select" },
  plus:   { price: 4500, annualPrice: 36000, monthlyDays: 30, annualDays: 365, label: "Plus" },
  elite:  { price: 7500, annualPrice: 60000, monthlyDays: 30, annualDays: 365, label: "Elite" },
};

const PACKS_MZ: Record<string, Pack> = {
  boost_1:       { id: "boost_1",       kind: "boost",      quantity: 1,  price: 99 },
  boost_5:       { id: "boost_5",       kind: "boost",      quantity: 5,  price: 399,  popular: true },
  boost_15:      { id: "boost_15",      kind: "boost",      quantity: 15, price: 999,  best: true },
  super_like_1:  { id: "super_like_1",  kind: "super_like", quantity: 1,  price: 49 },
  super_like_5:  { id: "super_like_5",  kind: "super_like", quantity: 5,  price: 199,  popular: true },
  super_like_25: { id: "super_like_25", kind: "super_like", quantity: 25, price: 899,  best: true },
};

const PACKS_AO: Record<string, Pack> = {
  boost_1:       { id: "boost_1",       kind: "boost",      quantity: 1,  price: 750 },
  boost_5:       { id: "boost_5",       kind: "boost",      quantity: 5,  price: 3000, popular: true },
  boost_15:      { id: "boost_15",      kind: "boost",      quantity: 15, price: 7500, best: true },
  super_like_1:  { id: "super_like_1",  kind: "super_like", quantity: 1,  price: 400 },
  super_like_5:  { id: "super_like_5",  kind: "super_like", quantity: 5,  price: 1500, popular: true },
  super_like_25: { id: "super_like_25", kind: "super_like", quantity: 25, price: 6800, best: true },
};

const PLAN_PRICES_BY_COUNTRY: Record<CountryCode, Record<PlanTier, PlanPrice>> = {
  MZ: PLAN_PRICES_MZ,
  AO: PLAN_PRICES_AO,
  ZA: PLAN_PRICES_MZ, // not enabled yet
  PT: PLAN_PRICES_MZ,
};

const PACKS_BY_COUNTRY: Record<CountryCode, Record<string, Pack>> = {
  MZ: PACKS_MZ,
  AO: PACKS_AO,
  ZA: PACKS_MZ,
  PT: PACKS_MZ,
};

// ────────────────────────────────────────────────────────────
//  Public helpers (country-aware)
// ────────────────────────────────────────────────────────────

export function getPlanPrices(country: CountryCode = DEFAULT_COUNTRY) {
  return PLAN_PRICES_BY_COUNTRY[country] ?? PLAN_PRICES_MZ;
}

export function getPacks(country: CountryCode = DEFAULT_COUNTRY) {
  return PACKS_BY_COUNTRY[country] ?? PACKS_MZ;
}

export function getPlanAmount(
  tier: PlanTier,
  period: BillingPeriod,
  country: CountryCode = DEFAULT_COUNTRY,
): number {
  const p = getPlanPrices(country)[tier];
  return period === "annual" ? p.annualPrice : p.price;
}

export function getPlanDays(
  tier: PlanTier,
  period: BillingPeriod,
  country: CountryCode = DEFAULT_COUNTRY,
): number {
  const p = getPlanPrices(country)[tier];
  return period === "annual" ? p.annualDays : p.monthlyDays;
}

export function getPack(packId: string, country: CountryCode = DEFAULT_COUNTRY): Pack | null {
  return getPacks(country)[packId] ?? null;
}

export function getCurrency(country: CountryCode = DEFAULT_COUNTRY): string {
  return COUNTRY_CONFIG[country]?.currency ?? "MZN";
}

// ────────────────────────────────────────────────────────────
//  Backward-compat re-exports (used by code paths still pinned to MZ).
//  These now expose MZ prices under legacy "Mzn" field names too, so
//  components updated to the country-aware API and components still
//  reading PLAN_PRICES / PACKS keep working in the same render.
// ────────────────────────────────────────────────────────────

type LegacyPlanPrice = PlanPrice & { priceMzn: number; annualPriceMzn: number };
type LegacyPack = Pack & { priceMzn: number };

export const PLAN_PRICES: Record<PlanTier, LegacyPlanPrice> = Object.fromEntries(
  (Object.entries(PLAN_PRICES_MZ) as [PlanTier, PlanPrice][]).map(([k, v]) => [
    k,
    { ...v, priceMzn: v.price, annualPriceMzn: v.annualPrice },
  ]),
) as Record<PlanTier, LegacyPlanPrice>;

export const PACKS: Record<string, LegacyPack> = Object.fromEntries(
  Object.entries(PACKS_MZ).map(([k, v]) => [k, { ...v, priceMzn: v.price }]),
);

// ────────────────────────────────────────────────────────────
//  Payment methods (server-side validation accepts the union of
//  every supported country's methods; per-country filtering happens
//  in the UI and again in createDebitoPayment).
// ────────────────────────────────────────────────────────────

export const PAYMENT_METHODS = [
  "mpesa",
  "emola",
  "multicaixa_express",
  "referencia_mc",
  "unitel_money",
  "mbway",
  "multibanco",
  "ozow",
  "eft",
  "visa",
  "mastercard",
] as const satisfies readonly PaymentMethodCode[];

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Methods that take a phone number rather than a card / redirect flow. */
export const MOBILE_MONEY_METHODS: PaymentMethod[] = [
  "mpesa",
  "emola",
  "multicaixa_express",
  "unitel_money",
  "mbway",
];

/** Methods we can actually charge through Débito Pay today (MZ-only). */
export const LIVE_DEBITO_METHODS: PaymentMethod[] = ["mpesa", "emola"];

const RETURN_URL_ALLOWLIST = [
  "https://hunie.app/",
  "https://www.hunie.app/",
  "https://ao.hunie.app/",
  "https://hunie.lovable.app/",
];

export function isAllowedReturnUrl(url: string | undefined | null) {
  if (!url) return false;
  return RETURN_URL_ALLOWLIST.some((p) => url.startsWith(p));
}

/**
 * MZ-only legacy normalizer (kept for callers that haven't migrated yet).
 * Prefer normalizePhoneForCountry from country/config.
 */
export function normalizePhone(raw: string): string | null {
  return normalizePhoneForCountry(raw, "MZ");
}

const SENSITIVE_KEYS = new Set([
  "phone", "msisdn", "email", "token", "card", "pan", "cvv",
  "secret", "signature", "authorization", "auth", "password",
]);

export function sanitizePayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizePayload(v);
      }
    }
    return out;
  }
  return value;
}

// Re-export helpers callers may want from a single place
export { formatCountryPrice, normalizePhoneForCountry };
export type { CountryCode };
