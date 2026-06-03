import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProfilePrompt {
  id?: string;
  question: string;
  answer: string;
  position?: number;
}

export function useProfilePrompts(userIdOverride?: string) {
  const { user } = useAuth();
  const userId = userIdOverride ?? user?.id ?? null;
  const [prompts, setPrompts] = useState<ProfilePrompt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setPrompts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profile_prompts")
      .select("id, question, answer, position")
      .eq("profile_id", userId)
      .order("position", { ascending: true });
    setPrompts((data ?? []) as ProfilePrompt[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Replace all prompts for current user atomically. */
  const saveAll = useCallback(
    async (next: ProfilePrompt[]) => {
      if (!user) throw new Error("Not authenticated");
      const valid = next
        .map((p) => ({ question: p.question.trim(), answer: p.answer.trim() }))
        .filter((p) => p.question && p.answer);
      await supabase.from("profile_prompts").delete().eq("profile_id", user.id);
      if (valid.length) {
        await supabase.from("profile_prompts").insert(
          valid.map((p, i) => ({
            profile_id: user.id,
            question: p.question,
            answer: p.answer,
            position: i,
          })),
        );
      }
      await load();
    },
    [user, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("profile_prompts").delete().eq("id", id).eq("profile_id", user.id);
      await load();
    },
    [user, load],
  );

  return { prompts, loading, saveAll, remove, reload: load };
}
