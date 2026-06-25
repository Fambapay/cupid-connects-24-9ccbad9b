import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getPlanCards, formatPrice, type PlanCardConfig } from "@/lib/plans";
import type { BillingPeriod } from "@/lib/pricing";
import { useCountry } from "@/lib/country/context";
import { paymentLabel, type PaymentMethodCode } from "@/lib/country/config";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { invalidateOnboardingCache } from "@/lib/authGuard";
import { toast } from "sonner";

type Stage = "fomo" | "plans";

export interface PaywallFlowProps {
  open: boolean;
  onClose: () => void;
  /** If true, hide close button (gated mode) */
  required?: boolean;
  onSuccess?: () => void;
}

export function PaywallFlow({ open, onClose, required, onSuccess }: PaywallFlowProps) {
  const [stage, setStage] = useState<Stage>("fomo");
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [selected, setSelected] = useState<PlanCardConfig | null>(null);
  const [selectedTier, setSelectedTier] = useState<PlanCardConfig["tier"]>("plus");
  const { user } = useAuth();
  const { profile, reload } = useProfile();
  const { country, config } = useCountry();
  // Ascending order: Select → Plus → Elite (Apple-style ladder)
  const planCards = useMemo(() => {
    const cards = getPlanCards(country);
    const order: Record<string, number> = { select: 0, plus: 1, elite: 2 };
    return [...cards].sort((a, b) => order[a.tier] - order[b.tier]);
  }, [country]);
  const activePlan = useMemo(
    () => planCards.find((p) => p.tier === selectedTier) ?? planCards[1],
    [planCards, selectedTier],
  );
  const paymentSummary = useMemo(
    () => config.payments.slice(0, 3).map((p) => paymentLabel(p as PaymentMethodCode)).join(" e "),
    [config.payments],
  );
  const [fomoData, setFomoData] = useState<{
    count: number;
    avatars: string[];
    loaded: boolean;
  }>({ count: 0, avatars: [], loaded: false });

  useEffect(() => {
    if (!open) {
      setStage("fomo");
      setSelected(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    (async () => {
      // Real pending likes: incoming likes/supers the user hasn't responded to yet.
      const [{ data: incoming }, { data: outgoing }] = await Promise.all([
        supabase
          .from("swipes")
          .select("swiper_id")
          .eq("swiped_id", user.id)
          .in("direction", ["like", "super"])
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id),
      ]);
      const responded = new Set((outgoing ?? []).map((s) => s.swiped_id as string));
      const pendingIds = Array.from(
        new Set(
          (incoming ?? [])
            .map((s) => s.swiper_id as string)
            .filter((id) => !responded.has(id)),
        ),
      );
      const count = pendingIds.length;

      let avatars: string[] = [];
      if (count > 0) {
        const ids = pendingIds.slice(0, 3);
        const { data: photos } = await supabase
          .from("profile_photos")
          .select("profile_id,storage_path,position")
          .in("profile_id", ids)
          .order("position", { ascending: true });
        const seen = new Set<string>();
        const paths: string[] = [];
        (photos ?? []).forEach((p) => {
          const pid = p.profile_id as string;
          if (seen.has(pid)) return;
          seen.add(pid);
          paths.push(p.storage_path as string);
        });
        if (paths.length) {
          const { signPhotos } = await import("@/lib/photos");
          avatars = (
            await signPhotos(paths, 3600, { width: 200, quality: 60, resize: "cover" })
          ).filter(Boolean) as string[];
        }
      }
      if (!active) return;
      setFomoData({ count, avatars, loaded: true });
      // If there are no real likers, skip the FOMO stage entirely — it would be dishonest.
      if (count === 0) setStage("plans");
    })();
    return () => {
      active = false;
    };
  }, [open, user, profile?.city]);

  if (!open) return null;

  const showFomo = stage === "fomo" && fomoData.loaded && fomoData.count > 0;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
        onClick={!required ? onClose : undefined}
      />
      {showFomo && (
        <motion.div
          key="fomo"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[61] flex flex-col items-center justify-center px-6 text-center text-white"
        >
          {!required && (
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-5 top-[max(env(safe-area-inset-top),16px)] grid h-10 w-10 place-items-center rounded-full bg-white/10"
            >
              <X size={18} />
            </button>
          )}

          {/* Blurred overlapping avatars of REAL likers */}
          <div className="relative mb-8 flex items-center justify-center">
            {[0, 1, 2].map((i) => {
              const url = fomoData.avatars[i];
              return (
                <div
                  key={i}
                  className="relative -mx-3 h-20 w-20 overflow-hidden rounded-full border-2 border-background shadow-xl"
                  style={{ zIndex: 3 - i }}
                >
                  {url ? (
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ filter: "blur(10px)" }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-pink-400/40 to-fuchsia-500/40" />
                  )}
                </div>
              );
            })}
          </div>

          <h2 className="max-w-xs text-3xl font-black leading-tight">
            {fomoData.count === 1
              ? "1 pessoa já gostou de ti"
              : `${fomoData.count} pessoas já gostaram de ti`}
          </h2>
          <p className="mt-3 max-w-xs text-base text-white/70">
            Desbloqueia o Hunie para ver quem é e dar match instantâneo
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setStage("plans")}
            className="mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 px-8 text-base font-bold text-white shadow-[0_20px_60px_-20px_rgba(240,70,140,0.8)]"
          >
            Ver quem gostou de mim <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      )}

      {stage === "plans" && (
        <motion.div
          key="plans"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 36 }}
          className="fixed inset-x-0 bottom-0 top-[6%] z-[61] flex flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-background text-foreground shadow-2xl"
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15" />
          <div className="flex items-start justify-between px-5 pt-3">
            <div>
              <h2 className="text-xl font-black">Escolhe o teu plano</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Começa hoje — cancela quando quiseres
              </p>
            </div>
            {!required && (
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Billing toggle */}
          <div className="mt-4 px-5">
            <div className="relative mx-auto flex w-full max-w-xs items-center rounded-full bg-white/[0.06] p-1">
              <button
                onClick={() => setPeriod("monthly")}
                className={`relative z-10 flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
                  period === "monthly" ? "text-white" : "text-white/55"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setPeriod("annual")}
                className={`relative z-10 flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
                  period === "annual" ? "text-white" : "text-white/55"
                }`}
              >
                Anual
              </button>
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute inset-y-1 w-1/2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500"
                style={{ left: period === "monthly" ? "4px" : "50%" }}
              />
            </div>
            <AnimatePresence>
              {period === "annual" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-center text-xs font-semibold text-emerald-400"
                >
                  💚 Poupa até 33%
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Plans scroll */}
          <div className="flex-1 overflow-y-auto px-3 pb-[max(env(safe-area-inset-bottom),120px)] pt-5">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              {planCards.map((plan) => (
                <PlanCardView
                  key={plan.tier}
                  plan={plan}
                  period={period}
                  country={country}
                  onSelect={() => setSelected(plan)}
                />
              ))}
            </div>
            <p className="mt-6 px-2 text-center text-xs text-muted-foreground">
              🔒 Pagamento seguro via {paymentSummary}
            </p>
            <p className="mt-1 text-center text-[11px] text-muted-foreground/80">
              Cancela a qualquer momento · Renovação automática
            </p>
          </div>
        </motion.div>
      )}

      {selected && (
        <DebitoCheckoutSheet
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Hunie ${selected.label}`}
          subtitle={
            period === "annual"
              ? `Subscrição anual — ${formatPrice(selected.annualPriceMzn, country)}`
              : `Subscrição mensal — ${formatPrice(selected.priceMzn, country)}`
          }
          amountMzn={period === "annual" ? selected.annualPriceMzn : selected.priceMzn}
          planTier={selected.tier}
          billingPeriod={period}
          onSuccess={async () => {
            invalidateOnboardingCache();
            await reload();
            toast.success(`Bem-vindo ao Hunie ${selected.label}!`);
            setSelected(null);
            onSuccess?.();
            onClose();
          }}
        />
      )}
    </AnimatePresence>
  );
}

function PlanCardView({
  plan,
  period,
  country,
  onSelect,
}: {
  plan: PlanCardConfig;
  period: BillingPeriod;
  country: import("@/lib/country/config").CountryCode;
  onSelect: () => void;
}) {
  const isPopular = plan.badge === "Mais popular";
  const isElite = plan.tier === "elite";
  const price = period === "annual" ? plan.annualPriceMzn : plan.priceMzn;
  const fullPrice = plan.priceMzn * 12;
  const savings = fullPrice - plan.annualPriceMzn;

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      className={`relative flex w-[78vw] max-w-[300px] shrink-0 snap-center flex-col rounded-3xl border-2 p-4 ${
        isPopular
          ? "border-pink-500/70 bg-gradient-to-b from-pink-500/10 to-fuchsia-500/5 shadow-[0_20px_60px_-15px_rgba(240,70,140,0.5)]"
          : isElite
          ? "border-amber-400/30 bg-gradient-to-b from-amber-400/8 to-black/40"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg">
          ⭐ Mais popular
        </div>
      )}
      {isElite && (
        <div className="absolute right-3 top-3 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
          VIP
        </div>
      )}

      <div className="mt-1 flex items-center gap-2">
        <h3
          className="text-2xl uppercase text-white"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          HUNIE
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] uppercase"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            letterSpacing: "0.06em",
            backgroundColor: plan.accent,
            color: "#0a0a0a",
          }}
        >
          {plan.label}
        </span>
      </div>


      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-black">{formatPrice(price, country)}</span>
        <span className="text-xs text-white/50">/{period === "annual" ? "ano" : "mês"}</span>
      </div>
      {period === "annual" && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-white/40 line-through">{formatPrice(fullPrice, country)}</span>
          <span className="font-semibold text-emerald-400">Poupa {formatPrice(savings, country)}</span>
        </div>
      )}

      <p className="mt-3 text-sm text-white/70">{plan.tagline}</p>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.highlights.map((h) => (
          <li key={h.label} className="flex items-start gap-2 text-sm">
            <Check size={14} className="mt-1 shrink-0" style={{ color: plan.accent }} />
            <span className={h.bold ? "font-semibold" : "text-white/80"}>{h.label}</span>
          </li>
        ))}
      </ul>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onSelect}
        className={`mt-5 h-12 w-full rounded-2xl text-sm font-bold text-white shadow-lg ${
          isPopular ? "bg-gradient-to-r from-fuchsia-500 to-pink-500" : ""
        }`}
        style={
          !isPopular
            ? { background: `linear-gradient(135deg, ${plan.accent}, ${plan.accent}cc)` }
            : undefined
        }
      >
        {isPopular ? `Escolher ${plan.label}` : "Escolher"}
      </motion.button>
    </motion.div>
  );
}
