import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort cleanup of related rows (no FK cascade exists)
    await supabaseAdmin.from("profile_photos").delete().eq("profile_id", userId);
    await supabaseAdmin.from("user_settings").delete().eq("user_id", userId);
    await supabaseAdmin.from("blocked_users").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Delete storage folder
    const { data: files } = await supabaseAdmin.storage
      .from("profile-photos")
      .list(userId, { limit: 1000 });
    if (files && files.length > 0) {
      await supabaseAdmin.storage
        .from("profile-photos")
        .remove(files.map((f) => `${userId}/${f.name}`));
    }

    // Finally delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
