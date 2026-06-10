// Country detection. Works on both client (window.location) and server
// (caller passes the request host + optional cf-ipcountry header).
import {
  COUNTRY_CONFIG,
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
  type CountryCode,
} from "./config";

const STORAGE_KEY = "hunie:country";

/**
 * Subdomain map: ao.hunie.app, ao.lovable.app, ao.localhost → AO.
 * Any subdomain matching a known country code wins.
 */
export function countryFromHost(host: string | null | undefined): CountryCode | null {
  if (!host) return null;
  const h = host.toLowerCase().split(":")[0];
  const first = h.split(".")[0];
  if (!first) return null;
  const code = first.toUpperCase() as CountryCode;
  if (code in COUNTRY_CONFIG && COUNTRY_CONFIG[code].enabled) return code;
  return null;
}

/** Map a cf-ipcountry header to a supported country. */
export function countryFromGeo(geo: string | null | undefined): CountryCode | null {
  if (!geo) return null;
  const code = geo.toUpperCase() as CountryCode;
  if (SUPPORTED_COUNTRIES.includes(code)) return code;
  return null;
}

/** Read manual override saved in localStorage (client only). */
export function readCountryOverride(): CountryCode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    const code = v.toUpperCase() as CountryCode;
    return SUPPORTED_COUNTRIES.includes(code) ? code : null;
  } catch {
    return null;
  }
}

export function writeCountryOverride(country: CountryCode | null) {
  if (typeof window === "undefined") return;
  try {
    if (country) window.localStorage.setItem(STORAGE_KEY, country);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve country on the client. Precedence:
 *   1. Subdomain (ao.hunie.app)        — strongest, SEO signal
 *   2. localStorage manual override
 *   3. SSR-injected hint
 *   4. DEFAULT_COUNTRY
 */
export function resolveCountryClient(ssrHint?: CountryCode | null): CountryCode {
  if (typeof window === "undefined") return ssrHint ?? DEFAULT_COUNTRY;
  const fromHost = countryFromHost(window.location.host);
  if (fromHost) return fromHost;
  const override = readCountryOverride();
  if (override) return override;
  if (ssrHint) return ssrHint;
  return DEFAULT_COUNTRY;
}

/**
 * Resolve country on the server. Subdomain wins; cf-ipcountry is the
 * fallback for visitors on apex / lovable.app / preview hosts.
 */
export function resolveCountryServer(
  host: string | null | undefined,
  cfIpCountry?: string | null,
): CountryCode {
  return (
    countryFromHost(host) ??
    countryFromGeo(cfIpCountry) ??
    DEFAULT_COUNTRY
  );
}
