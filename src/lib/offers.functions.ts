// Server functions para o motor de ofertas.
// Toda a lógica de elegibilidade vive no RPC get_eligible_offer (SECURITY DEFINER).
// Frontend nunca decide sozinho o que mostrar.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OfferTrigger =
  | "trial_day_2"
  | "trial_last_24h"
  | "post_first_match"
  | "likes_received"
  | "winback_day_7"
  | "winback_day_14"
  | "always_on";

export interface OfferDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  trigger: OfferTrigger;
  plan_tier: string;
  first_period_price_minor: number;
  regular_price_minor: number;
  currency: string;
  period_months: number;
  is_discount: boolean;
  priority: number;
  bullets: string[];
}

const TRIGGERS: OfferTrigger[] = [
  "trial_day_2",
  "trial_last_24h",
  "post_first_match",
  "likes_received",
  "winback_day_7",
  "winback_day_14",
  "always_on",
];

const triggerSchema = z.enum(TRIGGERS as [OfferTrigger, ...OfferTrigger[]]);

export const getEligibleOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ trigger: triggerSchema }).parse(raw),
  )
  .handler(async ({ data, context }): Promise<OfferDTO | null> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("get_eligible_offer", {
      _trigger: data.trigger,
    });
    if (error) {
      console.error("[offers.getEligibleOffer] rpc error:", error);
      return null;
    }
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      description: row.description as string,
      trigger: row.trigger as OfferTrigger,
      plan_tier: row.plan_tier as string,
      first_period_price_minor: row.first_period_price_minor as number,
      regular_price_minor: row.regular_price_minor as number,
      currency: row.currency as string,
      period_months: row.period_months as number,
      is_discount: row.is_discount as boolean,
      priority: row.priority as number,
      bullets: Array.isArray(row.bullets) ? (row.bullets as string[]) : [],
    };
  });

export const redeemOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ offer_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("redeem_offer", {
      _offer_id: data.offer_id,
    });
    if (error) {
      return { ok: false as const, error: error.message };
    }
    return result as {
      ok: boolean;
      error?: string;
      slug?: string;
      plan_tier?: string;
      amount_minor?: number;
      regular_price_minor?: number;
      currency?: string;
      period_months?: number;
    };
  });

export const logPopupImpression = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        offer_id: z.string().uuid(),
        action: z.enum(["shown", "dismissed", "clicked_cta"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("log_popup_impression", {
      _offer_id: data.offer_id,
      _action: data.action,
    });
    if (error) console.error("[offers.logImpression]", error);
    return { ok: !error };
  });

// Preview/debug: obtém a oferta ativa mais prioritária para um trigger,
// ignorando elegibilidade. Só para testar visualmente o pop-up.
export const getOfferPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ trigger: triggerSchema }).parse(raw),
  )
  .handler(async ({ data, context }): Promise<OfferDTO | null> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("offers")
      .select("*")
      .eq("trigger", data.trigger)
      .eq("active", true)
      .order("priority", { ascending: false })
      .limit(1);
    if (error) {
      console.error("[offers.getOfferPreview]", error);
      return null;
    }
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      description: (row.description as string) ?? "",
      trigger: row.trigger as OfferTrigger,
      plan_tier: row.plan_tier as string,
      first_period_price_minor: row.first_period_price_minor as number,
      regular_price_minor: row.regular_price_minor as number,
      currency: row.currency as string,
      period_months: row.period_months as number,
      is_discount: row.is_discount as boolean,
      priority: row.priority as number,
      bullets: Array.isArray(row.bullets) ? (row.bullets as string[]) : [],
    };
  });
