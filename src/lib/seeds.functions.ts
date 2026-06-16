import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const email = (context.claims as { email?: string } | null)?.email?.toLowerCase();
    if (!email) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_emails")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (!data) throw new Error("Forbidden");
    return next({ context: { ...context, adminEmail: email, supabaseAdmin } });
  });

// ─── List seeds ─────────────────────────────────────────────────────────────
export const listSeeds = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        city: z.string().optional(),
        gender: z.string().optional(),
        search: z.string().optional(),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    let q = sb
      .from("profiles")
      .select("id,name,age,city,gender,seed_active,last_active_at", { count: "exact" })
      .eq("is_seed", true)
      .order("name", { ascending: true });

    if (data.city) q = q.eq("city", data.city);
    if (data.gender) q = q.eq("gender", data.gender);
    if (data.search) q = q.ilike("name", `%${data.search}%`);

    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);

    // fetch first photo for each
    const ids = (rows ?? []).map((r) => r.id as string);
    let photosByProfile: Record<string, string> = {};
    if (ids.length) {
      const { data: photos } = await sb
        .from("profile_photos")
        .select("profile_id,storage_path")
        .in("profile_id", ids)
        .eq("position", 0);
      (photos ?? []).forEach((p) => {
        photosByProfile[p.profile_id as string] = p.storage_path as string;
      });
    }

    return {
      rows: (rows ?? []).map((r) => ({
        ...r,
        photo: photosByProfile[r.id as string] ?? null,
      })),
      total: count ?? 0,
    };
  });

// ─── Toggle one ─────────────────────────────────────────────────────────────
export const toggleSeed = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin
      .from("profiles")
      .update({ seed_active: data.active })
      .eq("id", data.id)
      .eq("is_seed", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Toggle all ─────────────────────────────────────────────────────────────
export const toggleAllSeeds = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin
      .from("profiles")
      .update({ seed_active: data.active })
      .eq("is_seed", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Stats ──────────────────────────────────────────────────────────────────
export const getSeedStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const sb = context.supabaseAdmin;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ count: totalSeeds }, { count: activeSeeds }, { count: realUsers }, { data: cfg }] =
      await Promise.all([
        sb.from("profiles").select("id", { count: "exact", head: true }).eq("is_seed", true),
        sb
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_seed", true)
          .eq("seed_active", true),
        sb
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_seed", false)
          .eq("onboarding_completed", true),
        sb.from("app_config").select("key,value").in("key", ["seeds_auto_disable_threshold", "seeds_auto_disabled_at"]),
      ]);

    // likes received by seeds this week
    const { data: seedIds } = await sb.from("profiles").select("id").eq("is_seed", true);
    const ids = (seedIds ?? []).map((r) => r.id as string);
    let likesThisWeek = 0;
    if (ids.length) {
      const { count } = await sb
        .from("swipes")
        .select("id", { count: "exact", head: true })
        .in("swiped_id", ids)
        .in("direction", ["like", "super"])
        .gte("created_at", weekAgo);
      likesThisWeek = count ?? 0;
    }

    const threshold = (cfg ?? []).find((c) => c.key === "seeds_auto_disable_threshold")?.value;
    const autoDisabledAt = (cfg ?? []).find((c) => c.key === "seeds_auto_disabled_at")?.value;

    return {
      totalSeeds: totalSeeds ?? 0,
      activeSeeds: activeSeeds ?? 0,
      realUsers: realUsers ?? 0,
      likesThisWeek,
      threshold: typeof threshold === "number" ? threshold : Number(threshold ?? 500),
      autoDisabledAt: autoDisabledAt ?? null,
    };
  });

// ─── Set threshold ──────────────────────────────────────────────────────────
export const setSeedThreshold = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ value: z.number().int().min(1).max(1000000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabaseAdmin
      .from("app_config")
      .upsert({ key: "seeds_auto_disable_threshold", value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Generate seeds (creates auth users + profiles + photos) ────────────────
export const generateSeeds = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        city: z.string().min(1).max(60),
        count: z.number().int().min(1).max(50),
        gender: z.enum(["feminino", "masculino", "nao_binario"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;
    const { buildSeedProfiles } = await import("./seeds-pool.server");
    const profiles = buildSeedProfiles(data);

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const p of profiles) {
      const slug = `${p.name}-${p.city}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z0-9]+/g, "-");
      const email = `seed-${slug}@seeds.hunie.local`;

      const { data: userRes, error: uErr } = await sb.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID(),
        user_metadata: { is_seed: true, name: p.name },
      });
      if (uErr || !userRes?.user) {
        errors.push(`${p.name}: ${uErr?.message ?? "no user"}`);
        skipped++;
        continue;
      }
      const id = userRes.user.id;

      const { error: pErr } = await sb.from("profiles").upsert(
        {
          id,
          name: p.name,
          age: p.age,
          birthdate: p.birthdate,
          city: p.city,
          country: p.country,
          latitude: p.latitude,
          longitude: p.longitude,
          bio: p.bio,
          gender: p.gender,
          interests: p.interests,
          interested_in: [],
          is_verified: true,
          is_paused: false,
          is_incognito: false,
          membership_tier: "free",
          membership_status: "inactive",
          onboarding_completed: true,
          onboarding_step: 99,
          is_seed: true,
          seed_active: true,
          last_active_at: p.last_active_at,
        },
        { onConflict: "id" },
      );
      if (pErr) {
        errors.push(`${p.name}: ${pErr.message}`);
        skipped++;
        continue;
      }

      const photoRows = p.photos.map((url, i) => ({
        profile_id: id,
        storage_path: url,
        position: i,
      }));
      await sb.from("profile_photos").insert(photoRows);
      inserted++;
    }

    return { inserted, skipped, errors: errors.slice(0, 5) };
  });
