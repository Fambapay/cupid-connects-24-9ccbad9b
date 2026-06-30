/**
 * Google Play Real-Time Developer Notifications (RTDN) — Pub/Sub push endpoint.
 *
 * Configure in Play Console → Monetization setup → Real-time developer
 * notifications. Topic: projects/<gcp-project>/topics/hunie-play-rtdn.
 * Subscription type: push. Push endpoint:
 *   https://hunie.app/api/public/google-play-webhook?token=<verification-token>
 *
 * Secrets:
 *   GOOGLE_PLAY_PUBSUB_VERIFICATION_TOKEN — shared secret in the URL query
 *   GOOGLE_PLAY_PACKAGE_NAME
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
 *
 * Spec: https://developer.android.com/google/play/billing/rtdn-reference
 */
import { createFileRoute } from "@tanstack/react-router";

type PubSubPush = {
  message?: {
    data?: string; // base64-encoded JSON
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
};

type RtdnPayload = {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  voidedPurchaseNotification?: {
    purchaseToken: string;
    orderId: string;
    productType: number;
    refundType: number;
  };
  testNotification?: { version: string };
};

// https://developer.android.com/google/play/billing/rtdn-reference#sub
const ACTIVE_STATES = new Set([
  1, // RECOVERED
  2, // RENEWED
  4, // PURCHASED
  7, // RESTARTED
  8, // PRICE_CHANGE_CONFIRMED
]);
const INACTIVE_STATES = new Set([
  3, // CANCELED — user cancelled, may still have access until expiry
  5, // ON_HOLD
  6, // IN_GRACE_PERIOD — keep access
  9, // DEFERRED
  10, // PAUSED
  12, // REVOKED
  13, // EXPIRED
]);

export const Route = createFileRoute("/api/public/google-play-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env.GOOGLE_PLAY_PUBSUB_VERIFICATION_TOKEN;
        if (!expectedToken) {
          return new Response("Webhook not configured", { status: 503 });
        }
        const url = new URL(request.url);
        const providedToken = url.searchParams.get("token");
        if (!providedToken || providedToken !== expectedToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let push: PubSubPush;
        try {
          push = (await request.json()) as PubSubPush;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (!push.message?.data) {
          // Pub/Sub control message — ack quickly.
          return new Response("ok");
        }

        let payload: RtdnPayload;
        try {
          const decoded = atob(push.message.data);
          payload = JSON.parse(decoded) as RtdnPayload;
        } catch {
          return new Response("Invalid Pub/Sub data", { status: 400 });
        }

        // Test notification from Play Console — ack and ignore.
        if (payload.testNotification) {
          return new Response("ok");
        }

        const sn = payload.subscriptionNotification;
        if (!sn) {
          // Voided / one-time / unknown — ack to prevent redelivery; extend later if we sell IAP packs via Play.
          return new Response("ok");
        }

        try {
          const { getSubscriptionV2, tierFromProductId } = await import(
            "@/lib/billing/google-play.server"
          );
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const tier = tierFromProductId(sn.subscriptionId);
          if (!tier) {
            console.warn("[play-webhook] unknown productId", sn.subscriptionId);
            return new Response("ok"); // ack — unknown product, nothing to do
          }

          const sub = await getSubscriptionV2(sn.purchaseToken);

          // Resolve user: prefer obfuscatedExternalAccountId (we set it at purchase),
          // then fall back to an existing payment_transactions row matching the token.
          let userId =
            sub.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null;

          if (!userId) {
            const { data: existing } = await supabaseAdmin
              .from("payment_transactions")
              .select("user_id")
              .eq("external_receipt", sn.purchaseToken)
              .maybeSingle();
            userId = existing?.user_id ?? null;
          }

          if (!userId) {
            console.warn("[play-webhook] could not resolve user for token");
            return new Response("ok"); // ack — we can't act, but don't loop redelivery
          }

          const lineItem =
            sub.lineItems?.find((l) => l.productId === sn.subscriptionId) ?? sub.lineItems?.[0];
          const expiry = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null;
          const autoRenew = lineItem?.autoRenewingPlan?.autoRenewEnabled !== false;

          await supabaseAdmin.from("payment_transactions").upsert(
            {
              user_id: userId,
              provider: "google_play",
              kind: "subscription",
              plan_tier: tier,
              amount_minor: 0,
              currency: "USD",
              status: ACTIVE_STATES.has(sn.notificationType) ? "paid" : "cancelled",
              external_transaction_id: sub.latestOrderId ?? sn.purchaseToken,
              external_receipt: sn.purchaseToken,
              renewal_at: expiry?.toISOString() ?? null,
              raw: JSON.parse(JSON.stringify({ notification: sn, subscription: sub })),
              completed_at: new Date().toISOString(),
            },
            { onConflict: "external_receipt" },
          );

          // Update membership state.
          if (ACTIVE_STATES.has(sn.notificationType) && expiry && expiry.getTime() > Date.now()) {
            await supabaseAdmin
              .from("profiles")
              .update({
                membership_tier: tier,
                membership_status: autoRenew ? "active" : "cancelled",
                membership_expires_at: expiry.toISOString(),
              })
              .eq("id", userId);
          } else if (INACTIVE_STATES.has(sn.notificationType)) {
            // CANCELED / IN_GRACE_PERIOD keep access until expiry; just mark status.
            if (sn.notificationType === 3 || sn.notificationType === 6) {
              await supabaseAdmin
                .from("profiles")
                .update({
                  membership_status: "cancelled",
                  membership_expires_at: expiry?.toISOString() ?? null,
                })
                .eq("id", userId);
            } else {
              // EXPIRED / REVOKED / ON_HOLD / PAUSED → revoke now.
              await supabaseAdmin
                .from("profiles")
                .update({
                  membership_tier: "free",
                  membership_status: "inactive",
                  membership_expires_at: null,
                })
                .eq("id", userId);
            }
          }

          return new Response("ok");
        } catch (e) {
          console.error("[play-webhook] processing failed", e);
          // 500 → Pub/Sub will retry with backoff.
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
