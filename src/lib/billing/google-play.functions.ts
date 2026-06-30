import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Verify a Google Play purchase token after a successful in-app purchase,
 * persist it to payment_transactions, activate the membership, and
 * acknowledge the purchase with Google.
 *
 * Called from the Android client right after `Purchases.purchase()` returns
 * a purchase token from Google Play Billing.
 */
export const verifyGooglePlayPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; purchaseToken: string }) => {
    if (!input || typeof input.productId !== "string" || typeof input.purchaseToken !== "string") {
      throw new Error("productId and purchaseToken are required");
    }
    if (input.productId.length > 200 || input.purchaseToken.length > 4000) {
      throw new Error("payload too large");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { productId, purchaseToken } = data;

    const { getSubscriptionV2, acknowledgeSubscription, tierFromProductId } = await import(
      "@/lib/billing/google-play.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tier = tierFromProductId(productId);
    if (!tier) throw new Error(`Unknown product: ${productId}`);

    const sub = await getSubscriptionV2(purchaseToken);
    const lineItem = sub.lineItems?.find((l) => l.productId === productId) ?? sub.lineItems?.[0];
    const expiryTime = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null;
    const active =
      sub.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" ||
      sub.subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";

    if (!active || !expiryTime || expiryTime.getTime() < Date.now()) {
      throw new Error(`Subscription is not active: ${sub.subscriptionState}`);
    }

    // Record the transaction (upsert on purchase token to dedupe).
    await supabaseAdmin
      .from("payment_transactions")
      .upsert(
        {
          user_id: userId,
          provider: "google_play",
          kind: "subscription",
          plan_tier: tier,
          amount_minor: 0, // Google bills the user directly; we don't see the local amount here.
          currency: sub.regionCode ? "USD" : "USD",
          status: "paid",
          external_transaction_id: sub.latestOrderId ?? purchaseToken,
          external_receipt: purchaseToken,
          renewal_at: expiryTime.toISOString(),
          raw: JSON.parse(JSON.stringify(sub)),
          completed_at: new Date().toISOString(),
        },
        { onConflict: "external_receipt" },
      );

    // Activate membership.
    const autoRenew = lineItem?.autoRenewingPlan?.autoRenewEnabled !== false;
    await supabaseAdmin
      .from("profiles")
      .update({
        membership_tier: tier,
        membership_status: autoRenew ? "active" : "cancelled",
        membership_expires_at: expiryTime.toISOString(),
      })
      .eq("id", userId);

    // Acknowledge so Google doesn't refund. Idempotent.
    if (sub.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
      try {
        await acknowledgeSubscription(productId, purchaseToken);
      } catch (e) {
        // Non-fatal: webhook will retry acknowledgement via Pub/Sub if needed.
        console.error("[google-play] acknowledge failed", e);
      }
    }

    return {
      ok: true as const,
      tier,
      expiresAt: expiryTime.toISOString(),
      autoRenew,
    };
  });
