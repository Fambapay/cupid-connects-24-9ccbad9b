import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getPlanCards, formatPrice, type PlanCardConfig } from "@/lib/plans";
import { useCountry } from "@/lib/country/context";
import { paymentLabel, type PaymentMethodCode } from "@/lib/country/config";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { invalidateOnboardingCache } from "@/lib/authGuard";
import { toast } from "sonner";
import { requiresExternalCheckout, getExternalCheckoutUrl, getBillingMode } from "@/lib/billing/platform";
import { openInAppBrowser } from "@/lib/native/inAppBrowser";
import { isPlayBillingAvailable, buySubscription } from "@/lib/billing/googlePlay";
import { verifyGooglePlayPurchase } from "@/lib/billing/google-play.functions";
import { useServerFn } from "@tanstack/react-start";


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
  const [selected, setSelected] = useState<PlanCardConfig | null>(null);
  const [selectedTier, setSelectedTier] = useState<PlanCardConfig["tier"]>("plus");
  const verifyPlayPurchase = useServerFn(verifyGooglePlayPurchase);

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
                {fomoData.count > 0
                  ? `${fomoData.count} ${fomoData.count === 1 ? "pessoa à tua espera" : "pessoas à tua espera"}`
                  : "Hunie Membership"}
              </motion.div>
              <h2
                className="text-[34px] font-black leading-[1.05] tracking-[-0.03em]"
                style={{ fontFamily: "'Instrument Serif', 'Cormorant', serif", fontWeight: 400 }}
              >
                A pessoa certa
                <br />
                <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text italic text-transparent">
                  não espera para sempre.
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-[290px] text-[14px] leading-snug text-white/55">
                Cada dia sem Hunie são conversas que não acontecem e matches que passam ao lado.
              </p>
            </div>

            {/* Plan rows (Apple-style vertical selectable list) */}
            <div className="mt-7 flex flex-col gap-2.5 px-4">
              {planCards.map((plan, i) => (
                <PlanRow
                  key={plan.tier}
                  plan={plan}
                  country={country}
                  selected={selectedTier === plan.tier}
                  onSelect={() => setSelectedTier(plan.tier)}
                  index={i}
                />
              ))}
            </div>


            {/* Trust row */}
            <div className="mt-5 flex items-center justify-center gap-4 px-6 text-[11px] text-white/45">
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
              {fomoData.count > 0 && (
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-pink-300/90">
                  {fomoData.count === 1
                    ? "1 pessoa já te deu like — vê quem é"
                    : `${fomoData.count} pessoas já te deram like — vê quem são`}
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  // 1) Native Google Play Billing if the plugin is installed.
                  if (getBillingMode() === "android-play" && user) {
                    const available = await isPlayBillingAvailable();
                    if (available) {
                      try {
                        const result = await buySubscription(activePlan.tier, user.id);
                        await verifyPlayPurchase({
                          data: { productId: result.productId, purchaseToken: result.purchaseToken },
                        });
                        invalidateOnboardingCache();
                        await reload();
                        toast.success(`Bem-vindo ao Hunie ${activePlan.label}!`);
                        onSuccess?.();
                        onClose();
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        if (msg !== "PLAY_BILLING_UNAVAILABLE") {
                          toast.error("Pagamento Google Play falhou. Tenta novamente.");
                          return;
                        }
                        // Plugin not installed → fall through to external browser.
                      }
                      return;
                    }
                  }
                  // 2) External browser (iOS App Store / Android Play without plugin).
                  if (requiresExternalCheckout()) {
                    const mode = getBillingMode();
                    const url = getExternalCheckoutUrl(`/membership?plan=${activePlan.tier}`);
                    toast(
                      mode === "ios-appstore"
                        ? "Vais ser levado ao site para concluir o pagamento."
                        : "Para pagar com M-Pesa ou e-Mola abrimos o site no browser.",
                    );
                    await openInAppBrowser(url);
                    return;
                  }
                  // 3) Web: in-app Débito sheet.
                  setSelected(activePlan);
                }}
                className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full text-[15px] font-bold text-white shadow-[0_12px_40px_-8px_rgba(240,70,140,0.55)]"
                style={{
                  background:
                    "linear-gradient(135deg, #FF4FA3 0%, #E935A0 45%, #B13CFF 100%)",
                }}
              >
                {/* Shimmer sweep */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                  }}
                  animate={{ x: ["-120%", "320%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {requiresExternalCheckout()
                    ? `Continuar em hunie.app — ${activePlan.label}`
                    : `Começar agora — ${activePlan.label}`}
                  <ArrowRight size={16} />
                </span>
              </motion.button>
              <p className="mt-2 text-center text-[11px] text-white/45">
                {requiresExternalCheckout()
                  ? `${formatPrice(activePlan.priceMzn, country)}/mês · pagamento concluído no browser`
                  : `${formatPrice(activePlan.priceMzn, country)} hoje · menos que um jantar a dois`}
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
          subtitle={`Subscrição mensal — ${formatPrice(selected.priceMzn, country)}`}
          amountMzn={selected.priceMzn}
          planTier={selected.tier}
          billingPeriod="monthly"

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

function PlanRow({
  plan,
  country,
  selected,
  onSelect,
  index,
}: {
  plan: PlanCardConfig;
  country: import("@/lib/country/config").CountryCode;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const isPopular = plan.badge === "Mais popular";
  const isElite = plan.tier === "elite";
  const price = plan.priceMzn;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.985 }}
      className={`group relative flex w-full flex-col rounded-[22px] border p-4 text-left transition-all ${
        selected
          ? "border-white/30 bg-white/[0.06] shadow-[0_8px_30px_-6px_rgba(240,70,140,0.35)]"
          : "border-white/[0.08] bg-white/[0.025]"
      }`}
      style={
        selected && isPopular
          ? {
              borderColor: "transparent",
              backgroundImage:
                "linear-gradient(#141417, #141417), linear-gradient(135deg, #FF4FA3, #B13CFF)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }
          : undefined
      }
    >
      {isPopular && (
        <div className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white shadow-lg">
          Recomendado
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold tracking-tight text-white">
              Hunie {plan.label}
            </span>
            {isElite && (
              <span className="rounded-full bg-amber-400/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-amber-300">
                VIP
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-white/55">
            {plan.tagline}
          </p>
        </div>

        <div
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all ${
            selected ? "border-transparent" : "border-white/25 bg-transparent"
          }`}
          style={
            selected
              ? { background: "linear-gradient(135deg, #FF4FA3, #B13CFF)" }
              : undefined
          }
        >
          {selected && <Check size={12} strokeWidth={3} className="text-white" />}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[26px] font-black tracking-tight text-white">
          {formatPrice(price, country)}
        </span>
        <span className="text-[12px] text-white/45">/mês</span>
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-1.5">
        {plan.highlights.slice(0, selected ? plan.highlights.length : 4).map((h) => (
          <li key={h.label} className="flex items-start gap-2 text-[12.5px]">
            <Check
              size={12}
              strokeWidth={3}
              className="mt-[3px] shrink-0"
              style={{ color: plan.accent }}
            />
            <span className={h.bold ? "font-semibold text-white" : "text-white/70"}>
              {h.label}
            </span>
          </li>
        ))}
        {!selected && plan.highlights.length > 4 && (
          <li className="ml-5 text-[11px] text-white/35">
            + {plan.highlights.length - 4} benefícios
          </li>
        )}
      </ul>
    </motion.button>
  );
}




