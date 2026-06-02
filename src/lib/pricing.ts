// Single source of truth for plan + pack pricing. Client NEVER sends prices —
// only plan_tier or pack_id. Server recomputes amount from this catalog.

export type PlanTier = "select" | "plus" | "elite";
export type PackKind = "boost" | "super_like";

export const PLAN_PRICES: Record<PlanTier, { priceMzn: number; days: number; label: string }> = {
  select: { priceMzn: 199, days: 30, label: "Select" },
  plus:   { priceMzn: 599, days: 30, label: "Plus" },
  elite:  { priceMzn: 999, days: 30, label: "Elite" },
};

export type Pack = {
  id: string;
  kind: PackKind;
  quantity: number;
  priceMzn: number;
};

export const PACKS: Record<string, Pack> = {
  boost_1:        { id: "boost_1",        kind: "boost",      quantity: 1,  priceMzn: 199 },
  boost_5:        { id: "boost_5",        kind: "boost",      quantity: 5,  priceMzn: 799 },
  boost_15:       { id: "boost_15",       kind: "boost",      quantity: 15, priceMzn: 1899 },
  super_like_5:   { id: "super_like_5",   kind: "super_like", quantity: 5,  priceMzn: 299 },
  super_like_25:  { id: "super_like_25",  kind: "super_like", quantity: 25, priceMzn: 1299 },
  super_like_60:  { id: "super_like_60",  kind: "super_like", quantity: 60, priceMzn: 2499 },
};

export const PAYMENT_METHODS = [
  "mpesa",
  "emola",
  "mkesh",
  "visa_mastercard",
  "payfast",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const MOBILE_MONEY_METHODS: PaymentMethod[] = ["mpesa", "emola", "mkesh"];

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
