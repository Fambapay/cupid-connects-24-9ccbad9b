import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { sanitizePayload } from "@/lib/pricing";

function verifySignature(secret: string, body: string, signature: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature.trim().replace(/^sha256=/i, ""));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/debito-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.DEBITO_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook not configured", { status: 503 });
        }

        const signature =
          request.headers.get("x-debito-signature") ??
          request.headers.get("x-webhook-signature") ??
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

        const sourceId = (payload.source_id ?? payload.sourceId ?? null) as string | null;
        const paymentId = (payload.payment_id ?? payload.id ?? null) as string | null;
        const reference = (payload.reference ?? null) as string | null;
        const event = String(payload.event ?? "").toLowerCase();
        const rawStatus = String(payload.status ?? "").toLowerCase();

        const newStatus: "success" | "failed" | null =
          event === "payment.completed" || rawStatus === "success" || rawStatus === "completed"
            ? "success"
            : event === "payment.failed" ||
              rawStatus === "failed" ||
              rawStatus === "cancelled"
            ? "failed"
            : null;

        if (!newStatus) {
          return new Response(JSON.stringify({ ok: true, ignored: "unknown_status" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // locate local row
        let query = supabaseAdmin.from("debito_payments").select("*").limit(1);
        if (sourceId) query = query.eq("source_id", sourceId);
        else if (paymentId) query = query.eq("debito_payment_id", paymentId);
        else if (reference) query = query.eq("debito_reference", reference);
        else {
          return new Response(JSON.stringify({ ok: true, ignored: "no_identifier" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        const { data: rows } = await query;
        const row = rows?.[0];
        if (!row) {
          return new Response(JSON.stringify({ ok: true, ignored: "unknown_row" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        const updates: Record<string, unknown> = {
          status: newStatus,
          raw_webhook: sanitizePayload(payload) as never,
        };
        if (paymentId && !row.debito_payment_id) updates.debito_payment_id = paymentId;
        if (reference && !row.debito_reference) updates.debito_reference = reference;
        if (newStatus === "success") updates.completed_at = new Date().toISOString();

        await supabaseAdmin.from("debito_payments").update(updates as never).eq("id", row.id);

        if (row.status !== "success" && newStatus === "success") {
          if (row.kind === "pack" && row.pack_kind && row.pack_quantity) {
            const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
              "credit_pack_debito",
              {
                _user_id: row.user_id,
                _pack_kind: row.pack_kind,
                _quantity: row.pack_quantity,
                _amount_minor: Math.round(Number(row.amount) * 100),
                _currency: row.currency ?? "MZN",
                _source_id: row.source_id,
                _debito_payment_id: row.debito_payment_id ?? paymentId ?? "",
              },
            );
            if (rpcErr) {
              console.error("[debito-webhook] credit_pack_debito failed", {
                source_id: row.source_id,
                error: rpcErr,
              });
            } else {
              console.log("[debito-webhook] credit_pack_debito ok", {
                source_id: row.source_id,
                result: rpcData,
              });
            }
          } else if (row.kind === "plan" && row.plan_tier) {
            let days = row.plan_days as number | null;
            if (!days) {
              const { PLAN_PRICES } = await import("@/lib/pricing");
              const p = PLAN_PRICES[row.plan_tier as "select" | "plus" | "elite"];
              days = row.billing_period === "annual" ? p.annualDays : p.monthlyDays;
            }
            const { error: actErr } = await supabaseAdmin.rpc("activate_membership_debito", {
              _user_id: row.user_id,
              _plan_tier: row.plan_tier,
              _days: days,
            });
            if (actErr) {
              console.error("[debito-webhook] activate_membership_debito failed", {
                source_id: row.source_id,
                error: actErr,
              });
            }
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
