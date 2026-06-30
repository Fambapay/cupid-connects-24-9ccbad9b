import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentHistoryEntry = {
  id: string;
  provider: string;
  kind: "subscription" | "credit_pack" | "one_time";
  plan_tier: "select" | "plus" | "elite" | null;
  pack_id: string | null;
  pack_kind: "boost" | "super_like" | null;
  pack_quantity: number | null;
  amount_minor: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  external_transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export const getMyPaymentHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_payment_history", { _limit: 50 });
    if (error) throw new Error(error.message);
    return (data ?? []) as PaymentHistoryEntry[];
  });

/**
 * Restore a previous purchase. Stub for future Google Play / Apple IAP integration.
 * Today there's nothing to restore: web purchases auto-activate via the Débito webhook
 * and there is no native receipt verification yet. Returns a deterministic shape so
 * the UI can show a friendly message.
 */
export const restoreMyPurchases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("membership_tier, membership_status, membership_expires_at")
      .eq("id", userId)
      .maybeSingle();

    const active =
      profile?.membership_status === "active" &&
      (!profile.membership_expires_at || new Date(profile.membership_expires_at).getTime() > Date.now());

    return {
      restored: false as const,
      hasActiveMembership: !!active,
      tier: profile?.membership_tier ?? null,
      expiresAt: profile?.membership_expires_at ?? null,
      // Hook for native billing (Google Play / Apple IAP) — implement when SDKs land.
      message: active
        ? "Já tens uma subscrição activa nesta conta."
        : "Nada a restaurar nesta conta. Se compraste com outra conta ou outro dispositivo, entra com essa conta.",
    };
  });
