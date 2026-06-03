import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REPORT_REASONS = [
  "fake_profile",
  "inappropriate_photos",
  "harassment",
  "spam_scam",
  "minor",
  "offensive_behavior",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

// ─── Unmatch ───────────────────────────────────────────────
export const unmatchUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", data.matchId)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Block (and remove any existing match) ─────────────────
export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        matchId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("Cannot block yourself");

    const { error: bErr } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: userId, blocked_id: data.userId });
    // ignore duplicate-block errors
    if (bErr && !/duplicate|unique/i.test(bErr.message)) {
      throw new Error(bErr.message);
    }

    // Delete any match (either direction)
    await supabase
      .from("matches")
      .delete()
      .or(
        `and(user_a.eq.${userId},user_b.eq.${data.userId}),and(user_a.eq.${data.userId},user_b.eq.${userId})`,
      );

    return { ok: true };
  });

// ─── Unblock ───────────────────────────────────────────────
export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Report (optionally also block + unmatch) ──────────────
export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        matchId: z.string().uuid().optional(),
        reason: z.enum(REPORT_REASONS),
        details: z.string().trim().max(1000).optional(),
        alsoBlock: z.boolean().optional().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("Cannot report yourself");

    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: data.userId,
      match_id: data.matchId ?? null,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);

    if (data.alsoBlock) {
      const { error: bErr } = await supabase
        .from("blocked_users")
        .insert({ blocker_id: userId, blocked_id: data.userId });
      if (bErr && !/duplicate|unique/i.test(bErr.message)) {
        throw new Error(bErr.message);
      }
      await supabase
        .from("matches")
        .delete()
        .or(
          `and(user_a.eq.${userId},user_b.eq.${data.userId}),and(user_a.eq.${data.userId},user_b.eq.${userId})`,
        );
    }

    return { ok: true };
  });
