import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Crown, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
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

function MembershipPage() {
  const navigate = useNavigate();
  const { subscription, isPremium } = useSubscription();
  const { reload } = useProfile();
  const [selected, setSelected] = useState<PlanCardConfig | null>(null);
  const [expanded, setExpanded] = useState<string>("plus");

  const currentTier = subscription.membershipTier;
  const expiresAt = subscription.expiresAt;

  const handleSelect = (plan: PlanCardConfig) => {
    if (isPremium && currentTier === plan.tier) {
      toast.info(`Já tens o plano ${plan.label} ativo`);
      return;
    }
    setSelected(plan);
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* radial glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(240,70,140,0.35) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      <header className="sticky top-0 z-10 flex items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 backdrop-blur-md">
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06]"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-extrabold">Hunie Membership</h1>
      </header>

      <div className="px-5 pb-32">
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
            <Sparkles size={12} /> Desbloqueia tudo
          </div>
          <h2 className="mt-3 text-3xl font-black leading-tight">
            Sê visto primeiro.<br />Sem limites.
          </h2>
          <p className="mt-2 text-sm text-white/60">
            +1.280 membros activaram o plano esta semana.
          </p>
        </div>

        {isPremium && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs">
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

        <div className="mt-6 space-y-3">
          {PLAN_CARDS.map((plan) => {
            const isCurrent = isPremium && currentTier === plan.tier;
            const isExpanded = expanded === plan.tier;
            return (
              <motion.div
                key={plan.tier}
                layout
                className="overflow-hidden rounded-3xl border bg-white/[0.04] backdrop-blur"
                style={{
                  borderColor: isExpanded ? `${plan.accent}aa` : "rgba(255,255,255,0.08)",
                  boxShadow: isExpanded ? `0 16px 50px -22px ${plan.accent}80` : undefined,
                }}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? "" : plan.tier)}
                  className="flex w-full items-start justify-between gap-3 px-4 pt-4 pb-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black">{plan.label}</span>
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
                    <div className="text-[10px] text-white/50">por mês</div>
                  </div>
                </button>

                <motion.div
                  initial={false}
                  animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
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
                      className="h-12 w-full rounded-2xl text-sm font-bold text-white shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${plan.accent}, ${plan.accent}cc)`,
                      }}
                    >
                      {isCurrent ? "Plano atual" : `Subscrever ${plan.label} — ${formatPrice(plan.priceMzn)}`}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-white/55">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
            <Shield size={14} className="mx-auto mb-1" />
            Pagamento seguro
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
            <Crown size={14} className="mx-auto mb-1" />
            Cancela quando quiseres
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
            <Sparkles size={14} className="mx-auto mb-1" />
            Ativação imediata
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-white/40">
          Métodos: M-Pesa, e-Mola, mKesh, Visa/Mastercard, PayFast.
        </p>
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
