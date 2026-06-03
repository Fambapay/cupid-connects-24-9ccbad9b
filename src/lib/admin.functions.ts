import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Admin middleware ─────────────────────────────────────────────────────
const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const email = (context.claims as { email?: string } | null)?.email?.toLowerCase();
    if (!email) throw new Error("Forbidden: no email in token");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_emails")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Forbidden: not an admin");

    return next({
      context: { ...context, adminEmail: email, supabaseAdmin },
    });
  });

async function logAction(
  supabaseAdmin: any,
  actorId: string,
  actorEmail: string,
  action: string,
  targetId: string | null,
  targetKind: string | null,
  meta: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    target_id: targetId,
    target_kind: targetKind,
    meta,
  });
}

// ─── Dashboard / KPIs ─────────────────────────────────────────────────────
export const getAdminKpis = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const sb = context.supabaseAdmin;
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      totalUsers,
      onboardedUsers,
      activeUsers7d,
      totalMatches,
      totalMessages,
      premiumActive,
      paymentsToday,
      paymentsMonth,
      paymentsAll,
      pendingVerifications,
    ] = await Promise.all([
      sb.from("profiles").select("id", { head: true, count: "exact" }),
      sb.from("profiles").select("id", { head: true, count: "exact" }).eq("onboarding_completed", true),
      sb.from("profiles").select("id", { head: true, count: "exact" }).gte("last_active_at", d7),
      sb.from("matches").select("id", { head: true, count: "exact" }),
      sb.from("messages").select("id", { head: true, count: "exact" }),
      sb.from("profiles").select("id", { head: true, count: "exact" })
        .eq("membership_status", "active").gt("membership_expires_at", now.toISOString()),
      sb.from("debito_payments").select("amount").eq("status", "paid").gte("created_at", startOfDay),
      sb.from("debito_payments").select("amount").eq("status", "paid").gte("created_at", startOfMonth),
      sb.from("debito_payments").select("amount").eq("status", "paid"),
      sb.from("verification_requests").select("id", { head: true, count: "exact" }).eq("status", "pending"),
    ]);

    const sum = (rows: { amount: number | string }[] | null) =>
      (rows ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);

    return {
      users: {
        total: totalUsers.count ?? 0,
        onboarded: onboardedUsers.count ?? 0,
        active7d: activeUsers7d.count ?? 0,
        premium: premiumActive.count ?? 0,
      },
      engagement: {
        matches: totalMatches.count ?? 0,
        messages: totalMessages.count ?? 0,
      },
      revenue: {
        today: sum(paymentsToday.data),
        month: sum(paymentsMonth.data),
        all: sum(paymentsAll.data),
        currency: "MZN",
      },
      moderation: {
        pendingVerifications: pendingVerifications.count ?? 0,
      },
      generatedAt: now.toISOString(),
    };
  });

export const getRevenueSeries = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { days?: number }) => ({ days: Math.min(Math.max(d.days ?? 30, 7), 180) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: rows, error } = await sb
      .from("debito_payments")
      .select("amount, created_at, status")
      .eq("status", "paid")
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const byDay = new Map<string, number>();
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const k = d.toISOString().slice(0, 10);
      byDay.set(k, 0);
    }
    (rows ?? []).forEach((r) => {
      const k = String(r.created_at).slice(0, 10);
      byDay.set(k, (byDay.get(k) ?? 0) + Number(r.amount || 0));
    });
    return Array.from(byDay.entries()).map(([day, amount]) => ({ day, amount }));
  });

// ─── Users ────────────────────────────────────────────────────────────────
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { search?: string; limit?: number; offset?: number; filter?: "all" | "verified" | "premium" | "paused" }) => ({
    search: (d.search ?? "").trim(),
    limit: Math.min(Math.max(d.limit ?? 25, 1), 100),
    offset: Math.max(d.offset ?? 0, 0),
    filter: d.filter ?? "all",
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    let q = sb
      .from("profiles")
      .select(
        "id, name, age, city, country, gender, is_verified, is_paused, membership_status, membership_tier, membership_expires_at, last_active_at, created_at, onboarding_completed",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.filter === "verified") q = q.eq("is_verified", true);
    if (data.filter === "premium") q = q.eq("membership_status", "active");
    if (data.filter === "paused") q = q.eq("is_paused", true);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    // Fetch emails from auth.users
    const ids = (rows ?? []).map((r) => r.id);
    let emailMap = new Map<string, string>();
    if (ids.length) {
      const { data: usersResp } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
      const wanted = new Set(ids);
      usersResp?.users.forEach((u) => {
        if (wanted.has(u.id) && u.email) emailMap.set(u.id, u.email);
      });
    }
    return {
      rows: (rows ?? []).map((r) => ({ ...r, email: emailMap.get(r.id) ?? null })),
      total: count ?? 0,
    };
  });

export const getUserDetail = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const [profile, photos, prompts, credits, settings, swipes, matchesA, matchesB, msgs, purchases, payments, auth] =
      await Promise.all([
        sb.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
        sb.from("profile_photos").select("*").eq("profile_id", data.userId).order("position"),
        sb.from("profile_prompts").select("*").eq("profile_id", data.userId).order("position"),
        sb.from("user_credits").select("*").eq("user_id", data.userId).maybeSingle(),
        sb.from("user_settings").select("*").eq("user_id", data.userId).maybeSingle(),
        sb.from("swipes").select("id", { head: true, count: "exact" }).eq("swiper_id", data.userId),
        sb.from("matches").select("id", { head: true, count: "exact" }).eq("user_a", data.userId),
        sb.from("matches").select("id", { head: true, count: "exact" }).eq("user_b", data.userId),
        sb.from("messages").select("id", { head: true, count: "exact" }).eq("sender_id", data.userId),
        sb.from("credit_purchases").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
        sb.from("debito_payments").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
        sb.auth.admin.getUserById(data.userId),
      ]);

    // Sign photo URLs
    const photoUrls = await Promise.all(
      (photos.data ?? []).map(async (p) => {
        const { data: signed } = await sb.storage
          .from("profile-photos")
          .createSignedUrl(p.storage_path, 60 * 60);
        return { ...p, url: signed?.signedUrl ?? null };
      }),
    );

    return {
      profile: profile.data,
      email: auth.data?.user?.email ?? null,
      emailConfirmedAt: auth.data?.user?.email_confirmed_at ?? null,
      lastSignInAt: auth.data?.user?.last_sign_in_at ?? null,
      photos: photoUrls,
      prompts: prompts.data ?? [],
      credits: credits.data,
      settings: settings.data,
      stats: {
        swipes: swipes.count ?? 0,
        matches: (matchesA.count ?? 0) + (matchesB.count ?? 0),
        messages: msgs.count ?? 0,
      },
      purchases: purchases.data ?? [],
      payments: payments.data ?? [],
    };
  });

export const setUserPaused = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; paused: boolean }) =>
    z.object({ userId: z.string().uuid(), paused: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const { error } = await sb.from("profiles").update({ is_paused: data.paused }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAction(sb, context.userId, context.adminEmail, data.paused ? "user.pause" : "user.unpause", data.userId, "profile", {});
    return { ok: true };
  });

export const setUserVerified = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; verified: boolean }) =>
    z.object({ userId: z.string().uuid(), verified: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const { error } = await sb.from("profiles").update({ is_verified: data.verified }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAction(sb, context.userId, context.adminEmail, data.verified ? "user.verify" : "user.unverify", data.userId, "profile", {});
    return { ok: true };
  });

export const setUserMembership = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; tier: string; days: number }) =>
    z.object({
      userId: z.string().uuid(),
      tier: z.enum(["free", "plus", "gold", "platinum"]),
      days: z.number().int().min(0).max(3650),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    if (data.tier === "free" || data.days === 0) {
      const { error } = await sb.from("profiles").update({
        membership_status: "inactive",
        membership_tier: "free",
        membership_expires_at: null,
      }).eq("id", data.userId);
      if (error) throw new Error(error.message);
    } else {
      const expiry = new Date(Date.now() + data.days * 86400000).toISOString();
      const { error } = await sb.from("profiles").update({
        membership_status: "active",
        membership_tier: data.tier,
        membership_expires_at: expiry,
      }).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }
    await logAction(sb, context.userId, context.adminEmail, "user.set_membership", data.userId, "profile", { tier: data.tier, days: data.days });
    return { ok: true };
  });

export const grantUserCredits = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; kind: "boost" | "super_like"; quantity: number }) =>
    z.object({
      userId: z.string().uuid(),
      kind: z.enum(["boost", "super_like"]),
      quantity: z.number().int().min(-100).max(100),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    // Ensure row exists
    await sb.from("user_credits").upsert({ user_id: data.userId }, { onConflict: "user_id" });
    const { data: current } = await sb.from("user_credits").select("*").eq("user_id", data.userId).maybeSingle();
    const col = data.kind === "boost" ? "boost_balance" : "super_like_balance";
    const next = Math.max(0, ((current?.[col] as number | undefined) ?? 0) + data.quantity);
    const { error } = await sb.from("user_credits").update({ [col]: next, updated_at: new Date().toISOString() }).eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await logAction(sb, context.userId, context.adminEmail, "user.grant_credits", data.userId, "user_credits", { kind: data.kind, quantity: data.quantity, new_balance: next });
    return { ok: true, new_balance: next };
  });

export const deleteUserPhoto = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { photoId: string }) => z.object({ photoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const { data: row } = await sb.from("profile_photos").select("*").eq("id", data.photoId).maybeSingle();
    if (!row) throw new Error("Photo not found");
    await sb.storage.from("profile-photos").remove([row.storage_path]);
    await sb.from("profile_photos").delete().eq("id", data.photoId);
    await logAction(sb, context.userId, context.adminEmail, "photo.delete", row.profile_id, "profile_photo", { photo_id: data.photoId });
    return { ok: true };
  });

export const deleteUserPrompt = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { promptId: string }) => z.object({ promptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const { data: row } = await sb.from("profile_prompts").select("profile_id").eq("id", data.promptId).maybeSingle();
    if (!row) throw new Error("Prompt not found");
    await sb.from("profile_prompts").delete().eq("id", data.promptId);
    await logAction(sb, context.userId, context.adminEmail, "prompt.delete", row.profile_id, "profile_prompt", { prompt_id: data.promptId });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const { error } = await sb.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAction(sb, context.userId, context.adminEmail, "user.delete", data.userId, "user", {});
    return { ok: true };
  });

// ─── Payments ─────────────────────────────────────────────────────────────
export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { status?: string; limit?: number; offset?: number }) => ({
    status: d.status ?? "all",
    limit: Math.min(Math.max(d.limit ?? 30, 1), 200),
    offset: Math.max(d.offset ?? 0, 0),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    let q = sb
      .from("debito_payments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ─── Audit logs ───────────────────────────────────────────────────────────
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { limit?: number; offset?: number }) => ({
    limit: Math.min(Math.max(d.limit ?? 50, 1), 200),
    offset: Math.max(d.offset ?? 0, 0),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const { data: rows, error, count } = await sb
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ─── CSV export ───────────────────────────────────────────────────────────
export const exportUsersCsv = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const sb = context.supabaseAdmin;
    const { data: rows, error } = await sb
      .from("profiles")
      .select("id, name, age, city, country, gender, is_verified, is_paused, membership_status, membership_tier, membership_expires_at, last_active_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);
    const headers = ["id", "name", "age", "city", "country", "gender", "is_verified", "is_paused", "membership_status", "membership_tier", "membership_expires_at", "last_active_at", "created_at"];
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [headers.join(",")];
    (rows ?? []).forEach((r: any) => lines.push(headers.map((h) => escape(r[h])).join(",")));
    return { csv: lines.join("\n"), filename: `users-${new Date().toISOString().slice(0, 10)}.csv` };
  });
