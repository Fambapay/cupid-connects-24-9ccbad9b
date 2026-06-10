// Single source of truth for country localization.
// Add a new country here and the rest of the app picks it up.

export type CountryCode = "MZ" | "AO" | "ZA" | "PT";

export type PaymentMethodCode =
  | "mpesa"
  | "emola"
  | "multicaixa_express"
  | "referencia_mc"
  | "unitel_money"
  | "mbway"
  | "multibanco"
  | "ozow"
  | "eft"
  | "visa"
  | "mastercard";

export interface CountryConfig {
  code: CountryCode;
  enabled: boolean;
  name: string;
  nameLocative: string; // e.g. "em Moçambique"
  flag: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  ogLocale: string;
  phonePrefix: string;
  phoneExample: string;
  /** Regex applied to local digits (after stripping prefix) */
  phoneLocalRegex: RegExp;
  payments: PaymentMethodCode[];
  cities: string[];
  heroCities: string[];
  defaultReturnHost: string;
}

export const COUNTRY_CONFIG: Record<CountryCode, CountryConfig> = {
  MZ: {
    code: "MZ",
    enabled: true,
    name: "Moçambique",
    nameLocative: "em Moçambique",
    flag: "🇲🇿",
    currency: "MZN",
    currencySymbol: "MZN",
    locale: "pt-MZ",
    ogLocale: "pt_MZ",
    phonePrefix: "+258",
    phoneExample: "84 123 4567",
    phoneLocalRegex: /^8[2-7]\d{7}$/,
    payments: ["mpesa", "emola", "visa", "mastercard"],
    cities: [
      "Maputo", "Matola", "Beira", "Nampula", "Chimoio",
      "Tete", "Pemba", "Quelimane", "Nacala", "Inhambane",
      "Xai-Xai", "Lichinga",
    ],
    heroCities: ["Maputo.", "Matola.", "Beira.", "Nampula.", "Chimoio.", "Tete.", "Pemba."],
    defaultReturnHost: "hunie.app",
  },
  AO: {
    code: "AO",
    enabled: true,
    name: "Angola",
    nameLocative: "em Angola",
    flag: "🇦🇴",
    currency: "AOA",
    currencySymbol: "Kz",
    locale: "pt-AO",
    ogLocale: "pt_AO",
    phonePrefix: "+244",
    phoneExample: "923 456 789",
    phoneLocalRegex: /^9[1-9]\d{7}$/,
    payments: ["multicaixa_express", "referencia_mc", "unitel_money", "visa", "mastercard"],
    cities: [
      "Luanda", "Benguela", "Huambo", "Lobito", "Lubango",
      "Cabinda", "Namibe", "Malanje", "Kuito", "Soyo",
    ],
    heroCities: ["Luanda.", "Benguela.", "Huambo.", "Lobito.", "Lubango."],
    defaultReturnHost: "ao.hunie.app",
  },
  ZA: {
    code: "ZA",
    enabled: false,
    name: "South Africa",
    nameLocative: "in South Africa",
    flag: "🇿🇦",
    currency: "ZAR",
    currencySymbol: "R",
    locale: "en-ZA",
    ogLocale: "en_ZA",
    phonePrefix: "+27",
    phoneExample: "82 123 4567",
    phoneLocalRegex: /^[6-8]\d{8}$/,
    payments: ["visa", "mastercard", "ozow", "eft"],
    cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth"],
    heroCities: ["Joburg.", "Cape Town.", "Durban.", "Pretoria."],
    defaultReturnHost: "za.hunie.app",
  },
  PT: {
    code: "PT",
    enabled: false,
    name: "Portugal",
    nameLocative: "em Portugal",
    flag: "🇵🇹",
    currency: "EUR",
    currencySymbol: "€",
    locale: "pt-PT",
    ogLocale: "pt_PT",
    phonePrefix: "+351",
    phoneExample: "912 345 678",
    phoneLocalRegex: /^9[1236]\d{7}$/,
    payments: ["mbway", "multibanco", "visa", "mastercard"],
    cities: ["Lisboa", "Porto", "Braga", "Coimbra", "Faro", "Funchal"],
    heroCities: ["Lisboa.", "Porto.", "Braga.", "Coimbra."],
    defaultReturnHost: "pt.hunie.app",
  },
};

export const DEFAULT_COUNTRY: CountryCode = "MZ";
export const SUPPORTED_COUNTRIES: CountryCode[] = (
  Object.values(COUNTRY_CONFIG) as CountryConfig[]
)
  .filter((c) => c.enabled)
  .map((c) => c.code);

export function getCountryConfig(country: CountryCode | string | null | undefined): CountryConfig {
  const code = (country ?? "").toString().toUpperCase() as CountryCode;
  return COUNTRY_CONFIG[code] ?? COUNTRY_CONFIG[DEFAULT_COUNTRY];
}

const PAYMENT_LABELS: Record<PaymentMethodCode, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  multicaixa_express: "Multicaixa Express",
  referencia_mc: "Referência Multicaixa",
  unitel_money: "Unitel Money",
  mbway: "MB WAY",
  multibanco: "Multibanco",
  ozow: "Ozow",
  eft: "EFT",
  visa: "Visa",
  mastercard: "Mastercard",
};

export function paymentLabel(m: PaymentMethodCode): string {
  return PAYMENT_LABELS[m] ?? m;
}

/** Format an amount in the country's currency, e.g. 1500 → "1 500 Kz". */
export function formatCountryPrice(
  amount: number,
  country: CountryCode = DEFAULT_COUNTRY,
): string {
  const cfg = getCountryConfig(country);
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for runtimes missing the locale data
    const n = new Intl.NumberFormat("pt-PT", {
      maximumFractionDigits: 0,
    }).format(amount);
    return `${n} ${cfg.currencySymbol}`;
  }
}

/** Normalize a raw phone string into E.164 for the given country. */
export function normalizePhoneForCountry(
  raw: string,
  country: CountryCode = DEFAULT_COUNTRY,
): string | null {
  const cfg = getCountryConfig(country);
  const digits = raw.replace(/\D/g, "");
  const prefix = cfg.phonePrefix.replace(/\D/g, "");
  const local = digits.startsWith(prefix) ? digits.slice(prefix.length) : digits;
  if (!cfg.phoneLocalRegex.test(local)) return null;
  return cfg.phonePrefix + local;
}
