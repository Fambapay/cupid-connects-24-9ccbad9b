# Angola localization (MZ + AO, future ZA/PT)

A single reusable country layer powers landing copy, pricing, payments, SEO and onboarding. No duplicate pages, no separate app.

## 1. Country config (single source of truth)

New `src/lib/country/config.ts`:

```ts
export type CountryCode = "MZ" | "AO" | "ZA" | "PT";

export const COUNTRY_CONFIG = {
  MZ: {
    enabled: true,
    name: "Moçambique",
    flag: "🇲🇿",
    currency: "MZN",
    locale: "pt-MZ",
    phonePrefix: "+258",
    phoneExample: "+258 84 123 4567",
    payments: ["mpesa", "emola", "visa", "mastercard"],
    cities: ["Maputo", "Matola", "Beira", "Nampula", "Chimoio", "Tete", "Pemba", "Quelimane", "Nacala", "Inhambane", "Xai-Xai", "Lichinga"],
    heroCities: ["Maputo.", "Matola.", "Beira.", "Nampula.", "Chimoio.", "Tete.", "Pemba."],
  },
  AO: {
    enabled: true,
    name: "Angola",
    flag: "🇦🇴",
    currency: "AOA",
    locale: "pt-AO",
    phonePrefix: "+244",
    phoneExample: "+244 923 456 789",
    payments: ["multicaixa_express", "referencia_mc", "unitel_money", "visa", "mastercard"],
    cities: ["Luanda", "Benguela", "Huambo", "Lobito", "Lubango", "Cabinda", "Namibe", "Malanje", "Kuito", "Soyo"],
    heroCities: ["Luanda.", "Benguela.", "Huambo.", "Lobito.", "Lubango."],
  },
  ZA: { enabled: false, /* scaffold: ZAR, en-ZA, ["card","eft","ozow"] */ … },
  PT: { enabled: false, /* scaffold: EUR, pt-PT, ["mbway","multibanco","card"] */ … },
} as const;

export const DEFAULT_COUNTRY: CountryCode = "MZ";
export const formatPrice = (amount: number, country: CountryCode) =>
  new Intl.NumberFormat(COUNTRY_CONFIG[country].locale, {
    style: "currency", currency: COUNTRY_CONFIG[country].currency,
    maximumFractionDigits: 0,
  }).format(amount);
```

## 2. Country-aware pricing

`src/lib/pricing.ts` keeps a catalog per country. Fixed AOA values you confirmed:

| Plan / Pack          | MZN    | AOA      |
|----------------------|--------|----------|
| Select / mês         | 199    | 1 500    |
| Select / ano         | 1 590  | 12 000   |
| Plus / mês           | 599    | 4 500    |
| Plus / ano           | 4 790  | 36 000   |
| Elite / mês          | 999    | 7 500    |
| Elite / ano          | 7 990  | 60 000   |
| Boost 1 / 5 / 15     | 99 / 399 / 999 | 750 / 3 000 / 7 500 |
| Super Like 1 / 5 / 25| 49 / 199 / 899 | 400 / 1 500 / 6 800 |

Helpers updated to `(tier, period, country)` / `(packId, country)`. **Server `createDebitoPayment` recomputes amount from this catalog using the request country** — client never sends price.

## 3. Country detection

`src/lib/country/detect.ts`:

- **Server (SSR / serverFn / route handler)**: read `Host` header → if starts with `ao.` ⇒ AO. Else read `cf-ipcountry` (Cloudflare auto-injects on Workers) and map known codes. Else fallback to `DEFAULT_COUNTRY`.
- **Client**: same host check, then localStorage override `hunie:country`, then hydrate from SSR-provided value via `<CountryProvider>` in `__root.tsx`.
- **Manual override**: small `CountrySwitcher` (footer + auth pages) writes to localStorage and reloads. Subdomain still wins when present.
- Server function `getCountry` exposes the resolved country to client hydration.

`useCountry()` hook returns `{ country, config, setCountry }`.

## 4. Landing dynamic content

`src/components/landing/EditorialHero.tsx`, `CidadesSection.tsx`, `FaqSection.tsx`, `ComoFunciona.tsx` rewritten to read from `useCountry()`:

- Hero pill: `{flag} Feito em {name}` (MZ keeps "Feito em Moçambique"; AO becomes "Pensado para Angola").
- Typewriter cycles `config.heroCities`.
- Subtitle, trust line, rotator strings come from a per-country `landingCopy` map in `src/lib/country/copy.ts`.
- Cidades grid maps `config.cities`.
- FAQ pulls from `faqData[country]` (MZ keeps current; AO variant references Multicaixa, Unitel Money, Kz).
- New `Testimonials` already present? — add localized testimonial set per country (3 names: Joana/Marco/Inês for AO with Luanda/Benguela/Lubango locations).

## 5. SEO per country

`src/routes/index.tsx` `head()` becomes country-aware via loader:

- AO: `title: "Hunie — Namoro em Angola. Comunidade verificada em Luanda, Benguela e Huambo."`, description tuned for AO, `og:locale: "pt_AO"`, canonical `https://ao.hunie.app/`.
- MZ: keeps current copy, canonical `https://hunie.app/`.
- `__root.tsx` `og:locale` becomes dynamic via loader-driven head, JSON-LD `areaServed` switches between Mozambique/Angola.
- `public/robots.txt` and `sitemap.xml` add `ao.hunie.app` host entries.

## 6. Payment methods

- `PAYMENT_METHODS` union extended: `mpesa | emola | multicaixa_express | referencia_mc | unitel_money | visa | mastercard`.
- `DebitoCheckoutSheet`, `PaywallSheet`, `CreditShopSheet`, `ProfileBundles` filter methods through `config.payments`.
- New labels + icons (text-only badges for MC Express / Ref MC / Unitel Money — no logo assets fetched).
- Backend (`src/lib/debito.functions.ts`) Zod schema accepts the new method codes; for AO methods it **inserts a `debito_payments` row with `status="pending"` and returns a friendly "em breve" message** without calling the MZ orchestrator (per your "UI + config only" answer). MZ methods unchanged.
- Phone validation per country: `normalizePhone(raw, country)` uses MZ regex for MZ, AO regex (`9[1-9]XXXXXXX`) for AO.

## 7. Onboarding / forms

- Phone input placeholder + prefix from `config.phoneExample` / `phonePrefix`.
- Currency-bearing strings (`"Desde 149 MZN/mês"`, settings, paywalls) routed through `formatPrice` + the catalog so AO sees `Desde 1 500 Kz/mês`.

## 8. Data model

No schema change. `debito_payments` already stores amount + currency. We add `currency` derivation server-side from country. (Optional follow-up migration: add `country CHAR(2)` to `debito_payments` and `profiles` — not in this PR; flagged as TODO.)

## 9. Files

**New**
- `src/lib/country/config.ts`
- `src/lib/country/detect.ts` + `detect.server.ts`
- `src/lib/country/context.tsx` (`CountryProvider`, `useCountry`)
- `src/lib/country/copy.ts` (landing + onboarding strings per country)
- `src/lib/country/country.functions.ts` (`getCountry` serverFn)
- `src/components/CountrySwitcher.tsx`
- `src/components/landing/faqData.ao.ts` (or merge into existing as map)

**Edited**
- `src/lib/pricing.ts` — per-country catalog + helpers
- `src/lib/plans.ts` — `formatPrice` delegates to country formatter
- `src/lib/debito.functions.ts` — accept country, recompute amount/currency, accept AO methods as pending-only
- `src/components/landing/EditorialHero.tsx`, `CidadesSection.tsx`, `FaqSection.tsx`, `ComoFunciona.tsx`
- `src/components/DebitoCheckoutSheet.tsx`, `paywall/PaywallSheet.tsx`, `paywall/PaywallFlow.tsx`, `paywall/CreditShopSheet.tsx`, `ProfileBundles.tsx`
- `src/components/PhoneVerificationModal.tsx` — country-aware phone format
- `src/routes/__root.tsx` — wrap with `CountryProvider`, dynamic og:locale, JSON-LD areaServed
- `src/routes/index.tsx`, `membership.tsx`, `shop.tsx`, `discover.tsx` — country-aware head() + copy
- `src/routes/sitemap[.]xml.ts`, `public/robots.txt`

## 10. Out of scope (deferred)

- Real PSP integration for Multicaixa / Unitel Money (waits on provider contract).
- ZA / PT user-visible enablement — config stubs only, hidden in switcher.
- `country` column on `debito_payments`/`profiles` (will land when AO charging goes live).
- DNS: you'll connect `ao.hunie.app` in Project Settings → Domains after merge.

Ready to implement on approval.