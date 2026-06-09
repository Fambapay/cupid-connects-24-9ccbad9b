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
  Sparkles,
  Crown,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { PLAN_CARDS, formatPrice, type PlanCardConfig } from "@/lib/plans";
import { type PlanTier } from "@/lib/pricing";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { invalidateOnboardingCache } from "@/lib/authGuard";
import { toast } from "sonner";

export interface PaywallSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful payment so caller can record pending action. */
  onSuccess?: () => void;
  /** Default plan to highlight. */
  defaultTier?: PlanTier;
}

type Benefit = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint?: string;
};

// Synced with PLUS entitlements in src/lib/plans.ts (single source of truth).
const PLUS_BENEFITS: Benefit[] = [
  { icon: InfinityIcon, label: "Likes ilimitados", hint: "Sem o limite diário do Grátis" },
  { icon: Eye, label: "Vê quem já gostou de ti", hint: "Salta etapas — vai direto ao match" },
  { icon: Star, label: "5 Super Likes por dia", hint: "Destaca-te de imediato" },
  { icon: Rocket, label: "1 Boost por semana", hint: "30 min no topo do feed" },
  { icon: SlidersHorizontal, label: "Filtros avançados", hint: "Idade, distância, interesses" },
  { icon: CheckCheck, label: "Confirmação de leitura" },
  { icon: Undo2, label: "Volta atrás no último swipe" },
  { icon: Globe2, label: "Passport — desbloqueia outras cidades" },
];

export function PaywallSheet({ open, onClose, onSuccess, defaultTier = "plus" }: PaywallSheetProps) {
  const { reload } = useProfile();
  const [selectedTier, setSelectedTier] = useState<PlanTier>(defaultTier);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTier(defaultTier);
    }
  }, [open, defaultTier]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const plans = useMemo(
    () => PLAN_CARDS.slice().sort((a, b) => a.priceMzn - b.priceMzn),
    [],
  );
  const selectedPlan = plans.find((p) => p.tier === selectedTier) ?? plans[1];

  const ctaPrice = formatPrice(selectedPlan.priceMzn);
  const ctaPeriodLabel = "/ mês";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="paywall-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            key="paywall-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 top-[3%] z-[61] flex flex-col overflow-hidden rounded-t-[28px] border-t border-border/40 bg-background text-foreground shadow-2xl"
          >
            {/* Aurora glow background */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--brand-pink) 35%, transparent), transparent 70%), radial-gradient(50% 50% at 90% 20%, color-mix(in oklab, var(--brand-purple) 30%, transparent), transparent 70%)",
              }}
            />

            {/* Drag handle */}
            <div className="relative flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/60 backdrop-blur hover:bg-background/80 transition-colors"
            >
              <X size={16} />
            </button>

            {/* Scrollable body */}
            <div className="relative flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),120px)]">
              {/* Hero */}
              <div className="pt-6 pb-5 text-center">
                <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
                  <Sparkles size={11} className="text-primary" />
                  Hunie Premium
                </div>
                <h2
                  className="text-3xl font-black leading-[1.05] tracking-tight text-gradient-sunset"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Encontra alguém,<br />não percas tempo.
                </h2>
                <p className="mx-auto mt-3 max-w-[280px] text-sm text-muted-foreground">
                  Desbloqueia tudo o que precisas para fazer matches a sério.
                </p>
              </div>

              {/* Billing toggle */}
              <div className="mx-auto mb-5 flex w-full max-w-xs rounded-full border border-border/60 bg-card p-1">
                {(["monthly", "annual"] as BillingPeriod[]).map((p) => {
                  const active = period === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`relative flex-1 rounded-full py-2 text-xs font-bold transition-colors ${
                        active ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="period-pill"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          className="absolute inset-0 rounded-full bg-primary"
                        />
                      )}
                      <span className="relative inline-flex items-center gap-1.5">
                        {p === "monthly" ? "Mensal" : "Anual"}
                        {p === "annual" && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                              active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/15 text-primary"
                            }`}
                          >
                            -33%
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Plan cards */}
              <div className="space-y-2.5">
                {plans.map((plan) => {
                  const active = plan.tier === selectedTier;
                  const popular = plan.tier === "plus";
                  const isElite = plan.tier === "elite";
                  return (
                    <button
                      key={plan.tier}
                      onClick={() => setSelectedTier(plan.tier)}
                      className={`relative block w-full overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
                          : "border-border/60 bg-card hover:border-border"
                      }`}
                    >
                      {popular && (
                        <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary-foreground">
                          Mais popular
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                            active ? "border-primary bg-primary" : "border-border/70 bg-background/60"
                          }`}
                        >
                          {active ? (
                            <Check size={16} className="text-primary-foreground" />
                          ) : isElite ? (
                            <Crown size={15} className="text-muted-foreground" />
                          ) : (
                            <Sparkles size={15} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold uppercase tracking-wider">
                              {plan.label}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {plan.tagline}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-lg font-black tabular-nums">
                              {monthlyEquivalent(plan).toLocaleString("pt-PT")}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">MZN</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">/ mês</p>
                          {period === "annual" && (
                            <p className="mt-0.5 text-[10px] font-semibold text-primary">
                              Poupa {annualSavingsPct(plan)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Benefits */}
              <div className="mt-7">
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                  O que recebes com {selectedPlan.label}
                </h3>
                <ul className="space-y-2.5">
                  {PLUS_BENEFITS.map((b) => {
                    const Icon = b.icon;
                    return (
                      <li key={b.label} className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">{b.label}</p>
                          {b.hint && (
                            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                              {b.hint}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/70">
                Renovação automática. Cancela a qualquer momento nas Definições.<br />
                Pagamento seguro via M-Pesa ou e-Mola.
              </p>
            </div>

            {/* Sticky CTA */}
            <div
              className="absolute inset-x-0 bottom-0 z-10 border-t border-border/40 bg-background/95 px-5 pt-3 backdrop-blur-xl"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
            >
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => setCheckoutOpen(true)}
                className="relative h-13 w-full overflow-hidden rounded-full py-3.5 text-base font-bold text-primary-foreground shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--brand-pink)_55%,transparent)]"
                style={{ background: "var(--gradient-brand)" }}
              >
                <span className="relative">
                  Subscrever {selectedPlan.label} · {ctaPrice}{" "}
                  <span className="opacity-80">{ctaPeriodLabel}</span>
                </span>
              </motion.button>
              <p className="mt-2 text-center text-[10px] text-muted-foreground/70">
                {period === "annual"
                  ? `Equivale a ${monthlyEquivalent(selectedPlan).toLocaleString("pt-PT")} MZN/mês`
                  : `Total ${formatPrice(PLAN_PRICES[selectedPlan.tier].priceMzn)} cobrado mensalmente`}
              </p>
            </div>
          </motion.div>

          {checkoutOpen && (
            <DebitoCheckoutSheet
              open={checkoutOpen}
              onClose={() => setCheckoutOpen(false)}
              title={`Hunie ${selectedPlan.label}`}
              subtitle={
                period === "annual"
                  ? `Subscrição anual — ${formatPrice(selectedPlan.annualPriceMzn)}`
                  : `Subscrição mensal — ${formatPrice(selectedPlan.priceMzn)}`
              }
              amountMzn={totalCharge(selectedPlan)}
              planTier={selectedPlan.tier}
              billingPeriod={period}
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
