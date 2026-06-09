import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Clock, ChevronDown } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { PLAN_CARDS, formatPrice, type PlanCardConfig } from "@/lib/plans";
import { PLAN_PRICES, type BillingPeriod } from "@/lib/pricing";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { invalidateOnboardingCache } from "@/lib/authGuard";
import { toast } from "sonner";

const INITIAL_SECONDS = 29 * 60 + 53;
const SEEN_KEY = "paywall_seen";
const PLUS_NORMAL = PLAN_PRICES.plus.priceMzn; // 599 — keep system source of truth
const PLUS_FIRST_DISCOUNT = 99; // teaser first-month price from spec

export interface PaywallSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful payment so caller can record pending action. */
  onSuccess?: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const FEATURES: { label: string; free: boolean; plus: boolean }[] = [
  { label: "Likes ilimitados", free: false, plus: true },
  { label: "Ver quem gostou de ti", free: false, plus: true },
  { label: "Filtros avançados", free: false, plus: true },
  { label: "Super Likes", free: false, plus: true },
  { label: "Sem anúncios", free: false, plus: true },
  { label: "Boosts mensais", free: false, plus: true },
];

export function PaywallSheet({ open, onClose, onSuccess }: PaywallSheetProps) {
  const { reload } = useProfile();
  const [timeLeft, setTimeLeft] = useState(INITIAL_SECONDS);
  const [discountActive, setDiscountActive] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanCardConfig | null>(null);
  const [checkoutPeriod, setCheckoutPeriod] = useState<BillingPeriod>("monthly");

  // First-time detection on open
  useEffect(() => {
    if (!open) return;
    const seen = typeof window !== "undefined" && localStorage.getItem(SEEN_KEY);
    const first = !seen;
    setIsFirstTime(first);
    setDiscountActive(first);
    setTimeLeft(INITIAL_SECONDS);
    setExpanded(false);
    if (first && typeof window !== "undefined") {
      localStorage.setItem(SEEN_KEY, "true");
    }
  }, [open]);

  // Countdown
  useEffect(() => {
    if (!open || !discountActive) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setDiscountActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, discountActive]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const plusCard = useMemo(
    () => PLAN_CARDS.find((p) => p.tier === "plus")!,
    [],
  );

  const showDiscount = isFirstTime && discountActive;

  const handleContinue = () => {
    setCheckoutPeriod("monthly");
    setCheckoutPlan(plusCard);
  };

  const handlePickPlan = (plan: PlanCardConfig) => {
    setCheckoutPeriod("monthly");
    setCheckoutPlan(plan);
  };

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
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 top-[4%] z-[61] flex flex-col overflow-hidden rounded-t-3xl border-t border-border/40 bg-background text-foreground shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2 shrink-0">
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="grid h-9 w-9 place-items-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-2">
                <span
                  className="text-lg uppercase"
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                  }}
                >
                  hunie
                </span>
                <span
                  className="rounded-full bg-primary px-2 py-0.5 text-[10px] uppercase text-primary-foreground"
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                  }}
                >
                  Plus
                </span>
              </div>
              <div className="w-9" />
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
              {/* Offer card */}
              <div className="mt-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
                {showDiscount && (
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <Clock size={12} />
                    Oferta expira em <span className="font-mono tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
                )}

                {showDiscount ? (
                  <>
                    <p className="text-sm text-muted-foreground">Começa por</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-5xl font-black text-primary">{PLUS_FIRST_DISCOUNT}</span>
                      <span className="text-lg font-bold text-primary">MZN</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">no primeiro mês</p>
                    <p className="mt-2 text-xs text-muted-foreground line-through">
                      Normalmente {PLUS_NORMAL.toLocaleString("pt-PT")} MZN/mês
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      Renova a {PLUS_NORMAL.toLocaleString("pt-PT")} MZN/mês. Cancela quando quiseres.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black">{PLUS_NORMAL.toLocaleString("pt-PT")}</span>
                      <span className="text-lg font-bold text-muted-foreground">MZN</span>
                      <span className="text-sm text-muted-foreground">/ mês</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      Cancela quando quiseres.
                    </p>
                  </>
                )}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className="mt-5 h-13 w-full rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                >
                  Continuar
                </motion.button>
              </div>

              {/* Features comparison */}
              <div className="mt-7">
                <h3 className="text-base font-bold">O que está incluído</h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-border/60">
                  <div className="grid grid-cols-[1fr_64px_64px] items-center bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span />
                    <span className="text-center">Grátis</span>
                    <span className="text-center">
                      <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                        Plus
                      </span>
                    </span>
                  </div>
                  {FEATURES.map((f, i) => (
                    <div
                      key={f.label}
                      className={`grid grid-cols-[1fr_64px_64px] items-center px-4 py-3 text-sm ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      }`}
                    >
                      <span className="text-foreground/90">{f.label}</span>
                      <span className="text-center">
                        {f.free ? (
                          <Check size={16} className="mx-auto text-primary" />
                        ) : (
                          <X size={16} className="mx-auto text-muted-foreground/50" />
                        )}
                      </span>
                      <span className="text-center">
                        {f.plus ? (
                          <Check size={16} className="mx-auto text-primary" />
                        ) : (
                          <X size={16} className="mx-auto text-muted-foreground/50" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All plans expander */}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-6 inline-flex w-full items-center justify-center gap-1.5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver todos os planos
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 -mx-1 px-1">
                      {PLAN_CARDS.map((plan) => {
                        const popular = plan.tier === "plus";
                        return (
                          <div
                            key={plan.tier}
                            className={`relative shrink-0 snap-center rounded-2xl border p-4 flex flex-col ${
                              popular
                                ? "w-[55%] min-w-[200px] border-primary/60 bg-primary/5"
                                : "w-[42%] min-w-[160px] border-border/60 bg-card"
                            }`}
                          >
                            {popular && (
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground">
                                Mais popular
                              </div>
                            )}
                            <h4 className="text-sm font-extrabold uppercase tracking-wider">
                              {plan.label}
                            </h4>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-2xl font-black">
                                {plan.priceMzn.toLocaleString("pt-PT")}
                              </span>
                              <span className="text-xs font-bold text-muted-foreground">MZN</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">/ mês</p>
                            <button
                              onClick={() => handlePickPlan(plan)}
                              className={`mt-4 h-10 w-full rounded-full text-xs font-bold transition-colors ${
                                popular
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-muted text-foreground hover:bg-muted/70"
                              }`}
                            >
                              Escolher
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-5 text-center text-[11px] text-muted-foreground/70">
                🔒 Pagamento seguro · Cancela quando quiseres
              </p>
            </div>
          </motion.div>

          {checkoutPlan && (
            <DebitoCheckoutSheet
              open={!!checkoutPlan}
              onClose={() => setCheckoutPlan(null)}
              title={`Hunie ${checkoutPlan.label}`}
              subtitle={
                checkoutPeriod === "annual"
                  ? `Subscrição anual — ${formatPrice(checkoutPlan.annualPriceMzn)}`
                  : `Subscrição mensal — ${formatPrice(checkoutPlan.priceMzn)}`
              }
              amountMzn={
                checkoutPeriod === "annual" ? checkoutPlan.annualPriceMzn : checkoutPlan.priceMzn
              }
              planTier={checkoutPlan.tier}
              billingPeriod={checkoutPeriod}
              onSuccess={async () => {
                invalidateOnboardingCache();
                await reload();
                toast.success(`Bem-vindo ao Hunie ${checkoutPlan.label} 🎉`);
                setCheckoutPlan(null);
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
