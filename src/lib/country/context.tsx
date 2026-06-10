import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COUNTRY_CONFIG,
  DEFAULT_COUNTRY,
  getCountryConfig,
  type CountryCode,
  type CountryConfig,
} from "./config";
import {
  resolveCountryClient,
  writeCountryOverride,
} from "./detect";

interface CountryContextValue {
  country: CountryCode;
  config: CountryConfig;
  setCountry: (c: CountryCode) => void;
}

const CountryContext = createContext<CountryContextValue | null>(null);

export function CountryProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: CountryCode;
}) {
  const [country, setCountryState] = useState<CountryCode>(
    () => initial ?? DEFAULT_COUNTRY,
  );

  // After mount, re-resolve using window.location + localStorage so the
  // ssr: false landing route picks up ao.hunie.app instantly.
  useEffect(() => {
    const resolved = resolveCountryClient(initial);
    if (resolved !== country) setCountryState(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCountry = useCallback((c: CountryCode) => {
    if (!(c in COUNTRY_CONFIG)) return;
    writeCountryOverride(c);
    setCountryState(c);
  }, []);

  const value = useMemo<CountryContextValue>(
    () => ({ country, config: getCountryConfig(country), setCountry }),
    [country, setCountry],
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (ctx) return ctx;
  // Safe default for components rendered outside the provider (e.g. tests).
  return {
    country: DEFAULT_COUNTRY,
    config: getCountryConfig(DEFAULT_COUNTRY),
    setCountry: () => {},
  };
}
