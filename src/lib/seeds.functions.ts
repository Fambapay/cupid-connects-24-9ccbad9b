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

// Map our admin-form gender keys to the canonical English values stored on
// `profiles.gender`, which is what `interested_in` filters against.
const GENDER_CANONICAL: Record<"feminino" | "masculino" | "nao_binario", string> = {
  feminino: "woman",
  masculino: "man",
  nao_binario: "nonbinary",
};

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
    const canonical = GENDER_CANONICAL[data.gender];

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
          gender: canonical,
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

// ─── Populate existing real users with likes + matches + chats ──────────────
// Auto-creates female (or matching) seeds first if the pool is too small.
const CHAT_OPENERS = [
  "Oi! Vi o teu perfil e curti muito 😊",
  "Olá, como estás?",
  "Heyy, bom te conhecer aqui",
  "Boa noite! Adorei as tuas fotos",
  "Olá! Que coincidência ver-te aqui",
  "Oi, tudo bem contigo?",
  "Hey! Curti muito a tua bio 🙌",
];
const CHAT_REPLIES = [
  "Oi! Obrigada 😄 e tu, tudo bem?",
  "Tudo ótimo! E contigo, como tem sido a semana?",
  "Haha, obrigado(a)! O que costumas fazer ao fim-de-semana?",
  "Olá! Estou bem sim, tu?",
  "Que fixe! Conta-me mais sobre ti",
  "Adorava saber mais de ti, do que gostas de fazer",
  "Estás em Maputo? Conheces a Costa do Sol?",
  "Concordo total! Tinha boa companhia faltava só 😉",
  "Vamos combinar um café qualquer dia destes?",
  "Diz-me lá: praia ou montanha?",
];

const CANONICAL_TO_POOL: Record<string, "feminino" | "masculino" | "nao_binario"> = {
  woman: "feminino",
  transwoman: "feminino",
  man: "masculino",
  transman: "masculino",
  nonbinary: "nao_binario",
  genderfluid: "nao_binario",
  agender: "nao_binario",
  other: "nao_binario",
};

export const populateExistingUsers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        likesPerUser: z.number().int().min(0).max(20).default(6),
        matchesWithoutMessages: z.number().int().min(0).max(10).default(4),
        matchesWithMessages: z.number().int().min(0).max(10).default(3),
        autoGenerate: z.boolean().default(true),
        city: z.string().default("Maputo"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabaseAdmin;

    const { data: realUsers, error: ruErr } = await sb
      .from("profiles")
      .select("id,name,interested_in,gender")
      .eq("is_seed", false)
      .eq("onboarding_completed", true);
    if (ruErr) throw new Error(ruErr.message);
    if (!realUsers?.length) {
      return { realUsers: 0, generated: 0, likes: 0, matchesEmpty: 0, matchesChat: 0, messages: 0 };
    }

    // Auto-generate seeds for each target gender if pool too small
    let generated = 0;
    if (data.autoGenerate) {
      const targetGenders = new Set<string>();
      for (const u of realUsers) {
        const ii = (u.interested_in as string[] | null) ?? [];
        if (!ii.length) targetGenders.add("woman");
        else ii.forEach((g) => targetGenders.add(g));
      }
      const needed =
        data.likesPerUser + data.matchesWithoutMessages + data.matchesWithMessages + 4;
      const { buildSeedProfiles } = await import("./seeds-pool.server");

      for (const canonical of targetGenders) {
        const { count } = await sb
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_seed", true)
          .eq("seed_active", true)
          .eq("gender", canonical);
        const have = count ?? 0;
        if (have >= needed) continue;
        const poolGender = CANONICAL_TO_POOL[canonical] ?? "feminino";
        const toCreate = Math.min(needed - have, 25);
        const profiles = buildSeedProfiles({
          city: data.city,
          count: toCreate,
          gender: poolGender,
        });
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
          if (uErr || !userRes?.user) continue;
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
              gender: canonical,
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
          if (pErr) continue;
          const photoRows = p.photos.map((url, i) => ({
            profile_id: id,
            storage_path: url,
            position: i,
          }));
          await sb.from("profile_photos").insert(photoRows);
          generated++;
        }
      }
    }

    let likes = 0;
    let matchesEmpty = 0;
    let matchesChat = 0;
    let messages = 0;

    const rand = (n: number) => Math.floor(Math.random() * n);
    const randInt = (min: number, max: number) => min + rand(max - min + 1);
    const pick = <T,>(arr: T[]) => arr[rand(arr.length)];

    for (const user of realUsers) {
      const targets =
        (user.interested_in as string[] | null)?.length
          ? (user.interested_in as string[])
          : ["woman"];

      const { data: pool } = await sb
        .from("profiles")
        .select("id,name")
        .eq("is_seed", true)
        .eq("seed_active", true)
        .in("gender", targets)
        .limit(80);
      if (!pool?.length) continue;

      // Exclude seeds that already have a relation with this user
      const seedIds = pool.map((s) => s.id as string);
      const [{ data: existingMatchesA }, { data: existingMatchesB }, { data: existingSwipes }] =
        await Promise.all([
          sb.from("matches").select("user_b").eq("user_a", user.id).in("user_b", seedIds),
          sb.from("matches").select("user_a").eq("user_b", user.id).in("user_a", seedIds),
          sb.from("swipes").select("swiper_id").eq("swiped_id", user.id).in("swiper_id", seedIds),
        ]);
      const usedIds = new Set<string>([
        ...((existingMatchesA ?? []).map((r) => r.user_b as string)),
        ...((existingMatchesB ?? []).map((r) => r.user_a as string)),
        ...((existingSwipes ?? []).map((r) => r.swiper_id as string)),
      ]);
      const available = pool.filter((s) => !usedIds.has(s.id as string));
      const shuffled = available.sort(() => Math.random() - 0.5);
      let cursor = 0;
      const take = (n: number) => {
        const out = shuffled.slice(cursor, cursor + n);
        cursor += n;
        return out;
      };

      // Likes received → populate "Liked Me"
      for (const s of take(data.likesPerUser)) {
        const { error } = await sb
          .from("swipes")
          .insert({ swiper_id: s.id, swiped_id: user.id, direction: "like" });
        if (!error) likes++;
      }

      // Matches with no messages (recent so they show in "Novos matches")
      for (const s of take(data.matchesWithoutMessages)) {
        const sid = s.id as string;
        const [a, b] = user.id < sid ? [user.id, sid] : [sid, user.id];
        const createdAt = new Date(Date.now() - rand(3 * 86400000)).toISOString();
        const { error } = await sb.from("matches").insert({
          user_a: a,
          user_b: b,
          created_at: createdAt,
          last_message_at: createdAt,
        });
        if (!error) matchesEmpty++;
      }

      // Matches with conversation → populate chats list
      for (const s of take(data.matchesWithMessages)) {
        const sid = s.id as string;
        const [a, b] = user.id < sid ? [user.id, sid] : [sid, user.id];
        const createdAt = new Date(Date.now() - randInt(1, 7) * 86400000).toISOString();
        const { data: matchRow, error } = await sb
          .from("matches")
          .insert({
            user_a: a,
            user_b: b,
            created_at: createdAt,
            last_message_at: createdAt,
          })
          .select("id")
          .single();
        if (error || !matchRow) continue;
        matchesChat++;
        const msgCount = randInt(5, 8);
        let t = new Date(createdAt).getTime() + randInt(60_000, 300_000);
        for (let i = 0; i < msgCount; i++) {
          const sender = i === 0 ? sid : i % 2 === 0 ? sid : user.id;
          const content = i === 0 ? pick(CHAT_OPENERS) : pick(CHAT_REPLIES);
          const ts = new Date(t).toISOString();
          const { error: mErr } = await sb.from("messages").insert({
            match_id: matchRow.id,
            sender_id: sender,
            content,
            created_at: ts,
          });
          if (!mErr) messages++;
          t += randInt(120_000, 1_800_000);
        }
      }
    }

    return {
      realUsers: realUsers.length,
      generated,
      likes,
      matchesEmpty,
      matchesChat,
      messages,
    };
  });
