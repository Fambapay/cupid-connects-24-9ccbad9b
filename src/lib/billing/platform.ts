/**
 * Billing platform detection.
 *
 * Google Play policy forbids selling digital subscriptions inside an Android
 * app via any provider other than Google Play Billing. Until we wire native
 * IAP, the Play Store build redirects all checkout to the web (browser
 * external) instead of running the in-app Débito flow.
 *
 * Flag the Play Store build at build time:
 *   VITE_BUILD_TARGET=play bun run build && npx cap sync android
 *
 * iOS App Store will need the same treatment (Apple IAP) when we ship it.
 */
import { getPlatform, isNative } from "@/lib/native/platform";

export type BillingMode =
  | "web"            // PWA / browser: use Débito (M-Pesa, e-Mola, mKesh, cartão)
  | "android-play"   // Android Play Store build: redirect to web/external
  | "android-direct" // Android sideload/APK: Débito works normally
  | "ios-appstore";  // iOS App Store: Apple IAP (not yet implemented)

export function getBillingMode(): BillingMode {
  const platform = getPlatform();
  if (!isNative()) return "web";
  if (platform === "ios") return "ios-appstore";
  if (platform === "android") {
    const target = (import.meta.env.VITE_BUILD_TARGET ?? "").toLowerCase();
    return target === "play" ? "android-play" : "android-direct";
  }
  return "web";
}

/** True when the user cannot complete checkout inside the app (Play/App Store). */
export function requiresExternalCheckout(): boolean {
  const m = getBillingMode();
  return m === "android-play" || m === "ios-appstore";
}

/** Public URL used as the external checkout target. */
export function getExternalCheckoutUrl(path = "/membership"): string {
  return `https://hunie.app${path}`;
}
