import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Crown, Shield, Sparkles, Flame, Star, Lock, Clock, TrendingUp, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { requireAuthAndOnboarding } from "@/lib/authGuard";
import { PLAN_CARDS, formatPrice, type PlanCardConfig } from "@/lib/plans";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/membership")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: "Hunie Membership — Desbloqueia tudo" },
      { name: "description", content: "Escolhe o teu plano Hunie: Select, Plus ou Elite. Pagamento seguro via M-Pesa, e-Mola, mKesh ou cartão." },
    ],
  }),
  component: MembershipPage,
});

// ── Mental trigger: live social proof ticker ─────────────────────────────
const TICKER_MESSAGES = [
  { name: "Aida", city: "Maputo", action: "acabou de subscrever Plus", t: "agora" },
  { name: "Bruno", city: "Matola", action: "começou um match Premium", t: "há 1 min" },
  { name: "Carla", city: "Beira", action: "subscreveu Elite", t: "há 2 min" },
  { name: "Dércio", city: "Maputo", action: "subscreveu Plus", t: "há 3 min" },
  { name: "Eunice", city: "Nampula", action: "subscreveu Select", t: "há 4 min" },
  { name: "Filipe", city: "Tete", action: "subscreveu Plus", t: "há 5 min" },
];

function useCountdown(targetMinutes: number) {
  const [secondsLeft, setSecondsLeft] = useState(targetMinutes * 60);
  useEffect(() => {
    const i = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : targetMinutes * 60)), 1000);
    return () => clearInterval(i);
  }, [targetMinutes]);
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function MembershipPage() {
  const navigate = useNavigate();
  const { subscription, isPremium } = useSubscription();
  const { reload } = useProfile();
  const [selected, setSelected] = useState<PlanCardConfig | null>(null);
  const [expanded, setExpanded] = useState<string>("plus");
  const [tickerIdx, setTickerIdx] = useState(0);
  const countdown = useCountdown(14); // urgency: 14min flash offer

  useEffect(() => {
    const i = setInterval(() => setTickerIdx((x) => (x + 1) % TICKER_MESSAGES.length), 3200);
    return () => clearInterval(i);
  }, []);

  const currentTier = subscription.membershipTier;
  const expiresAt = subscription.expiresAt;
  const ticker = TICKER_MESSAGES[tickerIdx];

  const handleSelect = (plan: PlanCardConfig) => {
    if (isPremium && currentTier === plan.tier) {
      toast.info(`Já tens o plano ${plan.label} ativo`);
      return;
    }
    setSelected(plan);
  };

  // Anchor pricing display: cost per day
  const perDay = (mzn: number) => Math.round(mzn / 30);
  const expandedPlan = useMemo(
    () => PLAN_CARDS.find((p) => p.tier === expanded) ?? PLAN_CARDS[1],
    [expanded]
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* radial glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(240,70,140,0.40) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] opacity-50"
        style={{
          background:
            "radial-gradient(40% 40% at 80% 20%, rgba(201,168,76,0.18) 0%, rgba(0,0,0,0) 70%), radial-gradient(40% 40% at 15% 30%, rgba(91,184,255,0.18) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      <header className="sticky top-0 z-30 flex items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 backdrop-blur-md">
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] active:scale-95 transition"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-extrabold">Hunie Membership</h1>
      </header>

      <div className="px-5 pb-40">
        {/* Hero with mental triggers */}
        <div className="mt-3 text-center">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300"
          >
            <Flame size={12} className="animate-pulse" /> Oferta de lançamento
          </motion.div>
          <h2 className="mt-3 text-[34px] font-black leading-[1.05]">
            Sê visto primeiro.<br />
            <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Sem limites.
            </span>
          </h2>
          <p className="mt-2 text-sm text-white/65">
            10× mais matches em média no primeiro mês.
          </p>

          {/* Star rating - social proof */}
          <div className="mt-3 inline-flex items-center gap-1.5">
            <div className="flex">
              {[0,1,2,3,4].map((i) => (
                <Star key={i} size={13} className="fill-amber-300 text-amber-300" />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-white/70">4.8 · 12.430 reviews</span>
          </div>
        </div>

        {/* Urgency countdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/15 via-pink-500/10 to-amber-400/10 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-fuchsia-500/20">
              <Clock size={16} className="text-fuchsia-300" />
            </div>
            <div>
              <div className="text-[12px] font-bold">Bónus de boas-vindas</div>
              <div className="text-[10px] text-white/60">+1 Boost grátis nas próximas</div>
            </div>
          </div>
          <div className="rounded-xl bg-black/40 px-2.5 py-1.5 font-mono text-sm font-extrabold tabular-nums text-fuchsia-200">
            {countdown}
          </div>
        </motion.div>

        {/* Live ticker - social proof */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={tickerIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-[12px]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-white/85">
                <span className="font-bold">{ticker.name}</span>
                <span className="text-white/55"> de {ticker.city} </span>
                {ticker.action}
              </span>
              <span className="ml-auto text-[10px] text-white/40">{ticker.t}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {isPremium && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs">
            <span className="font-semibold text-emerald-300">
              Plano {currentTier} ativo
            </span>
            {expiresAt && (
              <span className="ml-1 text-emerald-200/80">
                — expira a {expiresAt.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        )}

        {/* Plans */}
        <div className="mt-5 space-y-3">
          {PLAN_CARDS.map((plan) => {
            const isCurrent = isPremium && currentTier === plan.tier;
            const isExpanded = expanded === plan.tier;
            const isPopular = plan.badge === "Mais popular";
            return (
              <motion.div
                key={plan.tier}
                layout
                whileTap={{ scale: 0.995 }}
                className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur"
                style={{
                  borderColor: isExpanded ? `${plan.accent}aa` : "rgba(255,255,255,0.08)",
                  boxShadow: isExpanded ? `0 20px 60px -22px ${plan.accent}90` : undefined,
                }}
              >
                {isPopular && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{
                      background: `radial-gradient(80% 40% at 50% 0%, ${plan.accent}22 0%, transparent 70%)`,
                    }}
                  />
                )}
                <button
                  onClick={() => setExpanded(isExpanded ? "" : plan.tier)}
                  className="relative flex w-full items-start justify-between gap-3 px-4 pt-4 pb-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black tracking-tight">{plan.label}</span>
                      {plan.badge && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: `${plan.accent}25`, color: plan.accent }}
                        >
                          {plan.badge}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                          Atual
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/60">{plan.tagline}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-black">{formatPrice(plan.priceMzn)}</div>
                    <div className="text-[10px] text-white/50">
                      ≈ {perDay(plan.priceMzn)} MZN/dia
                    </div>
                  </div>
                </button>

                <motion.div
                  initial={false}
                  animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="relative overflow-hidden"
                >
                  <ul className="space-y-1.5 px-4 pb-3 text-sm">
                    {plan.highlights.map((h) => (
                      <li key={h.label} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 shrink-0" style={{ color: plan.accent }} />
                        <span className={h.bold ? "font-semibold" : "text-white/85"}>{h.label}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="px-4 pb-4">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelect(plan)}
                      className="relative h-12 w-full overflow-hidden rounded-2xl text-sm font-bold text-white shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${plan.accent}, ${plan.accent}cc)`,
                      }}
                    >
                      <span className="relative z-10">
                        {isCurrent ? "Plano atual" : `Subscrever ${plan.label} — ${formatPrice(plan.priceMzn)}`}
                      </span>
                      {!isCurrent && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 blur-md"
                          animate={{ x: ["0%", "400%"] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </motion.button>
                    <p className="mt-2 text-center text-[10px] text-white/45">
                      Cancela quando quiseres · Sem fidelização
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Loss aversion comparison */}
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/60">
            <TrendingUp size={12} /> O que perdes no plano grátis
          </div>
          <ul className="space-y-1.5 text-xs text-white/70">
            <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Não vês quem te curtiu</li>
            <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Apenas 25 likes por dia</li>
            <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Sem Boost — perdes 90% da visibilidade</li>
            <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Sem rewind para corrigir erros</li>
          </ul>
        </div>

        {/* Testimonial - authority/social proof */}
        <div className="mt-4 rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-sm font-black">
              AC
            </div>
            <div>
              <div className="text-[13px] font-bold">Ana C. · Maputo</div>
              <div className="flex items-center gap-1 text-[10px] text-amber-300">
                {[0,1,2,3,4].map((i) => <Star key={i} size={9} className="fill-current" />)}
                <span className="ml-1 text-white/50">há 3 dias</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/85">
            "Em duas semanas com o Plus tive mais encontros do que em meses no plano grátis. Vale cada metical." 💖
          </p>
        </div>

        {/* Trust row */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[10px] text-white/65">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
            <Lock size={14} className="mx-auto mb-1 text-emerald-400" />
            <div className="font-semibold">SSL encriptado</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
            <Shield size={14} className="mx-auto mb-1 text-sky-400" />
            <div className="font-semibold">Garantia 7 dias</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
            <Sparkles size={14} className="mx-auto mb-1 text-fuchsia-400" />
            <div className="font-semibold">Ativação imediata</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-white/40">
          <span>M-Pesa</span>·<span>e-Mola</span>·<span>mKesh</span>·<span>Visa</span>·<span>Mastercard</span>
        </div>

        <p className="mt-3 text-center text-[10px] text-white/35">
          Ao subscrever aceitas os Termos. Renova automaticamente. Cancela a qualquer momento.
        </p>
      </div>

      {/* Sticky CTA bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/8 bg-black/85 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] text-white/55">
              <Heart size={10} className="fill-pink-400 text-pink-400" /> Plano selecionado
            </div>
            <div className="truncate text-sm font-extrabold">
              {expandedPlan.label} · {formatPrice(expandedPlan.priceMzn)}
              <span className="ml-1 text-[10px] font-normal text-white/45">/mês</span>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSelect(expandedPlan)}
            className="relative h-12 overflow-hidden rounded-2xl px-5 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(240,70,140,0.6)]"
            style={{
              background: `linear-gradient(135deg, ${expandedPlan.accent}, ${expandedPlan.accent}cc)`,
            }}
          >
            <span className="relative z-10">Continuar →</span>
          </motion.button>
        </div>
      </div>

      {selected && (
        <DebitoCheckoutSheet
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Hunie ${selected.label}`}
          subtitle={`Subscrição mensal — ${formatPrice(selected.priceMzn)}`}
          amountMzn={selected.priceMzn}
          planTier={selected.tier}
          onSuccess={async () => {
            await reload();
            toast.success(`Bem-vindo ao Hunie ${selected.label}!`);
          }}
        />
      )}
    </div>
  );
}
