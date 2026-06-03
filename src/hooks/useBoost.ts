import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface BoostStatus {
  active: boolean;
  expiresAt: Date | null;
  remainingMinutes: number;
}

export function useBoost(onInsufficient?: () => void) {
  const { user } = useAuth();
  const [status, setStatus] = useState<BoostStatus>({
    active: false,
    expiresAt: null,
    remainingMinutes: 0,
  });

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("boosts")
      .select("expires_at")
      .eq("profile_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.expires_at) {
      const exp = new Date(data.expires_at as string);
      const minutes = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 60_000));
      setStatus({ active: minutes > 0, expiresAt: exp, remainingMinutes: minutes });
    } else {
      setStatus({ active: false, expiresAt: null, remainingMinutes: 0 });
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown
  useEffect(() => {
    if (!status.active || !status.expiresAt) return;
    const tick = () => {
      const exp = status.expiresAt!;
      const minutes = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 60_000));
      setStatus((s) => ({ ...s, remainingMinutes: minutes, active: minutes > 0 }));
      if (minutes === 0) toast("⚡ O teu Boost expirou");
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [status.active, status.expiresAt]);

  const activate = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("consume_boost_credit");
    if (error) {
      toast.error("Não foi possível ativar o Boost");
      return;
    }
    const res = data as {
      success: boolean;
      reason?: string;
      expires_at?: string;
      remaining_balance?: number;
    };
    if (res.success && res.expires_at) {
      const exp = new Date(res.expires_at);
      setStatus({
        active: true,
        expiresAt: exp,
        remainingMinutes: Math.ceil((exp.getTime() - Date.now()) / 60_000),
      });
      window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
      toast.success("⚡ Boost ativado por 30 min!");
      return;
    }
    if (res.reason === "already_active") {
      toast("Boost já está ativo");
      fetchStatus();
      return;
    }
    if (res.reason === "insufficient_credits") {
      toast.error("Sem créditos de Boost");
      onInsufficient?.();
      return;
    }
  }, [user, fetchStatus, onInsufficient]);

  return { ...status, activate, refresh: fetchStatus };
}
