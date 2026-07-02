import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Gift, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppleToast } from "@/components/notifications/AppleToast";
import { supabase } from "@/integrations/supabase/client";

type Summary = {
  code: string | null;
  completed: number;
  pending: number;
  days_earned: number;
  max_referrals: number;
  days_per_referral: number;
};

export function ReferralSection() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [alreadyReferred, setAlreadyReferred] = useState(false);

  useEffect(() => {
    (async () => {
      // Ensure code exists
      try { await supabase.rpc("get_or_create_my_referral_code"); } catch { /* noop */ }
      const { data } = await supabase.rpc("get_my_referral_summary");
      setSummary((data as unknown as Summary) ?? null);
      // Check if the current user has already been referred
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: ref } = await supabase
          .from("referrals")
          .select("id")
          .eq("referred_id", user.user.id)
          .maybeSingle();
        setAlreadyReferred(!!ref);
      }
      setLoading(false);
    })();
  }, []);

  async function handleCopy() {
    if (!summary?.code) return;
    try {
      await navigator.clipboard.writeText(summary.code);
      setCopied(true);
      toast.custom(
        (t) => (
          <AppleToast
            toastId={t}
            title="Código copiado"
            body={`${summary.code} está pronto a partilhar.`}
            onDismiss={() => toast.dismiss(t)}
          />
        ),
        { duration: 2200 },
      );
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function handleShare() {
    if (!summary?.code) return;
    const text = `Descobre o Hunie 💛 Usa o meu código ${summary.code} e ganhamos os dois dias grátis: https://hunie.app`;
    if (navigator.share) {
      try { await navigator.share({ title: "Hunie", text }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Convite copiado!");
      } catch { /* noop */ }
    }
  }

  async function handleRedeem() {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc("apply_referral_code", { _code: redeemCode.trim() });
    setRedeeming(false);
    if (error) { toast.error("Erro ao aplicar código"); return; }
    const res = data as { success: boolean; reason?: string } | null;
    if (res?.success) {
      toast.success("Código aplicado! Quando ativares a subscrição, o teu amigo ganha dias grátis.");
      setAlreadyReferred(true);
      setRedeemCode("");
    } else {
      const map: Record<string, string> = {
        code_not_found: "Código não encontrado",
        self_referral: "Não podes usar o teu próprio código",
        already_referred: "Já aplicaste um código",
        invalid_code: "Código inválido",
      };
      toast.error(map[res?.reason ?? ""] ?? "Não foi possível aplicar o código");
    }
  }

  if (loading) return null;

  const completed = summary?.completed ?? 0;
  const max = summary?.max_referrals ?? 5;
  const daysPer = summary?.days_per_referral ?? 7;
  const daysEarned = summary?.days_earned ?? 0;
  const remaining = Math.max(0, max - completed);

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-white/50">
        <Gift size={13} className="shrink-0" /> <span className="truncate">Convida amigos, ganha dias</span>
      </h3>


      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 backdrop-blur-2xl"
        style={{ background: "linear-gradient(160deg, rgba(255,79,163,0.14), rgba(177,60,255,0.10))" }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-white/80">
            Por cada amigo que subscreve, ganhas <strong className="text-white">+{daysPer} dias</strong> grátis
            (até {max} convites).
          </p>

          {/* Code */}
          <div className="mt-4 flex min-w-0 items-center gap-2 rounded-2xl bg-black/30 p-2 pl-4">
            <span className="min-w-0 flex-1 truncate font-mono text-lg font-bold tracking-widest text-white">
              {summary?.code ?? "—"}
            </span>

            <button
              onClick={handleCopy}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 active:scale-95"
              aria-label="Copiar código"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleShare}
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 active:scale-95"
              aria-label="Partilhar"
            >
              <Share2 size={16} className="text-white" />
            </button>
          </div>

          {/* Progress */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.04] px-1.5 py-3">
              <div className="text-2xl font-black text-white tabular-nums">{completed}</div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">Concluídos</div>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-1.5 py-3">
              <div className="text-2xl font-black text-white tabular-nums">{remaining}</div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">Restantes</div>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-1.5 py-3">
              <div className="text-2xl font-black text-white tabular-nums">{daysEarned}</div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">Dias ganhos</div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Redeem another user's code — only if not already referred */}
      {!alreadyReferred && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <Sparkles size={14} /> Tens um código de amigo?
          </div>
          <div className="mt-3 flex w-full min-w-0 items-center gap-2">
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="min-w-0 flex-1 rounded-xl bg-black/30 px-3 py-3 font-mono text-sm tracking-widest text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-fuchsia-400/60"
              maxLength={12}
            />
            <button
              disabled={redeeming || !redeemCode.trim()}
              onClick={handleRedeem}
              className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
            >
              {redeeming ? "..." : "Aplicar"}
            </button>
          </div>

        </div>
      )}
    </section>
  );
}
