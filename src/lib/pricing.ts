// Single source of truth for plan + pack pricing. Client NEVER sends prices —
// only plan_tier or pack_id. Server recomputes amount from this catalog.

export type PlanTier = "select" | "plus" | "elite";
export type PackKind = "boost" | "super_like";
export type BillingPeriod = "monthly" | "annual";

export interface PlanPrice {
  priceMzn: number;        // monthly price
  annualPriceMzn: number;  // annual price (already discounted)
  monthlyDays: number;
  annualDays: number;
  label: string;
}

export const PLAN_PRICES: Record<PlanTier, PlanPrice> = {
  select: { priceMzn: 199, annualPriceMzn: 1590, monthlyDays: 30, annualDays: 365, label: "Select" },
  plus:   { priceMzn: 599, annualPriceMzn: 4790, monthlyDays: 30, annualDays: 365, label: "Plus" },
  elite:  { priceMzn: 999, annualPriceMzn: 7990, monthlyDays: 30, annualDays: 365, label: "Elite" },
};

export function getPlanAmount(tier: PlanTier, period: BillingPeriod): number {
  const p = PLAN_PRICES[tier];
  return period === "annual" ? p.annualPriceMzn : p.priceMzn;
}

export function getPlanDays(tier: PlanTier, period: BillingPeriod): number {
  const p = PLAN_PRICES[tier];
  return period === "annual" ? p.annualDays : p.monthlyDays;
}

export type Pack = {
  id: string;
  kind: PackKind;
  quantity: number;
  priceMzn: number;
};

export const PACKS: Record<string, Pack> = {
  boost_1:        { id: "boost_1",        kind: "boost",      quantity: 1,  priceMzn: 99 },
  boost_5:        { id: "boost_5",        kind: "boost",      quantity: 5,  priceMzn: 399 },
  boost_15:       { id: "boost_15",       kind: "boost",      quantity: 15, priceMzn: 999 },
  super_like_1:   { id: "super_like_1",   kind: "super_like", quantity: 1,  priceMzn: 49 },
  super_like_5:   { id: "super_like_5",   kind: "super_like", quantity: 5,  priceMzn: 199 },
  super_like_25:  { id: "super_like_25",  kind: "super_like", quantity: 25, priceMzn: 899 },
};

export const PAYMENT_METHODS = [
  "mpesa",
  "emola",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const MOBILE_MONEY_METHODS: PaymentMethod[] = ["mpesa", "emola"];

const RETURN_URL_ALLOWLIST = [
  "https://hunie.app/",
  "https://www.hunie.app/",
  "https://hunie.lovable.app/",
];

export function isAllowedReturnUrl(url: string | undefined | null) {
  if (!url) return false;
  return RETURN_URL_ALLOWLIST.some((p) => url.startsWith(p));
}

// MZ phone normalizer: +258 8[2-7] XXXXXXX
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("258") ? digits.slice(3) : digits;
  if (!/^8[2-7]\d{7}$/.test(local)) return null;
  return "+258" + local;
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
