/**
 * Google Play Billing — client wrapper.
 *
 * Wraps a Capacitor IAP plugin. To enable on Android:
 *
 *   1. Install:  bun add @capgo/capacitor-purchases
 *   2. Replace the dynamic require() below with a static import:
 *        import { Purchases } from "@capgo/capacitor-purchases";
 *   3. npx cap sync android
 *   4. Create subscription products in Play Console with IDs matching
 *      PLAY_PRODUCT_TIER in google-play.server.ts.
 *
 * Until the plugin is installed, calling buy() throws so the UI can fall back
 * to the external-browser checkout.
 */
import { getBillingMode } from "@/lib/billing/platform";

export const PLAY_PRODUCT_ID: Record<"select" | "plus" | "elite", string> = {
  select: "hunie_select_monthly",
  plus: "hunie_plus_monthly",
  elite: "hunie_elite_monthly",
};

type PurchaseResult = {
  productId: string;
  purchaseToken: string;
  orderId?: string;
};

async function loadPlugin(): Promise<unknown | null> {
  try {
    // Plugin name resolved at runtime so TS/Vite don't require it at build time.
    // Replace with a static `import { Purchases } from "@capgo/capacitor-purchases"`
    // once the plugin is installed (`bun add @capgo/capacitor-purchases`).
    const pkg = "@capgo/capacitor-purchases";
    const mod = (await import(/* @vite-ignore */ pkg).catch(() => null)) as
      | { Purchases?: unknown }
      | null;
    return mod?.Purchases ?? null;
  } catch {
    return null;
  }
}

export async function isPlayBillingAvailable(): Promise<boolean> {
  if (getBillingMode() !== "android-play") return false;
  return (await loadPlugin()) !== null;
}

export async function buySubscription(
  tier: "select" | "plus" | "elite",
  userId: string,
): Promise<PurchaseResult> {
  const Purchases = (await loadPlugin()) as {
    purchase?: (opts: {
      productIdentifier: string;
      planIdentifier?: string;
      productType?: "subs" | "inapp";
      obfuscatedAccountId?: string;
    }) => Promise<{ purchaseToken?: string; transactionId?: string }>;
  } | null;

  if (!Purchases || typeof Purchases.purchase !== "function") {
    throw new Error("PLAY_BILLING_UNAVAILABLE");
  }

  const productId = PLAY_PRODUCT_ID[tier];
  const result = await Purchases.purchase({
    productIdentifier: productId,
    productType: "subs",
    obfuscatedAccountId: userId, // links the purchase to our user_id in RTDN
  });

  if (!result.purchaseToken) {
    throw new Error("Purchase returned no token");
  }
  return {
    productId,
    purchaseToken: result.purchaseToken,
    orderId: result.transactionId,
  };
}

/** Query existing entitlements (used by "Restaurar compra" on Android Play). */
export async function queryActivePurchases(): Promise<PurchaseResult[]> {
  const Purchases = (await loadPlugin()) as {
    getCustomerInfo?: () => Promise<{
      activeSubscriptions?: Array<{ productIdentifier: string; purchaseToken?: string; transactionId?: string }>;
    }>;
  } | null;
  if (!Purchases?.getCustomerInfo) return [];
  const info = await Purchases.getCustomerInfo();
  return (info.activeSubscriptions ?? [])
    .filter((s) => !!s.purchaseToken)
    .map((s) => ({
      productId: s.productIdentifier,
      purchaseToken: s.purchaseToken!,
      orderId: s.transactionId,
    }));
}
