import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Cancels auto-renewal of the user's membership.
 * Keeps `membership_tier` and access until `membership_expires_at`,
 * but flips `membership_status` to "cancelled" so no renewal occurs.
 */
export const cancelMyMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ membership_status: "cancelled" })
      .eq("id", userId)
      .select("membership_tier, membership_status, membership_expires_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return { ok: true, profile: data };
  });
