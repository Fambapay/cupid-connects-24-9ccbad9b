import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { resolveCountryServer } from "./detect";

/**
 * Server-side country detection: subdomain → cf-ipcountry → DEFAULT.
 * Safe to call from public loaders (no auth, no DB).
 */
export const getCountry = createServerFn({ method: "GET" }).handler(async () => {
  const host = getRequestHeader("host") ?? getRequestHeader("x-forwarded-host");
  const geo = getRequestHeader("cf-ipcountry");
  return { country: resolveCountryServer(host, geo) };
});
