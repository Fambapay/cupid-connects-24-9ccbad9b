import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PAYMENT_METHODS,
  MOBILE_MONEY_METHODS,
  LIVE_DEBITO_METHODS,
  isAllowedReturnUrl,
  sanitizePayload,
  getPlanAmount,
  getPlanDays,
  getPlanPrices,
  getPacks,
  getCurrency,
  type PaymentMethod,
  type BillingPeriod,
} from "./pricing";
import {
  DEFAULT_COUNTRY,
  COUNTRY_CONFIG,
  normalizePhoneForCountry,
  type CountryCode,
} from "./country/config";

const ORCHESTRATOR_URL =
  "https://gyqoaningqhurhvdugne.supabase.co/functions/v1/payment-orchestrator";

function defaultReturnUrl(country: CountryCode) {
  const host = COUNTRY_CONFIG[country]?.defaultReturnHost ?? "hunie.app";
  return `https://${host}/app?subscription=success`;
}

const InputSchema = z.object({
  plan_tier: z.enum(["select", "plus", "elite"]).optional(),
  billing_period: z.enum(["monthly", "annual"]).optional(),
  pack_id: z.string().optional(),
  payment_method: z.enum(PAYMENT_METHODS),
  phone: z.string().optional(),
  return_url: z.string().url().optional(),
  customer_name: z.string().max(120).optional(),
  customer_email: z.string().email().optional(),
  country: z.enum(["MZ", "AO", "ZA", "PT"]).optional(),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createDebitoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => {
    const parsed = InputSchema.parse(input);
    if (!parsed.plan_tier && !parsed.pack_id) {
      throw new Error("plan_tier or pack_id required");
    }
    return parsed;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const country: CountryCode = (data.country ?? DEFAULT_COUNTRY) as CountryCode;
    const countryCfg = COUNTRY_CONFIG[country] ?? COUNTRY_CONFIG[DEFAULT_COUNTRY];
    const currency = getCurrency(country);

    // ── Validate method against country's enabled list ──
    if (!countryCfg.payments.includes(data.payment_method as never)) {
      return {
        success: false,
        error: "method_not_available",
        message: `${data.payment_method} não está disponível em ${countryCfg.name}.`,
      } as const;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ── Rate limit: ≥3 pending in last 60s → 429 ──
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("debito_payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("created_at", sinceIso);
    if ((count ?? 0) >= 3) {
      return {
        success: false,
        error: "rate_limited",
        message: "Aguarda um momento e tenta de novo.",
      } as const;
    }

    // ── Resolve kind + amount (server-recomputed, never trust client) ──
    const kind: "plan" | "pack" = data.pack_id ? "pack" : "plan";
    let amount = 0;
    let plan_tier: string | null = null;
    let pack_id: string | null = null;
    let pack_kind: "boost" | "super_like" | null = null;
    let pack_quantity: number | null = null;
    let plan_days = 30;
    const period: BillingPeriod = (data.billing_period ?? "monthly") as BillingPeriod;

    if (kind === "plan") {
      const p = getPlanPrices(country)[data.plan_tier!];
      if (!p) throw new Error("Invalid plan_tier");
      plan_tier = data.plan_tier!;
      amount = getPlanAmount(data.plan_tier!, period, country);
      plan_days = getPlanDays(data.plan_tier!, period, country);
    } else {
      const pack = getPacks(country)[data.pack_id!];
      if (!pack) throw new Error("Invalid pack_id");
      pack_id = pack.id;
      pack_kind = pack.kind;
      pack_quantity = pack.quantity;
      amount = pack.price;
    }

    const method = data.payment_method as PaymentMethod;
    const isMobile = MOBILE_MONEY_METHODS.includes(method);
    const liveMethod = LIVE_DEBITO_METHODS.includes(method);

    let normalizedPhone: string | null = null;
    let phone_hash: string | null = null;
    let phone_last4: string | null = null;
    if (isMobile) {
      if (!data.phone) throw new Error("Phone required for mobile money");
      normalizedPhone = normalizePhoneForCountry(data.phone, country);
      if (!normalizedPhone) throw new Error("Número de telemóvel inválido");
      phone_hash = await sha256Hex(normalizedPhone);
      phone_last4 = normalizedPhone.slice(-4);
    }

    const returnUrl = isAllowedReturnUrl(data.return_url)
      ? data.return_url!
      : defaultReturnUrl(country);

    // ── 1) Insert local pending row ──
    const { data: row, error: insErr } = await supabaseAdmin
      .from("debito_payments")
      .insert({
        user_id: userId,
        kind,
        plan_tier,
        pack_id,
        pack_kind,
        pack_quantity,
        payment_method: method,
        amount,
        currency,
        phone_hash,
        phone_last4,
        customer_email: data.customer_email ?? null,
        status: "pending",
      })
      .select("id, source_id")
      .single();
    if (insErr || !row) throw new Error("Falha ao criar pagamento");

    // ── 2a) Angola: KambaPay (Multicaixa Express + Referência MC) ──
    if (country === "AO" && (method === "multicaixa_express" || method === "referencia_mc")) {
      const { createKambapayPayment } = await import("./kambapay.server");
      const kpMethod = method === "multicaixa_express" ? "express" : "reference";
      const res = await createKambapayPayment({
        orderId: row.source_id!,
        amount: Math.round(amount),
        method: kpMethod,
        customerName: data.customer_name ?? "Hunie user",
        customerEmail: data.customer_email ?? null,
        customerPhone: kpMethod === "express" ? normalizedPhone : null,
      });

      await supabaseAdmin
        .from("debito_payments")
        .update({
          status: res.ok ? "pending" : "failed",
          debito_payment_id: res.payment?.id ?? null,
          debito_reference: res.payment?.reference?.number ?? null,
          raw_response: sanitizePayload(res.raw) as never,
        })
        .eq("id", row.id);

      if (!res.ok) {
        return {
          success: false,
          error: "gateway_error",
          message: "Não foi possível iniciar o pagamento. Tenta novamente.",
          payment_id: row.id,
        } as const;
      }

      return {
        success: true,
        payment_id: row.id,
        status: "pending" as const,
        reference: res.payment?.reference?.number ?? null,
        mc_reference: res.payment?.reference ?? null,
        checkout_url: null,
        awaiting_confirmation: kpMethod === "express",
        awaiting_provider: false,
      } as const;
    }

    // ── 2b) Methods NOT live yet (e.g. Unitel Money, cards) ──
    if (!liveMethod) {
      return {
        success: true,
        payment_id: row.id,
        status: "pending" as const,
        reference: null,
        mc_reference: null,
        checkout_url: null,
        awaiting_confirmation: false,
        awaiting_provider: true,
        message: `${method} estará disponível em breve em ${countryCfg.name}. Estamos a finalizar a integração com o operador.`,
      } as const;
    }


    // ── 2b) Live MZ orchestrator path ──
    const apiKey = process.env.DEBITO_API_KEY;
    const merchantId = process.env.DEBITO_MERCHANT_ID;
    const walletCode = process.env.DEBITO_WALLET_CODE;
    if (!apiKey || !merchantId || !walletCode) {
      throw new Error("Missing Debito Pay credentials");
    }

    const minuteBucket = Math.floor(Date.now() / 60_000);
    const idemKey = `${userId}:${plan_tier ?? pack_id}:${method}:${minuteBucket}`;

    const orchestratorBody: Record<string, unknown> = {
      action: "process",
      payment_method: method,
      merchant_id: merchantId,
      wallet_code: walletCode,
      amount,
      currency,
      source: "gateway",
      source_id: row.source_id,
      customer_name: data.customer_name ?? "Hunie user",
      customer_email: data.customer_email ?? null,
    };
    if (isMobile) orchestratorBody.phone = normalizedPhone;
    else orchestratorBody.return_url = returnUrl;

    let respJson: Record<string, unknown> = {};
    let orchestratorOk = false;
    try {
      const resp = await fetch(ORCHESTRATOR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Idempotency-Key": idemKey,
        },
        body: JSON.stringify(orchestratorBody),
      });
      respJson = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
      orchestratorOk = resp.ok;
    } catch {
      orchestratorOk = false;
    }

    const rawStatus = String((respJson as { status?: string }).status ?? "").toLowerCase();
    const mappedStatus: "success" | "failed" | "pending" =
      rawStatus === "success" || rawStatus === "completed"
        ? "success"
        : rawStatus === "failed" || rawStatus === "cancelled"
          ? "failed"
          : "pending";

    const debitoPaymentId = (respJson.payment_id ?? respJson.id ?? null) as string | null;
    const debitoReference = (respJson.reference ?? null) as string | null;
    const debitoTransactionId =
      (respJson.transactionId ?? respJson.transaction_id ?? null) as string | null;
    const checkoutUrl = (respJson.checkout_url ?? null) as string | null;

    await supabaseAdmin
      .from("debito_payments")
      .update({
        status: orchestratorOk ? mappedStatus : "failed",
        debito_payment_id: debitoPaymentId,
        debito_reference: debitoReference,
        debito_transaction_id: debitoTransactionId,
        checkout_url: checkoutUrl,
        raw_response: sanitizePayload(respJson) as never,
      })
      .eq("id", row.id);

    // ── 3) Sync success: credit immediately ──
    if (orchestratorOk && mappedStatus === "success") {
      if (kind === "pack" && pack_kind && pack_quantity) {
        await supabaseAdmin.rpc("credit_pack_debito", {
          _user_id: userId,
          _pack_kind: pack_kind,
          _quantity: pack_quantity,
          _amount_minor: Math.round(amount * 100),
          _currency: currency,
          _source_id: row.source_id,
          _debito_payment_id: debitoPaymentId ?? "",
        });
      } else if (kind === "plan" && plan_tier) {
        await supabaseAdmin.rpc("activate_membership_debito", {
          _user_id: userId,
          _plan_tier: plan_tier,
          _days: plan_days,
        });
      }
      await supabaseAdmin
        .from("debito_payments")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    if (!orchestratorOk) {
      return {
        success: false,
        error: "gateway_error",
        message: "Erro ao processar pagamento. Tenta novamente.",
        payment_id: row.id,
      } as const;
    }

    return {
      success: true,
      payment_id: row.id,
      status: mappedStatus,
      reference: debitoReference,
      checkout_url: checkoutUrl,
      awaiting_confirmation: mappedStatus === "pending",
      awaiting_provider: false,
    } as const;
  });
