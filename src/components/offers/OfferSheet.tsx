import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Infinity as InfinityIcon, Eye, MessageCircle, Sparkles, X, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { redeemOffer, type OfferDTO } from "@/lib/offers.functions";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { OFFER_COPY, formatCountdown } from "@/lib/offers/copy";
import { useProfile } from "@/hooks/useProfile";
import { invalidateOnboardingCache } from "@/lib/authGuard";
import { toast } from "sonner";

export interface OfferSheetProps {
  offer: OfferDTO | null;
  /** Fim do trial (ISO) — obrigatório para variante trial_last_24h com countdown ao vivo. */
  trialEndsAt?: Date | null;
  onDismiss: () => void;
  onClaim: () => void;
  onSuccess: () => void;
}

const BULLET_ICONS = [InfinityIcon, Eye, MessageCircle, Sparkles];

export function OfferSheet({ offer, trialEndsAt, onDismiss, onClaim, onSuccess }: OfferSheetProps) {
  const { reload } = useProfile();
  const redeem = useServerFn(redeemOffer);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [msLeft, setMsLeft] = useState<number | null>(null);

  const showCountdown = offer?.trigger === "trial_last_24h" && !!trialEndsAt;

  useEffect(() => {
    if (!showCountdown || !trialEndsAt) return;
    const tick = () => setMsLeft(trialEndsAt.getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [showCountdown, trialEndsAt]);

  useEffect(() => {
    if (!offer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [offer]);

  const priceStr = useMemo(() => {
    if (!offer) return "";
    return `${Math.round(offer.first_period_price_minor / 100)} ${offer.currency}`;
  }, [offer]);

  const regularStr = useMemo(() => {
    if (!offer) return "";
    return `${Math.round(offer.regular_price_minor / 100)} ${offer.currency}`;
  }, [offer]);

  const handleClaim = async () => {
    if (!offer || claiming) return;
    setClaiming(true);
    try {
      onClaim();
      if (offer.is_discount) {
        const res = await redeem({ data: { offer_id: offer.id } });
        if (!res.ok) {
          if (res.error === "already_redeemed") {
            toast.error("Já resgataste um desconto anteriormente.");
          } else {
            toast.error("Não foi possível ativar a oferta.");
          }
          return;
        }
      }
      setCheckoutOpen(true);
    } finally {
      setClaiming(false);
    }
  };

  if (!offer) return null;

  const amountForCheckout = Math.round(offer.first_period_price_minor / 100);

  return (
    <>
      <AnimatePresence>
        {!checkoutOpen && (
          <>
            <motion.div
              key="offer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              style={{ zIndex: 9998 }}
              onClick={onDismiss}
            />
            <motion.div
              key="offer-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 140 || info.velocity.y > 600) onDismiss();
              }}
              className="fixed inset-x-0 bottom-0 rounded-t-[28px] border-t border-white/[0.08] bg-[#0b0b0d] text-white"
              style={{
                zIndex: 9999,
                paddingBottom: "max(env(safe-area-inset-bottom), 18px)",
                boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
              }}
            >
              {/* Grip */}
              <div className="flex justify-center pt-3">
                <div className="h-1 w-10 rounded-full bg-white/15" />
              </div>

              <button
                onClick={onDismiss}
                aria-label="Fechar"
                className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
              >
                <X size={14} className="text-white/80" />
              </button>

              <div className="px-6 pt-5">
                {/* Badge título */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4458]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FF7A88]">
                  <Sparkles size={11} /> {offer.title}
                </span>

                {/* Countdown (só nas últimas 24h) */}
                {showCountdown && msLeft !== null && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#FF4458]/30 bg-[#FF4458]/10 px-2.5 py-1 text-[11px] font-medium text-[#FFB0BB]">
                    <Clock size={11} /> Termina em {formatCountdown(msLeft)}
                  </div>
                )}

                {/* Preço */}
                <div className="mt-5 flex items-baseline gap-3">
                  <span
                    className="text-[44px] font-semibold leading-none tracking-[-0.02em] text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {priceStr}
                  </span>
                  {offer.is_discount && (
                    <span className="text-[18px] font-medium text-white/35 line-through">
                      {regularStr}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[12px] leading-snug text-white/50">
                  {offer.period_months === 1
                    ? `no 1º mês · depois ${regularStr}/mês · cancela quando quiseres`
                    : `${offer.period_months} meses · renova depois ao preço normal`}
                </p>

                {/* Bullets */}
                <ul className="mt-6 space-y-3">
                  {offer.bullets.slice(0, 3).map((b, i) => {
                    const Icon = BULLET_ICONS[i] ?? InfinityIcon;
                    return (
                      <li key={b} className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/85">
                          <Icon size={14} />
                        </span>
                        <span className="text-[14.5px] leading-tight text-white/90">{b}</span>
                      </li>
                    );
                  })}
                </ul>

                {/* Descrição curta */}
                {offer.trigger === "trial_last_24h" && (
                  <p className="mt-4 text-[12px] leading-snug text-white/45">
                    {OFFER_COPY.last24hSheet}
                  </p>
                )}
              </div>

              <div className="px-6 pt-6">
                <motion.button
                  whileTap={{ scale: 0.985 }}
                  disabled={claiming}
                  onClick={handleClaim}
                  className="h-12 w-full rounded-full bg-[#FF4458] text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(255,68,88,0.35)] transition-colors hover:bg-[#FF5568] disabled:opacity-70"
                >
                  {claiming ? "A preparar…" : OFFER_COPY.ctaActivate(offer.first_period_price_minor, offer.currency)}
                </motion.button>
                <button
                  onClick={onDismiss}
                  className="mt-3 h-10 w-full text-[13px] font-medium text-white/45 hover:text-white/70 transition-colors"
                >
                  {OFFER_COPY.dismissSoft}
                </button>
                <p className="mt-3 pb-1 text-center text-[10.5px] leading-relaxed text-white/30">
                  {OFFER_COPY.legalFooter(offer.regular_price_minor, offer.currency)}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {checkoutOpen && (
        <DebitoCheckoutSheet
          open={checkoutOpen}
          onClose={() => {
            setCheckoutOpen(false);
            onDismiss();
          }}
          title={`Hunie Premium — ${offer.title}`}
          subtitle={`${priceStr} no 1º ${offer.period_months === 1 ? "mês" : `${offer.period_months} meses`}`}
          amountMzn={amountForCheckout}
          planTier={(offer.plan_tier as "plus" | "select" | "elite") ?? "plus"}
          billingPeriod="monthly"
          offerId={offer.is_discount ? offer.id : undefined}
          onSuccess={async () => {
            invalidateOnboardingCache();
            await reload();
            setCheckoutOpen(false);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
