import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Check,
  Infinity as InfinityIcon,
  Eye,
  Star,
  Rocket,
  SlidersHorizontal,
  CheckCheck,
  Undo2,
  Globe2,
  Crown,
  Sparkles,
  ShieldCheck,
  EyeOff,
  TrendingUp,
  BarChart3,
  Headphones,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { getPlanCards, formatPrice } from "@/lib/plans";
import { type PlanTier } from "@/lib/pricing";
import { useCountry } from "@/lib/country/context";
import { paymentLabel, type PaymentMethodCode } from "@/lib/country/config";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { invalidateOnboardingCache } from "@/lib/authGuard";
import { toast } from "sonner";

export interface PaywallSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTier?: PlanTier;
}

type Benefit = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
};

const BENEFITS_BY_TIER: Record<PlanTier, Benefit[]> = {
  select: [
    { icon: InfinityIcon, label: "Likes ilimitados" },
    { icon: Eye, label: "Vê quem já gostou de ti" },
    { icon: Star, label: "1 Super Like por dia" },
    { icon: Rocket, label: "1 Boost na ativação" },
  ],
  plus: [
    { icon: InfinityIcon, label: "Likes ilimitados" },
    { icon: Eye, label: "Vê quem já gostou de ti" },
    { icon: Star, label: "5 Super Likes por dia" },
    { icon: Rocket, label: "1 Boost por semana" },
    { icon: SlidersHorizontal, label: "Filtros avançados" },
    { icon: CheckCheck, label: "Confirmação de leitura" },
    { icon: Undo2, label: "Voltar atrás no último swipe" },
    { icon: Globe2, label: "Passport — outras cidades" },
  ],
  elite: [
    { icon: TrendingUp, label: "Prioridade no topo do feed" },
    { icon: Crown, label: "Badge Elite no teu perfil" },
    { icon: Star, label: "10 Super Likes por dia" },
    { icon: Rocket, label: "1 Boost por dia" },
    { icon: EyeOff, label: "Modo invisível" },
    { icon: BarChart3, label: "Estatísticas do perfil" },
    { icon: Sparkles, label: "Acesso antecipado a novidades" },
    { icon: Headphones, label: "Suporte VIP prioritário" },
    { icon: ShieldCheck, label: "Tudo do Plus incluído" },
  ],
};

export function PaywallSheet({ open, onClose, onSuccess, defaultTier = "plus" }: PaywallSheetProps) {
  const { reload } = useProfile();
  const { country, config } = useCountry();
  const [selectedTier, setSelectedTier] = useState<PlanTier>(defaultTier);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (open) setSelectedTier(defaultTier);
  }, [open, defaultTier]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const plans = useMemo(
    () => getPlanCards(country).slice().sort((a, b) => a.priceMzn - b.priceMzn),
    [country],
  );
  const selectedPlan = plans.find((p) => p.tier === selectedTier) ?? plans[1];
  const benefits = BENEFITS_BY_TIER[selectedPlan.tier];

  const paymentSummary = useMemo(() => {
    const items = config.payments.slice(0, 3).map((p) => paymentLabel(p as PaymentMethodCode));
    return items.join(", ");
  }, [config.payments]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="paywall-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            style={{ zIndex: 10000 }}
            onClick={onClose}
          />
          <motion.div
            key="paywall-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 top-[4%] flex flex-col overflow-hidden rounded-t-[32px] border-t border-white/[0.06] bg-[#0b0b0d] text-foreground"
            style={{ zIndex: 10001, boxShadow: "0 -20px 60px rgba(0,0,0,0.6)" }}
          >
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] backdrop-blur hover:bg-white/[0.14] transition-colors"
            >
              <X size={15} className="text-white/80" />
            </button>

            <div className="relative flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(env(safe-area-inset-bottom),132px)]">
              <div className="pt-7 pb-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Hunie Premium · {config.flag} {config.name}
                </p>
                <h2
                  className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Conhece quem<br />realmente quer.
                </h2>
                <p className="mt-3 max-w-[300px] text-[15px] leading-snug text-white/55">
                  Desbloqueia tudo o que precisas para fazer matches a sério.
                </p>
              </div>

              <div className="space-y-2">
                {plans.map((plan) => {
                  const active = plan.tier === selectedTier;
                  const popular = plan.tier === "plus";
                  return (
                    <button
                      key={plan.tier}
                      onClick={() => setSelectedTier(plan.tier)}
                      className={`relative block w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
                        active
                          ? "border-white/70 bg-white/[0.06]"
                          : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                            active ? "border-white bg-white" : "border-white/25"
                          }`}
                        >
                          {active && <Check size={12} strokeWidth={3} className="text-black" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold tracking-tight text-white">
                              {plan.label}
                            </span>
                            {popular && (
                              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70">
                                Popular
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[15px] font-semibold tabular-nums text-white">
                            {formatPrice(plan.priceMzn, country)}
                          </span>
                          <span className="ml-1 text-[12px] text-white/45">/ mês</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Incluído no {selectedPlan.label}
                </p>
                <ul className="space-y-3.5">
                  {benefits.map((b) => {
                    const Icon = b.icon;
                    return (
                      <li key={b.label} className="flex items-center gap-3.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/85">
                          <Icon size={14} />
                        </span>
                        <span className="text-[15px] leading-tight text-white/90">{b.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <p className="mt-8 text-center text-[11px] leading-relaxed text-white/35">
                Renovação automática · Cancela quando quiseres<br />
                Pagamento via {paymentSummary}
              </p>
            </div>

            <div
              className="absolute inset-x-0 bottom-0 border-t border-white/[0.06] bg-[#0b0b0d] px-6 pt-3"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 18px)", zIndex: 5 }}
            >
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => setCheckoutOpen(true)}
                className="h-12 w-full rounded-full bg-white text-[15px] font-semibold text-black hover:bg-white/95 transition-colors"
              >
                Continuar · {formatPrice(selectedPlan.priceMzn, country)} / mês
              </motion.button>
            </div>
          </motion.div>

          {checkoutOpen && (
            <DebitoCheckoutSheet
              open={checkoutOpen}
              onClose={() => setCheckoutOpen(false)}
              title={`Hunie ${selectedPlan.label}`}
              subtitle={`Subscrição mensal — ${formatPrice(selectedPlan.priceMzn, country)}`}
              amountMzn={selectedPlan.priceMzn}
              planTier={selectedPlan.tier}
              billingPeriod="monthly"
              onSuccess={async () => {
                invalidateOnboardingCache();
                await reload();
                toast.success(`Bem-vindo ao Hunie ${selectedPlan.label} 🎉`);
                setCheckoutOpen(false);
                onSuccess?.();
                onClose();
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
