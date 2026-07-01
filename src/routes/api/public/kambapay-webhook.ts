import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { sanitizePayload } from "@/lib/pricing";

function verifySignature(secret: string, body: string, signature: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/kambapay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.KAMBAPAY_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook not configured", { status: 503 });
        }

        const signature =
          request.headers.get("x-kambafy-signature") ??
          request.headers.get("x-kambapay-signature") ??
          "";
        const body = await request.text();
        if (!signature || !verifySignature(secret, body, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(body) as Record<string, unknown>;
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const event = String(payload.event ?? "").toLowerCase();
        const orderId = (payload.order_id ?? payload.orderId ?? null) as
          | string
          | null;
        const paymentId = (payload.payment_id ?? payload.id ?? null) as
          | string
          | null;

        const newStatus: "success" | "failed" | null =
          event === "payment.completed"
            ? "success"
            : event === "payment.failed" || event === "payment.expired"
              ? "failed"
              : null;

        if (!newStatus) {
          return new Response(
            JSON.stringify({ ok: true, ignored: "unknown_event" }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (!orderId && !paymentId) {
          return new Response(
            JSON.stringify({ ok: true, ignored: "no_identifier" }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        let query = supabaseAdmin
          .from("debito_payments")
          .select("*")
          .limit(1);
        if (orderId) query = query.eq("source_id", orderId);
        else if (paymentId) query = query.eq("debito_payment_id", paymentId);

        const { data: rows } = await query;
        const row = rows?.[0];
        if (!row) {
          return new Response(
            JSON.stringify({ ok: true, ignored: "unknown_row" }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        const updates: Record<string, unknown> = {
          status: newStatus,
          raw_webhook: sanitizePayload(payload) as never,
        };
        if (paymentId && !row.debito_payment_id) {
          updates.debito_payment_id = paymentId;
        }
        if (newStatus === "success") {
          updates.completed_at = new Date().toISOString();
        }

        await supabaseAdmin
          .from("debito_payments")
          .update(updates as never)
          .eq("id", row.id);

        if (row.status !== "success" && newStatus === "success") {
          if (row.kind === "pack" && row.pack_kind && row.pack_quantity) {
            await supabaseAdmin.rpc("credit_pack_debito", {
              _user_id: row.user_id,
              _pack_kind: row.pack_kind,
              _quantity: row.pack_quantity,
              _amount_minor: Math.round(Number(row.amount) * 100),
              _currency: row.currency ?? "AOA",
              _source_id: row.source_id,
              _debito_payment_id:
                row.debito_payment_id ?? paymentId ?? "",
            });
          } else if (row.kind === "plan" && row.plan_tier) {
            const { getPlanPrices } = await import("@/lib/pricing");
            const p = getPlanPrices(
              (row.currency === "AOA" ? "AO" : "MZ"),
            )[row.plan_tier as "select" | "plus" | "elite"];
            const days =
              p && Number(row.amount) >= p.annualPrice
                ? p.annualDays
                : p.monthlyDays;
            await supabaseAdmin.rpc("activate_membership_debito", {
              _user_id: row.user_id,
              _plan_tier: row.plan_tier,
              _days: days,
            });
            // Referral bonus (idempotent — first activation only)
            await supabaseAdmin.rpc("grant_referral_bonus", { _referred_id: row.user_id });
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
