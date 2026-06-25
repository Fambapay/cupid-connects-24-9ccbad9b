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
          className="fixed inset-x-0 bottom-0 top-[4%] z-[61] flex flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-[#0a0a0c] text-white shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.6)]"
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
            style={{
              background:
                "radial-gradient(closest-side, rgba(240,70,140,0.55), rgba(177,60,255,0.15) 60%, transparent)",
            }}
          />

          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15" />

          {!required && (
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] backdrop-blur-md transition-colors hover:bg-white/[0.14]"
            >
              <X size={16} />
            </button>
          )}

          <div className="relative flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),200px)]">
            {/* Hero */}
            <div className="px-6 pt-8 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-md"
              >
                <Sparkles size={11} className="text-pink-400" />
                Hunie Membership
              </motion.div>
              <h2
                className="text-[34px] font-black leading-[1.05] tracking-[-0.03em]"
                style={{ fontFamily: "'Instrument Serif', 'Cormorant', serif", fontWeight: 400 }}
              >
                Conhece quem
                <br />
                <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text italic text-transparent">
                  está à tua espera.
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-[280px] text-[14px] leading-snug text-white/55">
                Desbloqueia tudo o que torna o Hunie uma experiência diferente.
              </p>
            </div>

            {/* Billing toggle */}
            <div className="mt-7 px-6">
              <div className="relative mx-auto flex w-full max-w-[280px] items-center rounded-full border border-white/[0.06] bg-white/[0.04] p-1 backdrop-blur-md">
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
                  style={{ left: period === "monthly" ? "4px" : "calc(50% + 0px)" }}
                />
                <button
                  onClick={() => setPeriod("monthly")}
                  className={`relative z-10 flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors ${
                    period === "monthly" ? "text-black" : "text-white/60"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setPeriod("annual")}
                  className={`relative z-10 flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors ${
                    period === "annual" ? "text-black" : "text-white/60"
                  }`}
                >
                  Anual
                  <span className="ml-1 rounded-full bg-emerald-400/90 px-1.5 py-px text-[9px] font-bold text-black">
                    -33%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan rows (Apple-style vertical selectable list) */}
            <div className="mt-6 flex flex-col gap-2.5 px-4">
              {planCards.map((plan, i) => (
                <PlanRow
                  key={plan.tier}
                  plan={plan}
                  period={period}
                  country={country}
                  selected={selectedTier === plan.tier}
                  onSelect={() => setSelectedTier(plan.tier)}
                  index={i}
                />
              ))}
            </div>

            {/* Trust row */}
            <div className="mt-6 flex items-center justify-center gap-4 px-6 text-[11px] text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} /> Pagamento seguro
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span>Cancela quando quiseres</span>
            </div>
            <p className="mt-2 px-6 text-center text-[10.5px] text-white/30">
              via {paymentSummary} · Renovação automática
            </p>
          </div>

          {/* Sticky CTA */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <div className="h-16 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/95 to-transparent" />
            <div className="pointer-events-auto bg-[#0a0a0c] px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(activePlan)}
                className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full text-[15px] font-bold text-white shadow-[0_12px_40px_-8px_rgba(240,70,140,0.55)]"
                style={{
                  background:
                    "linear-gradient(135deg, #FF4FA3 0%, #E935A0 45%, #B13CFF 100%)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Continuar com {activePlan.label}
                  <ArrowRight size={16} />
                </span>
              </motion.button>
              <p className="mt-2 text-center text-[11px] text-white/45">
                {period === "annual"
                  ? `${formatPrice(activePlan.annualPriceMzn, country)} por ano — cobrado hoje`
                  : `${formatPrice(activePlan.priceMzn, country)} por mês — cobrado hoje`}
              </p>
            </div>
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
