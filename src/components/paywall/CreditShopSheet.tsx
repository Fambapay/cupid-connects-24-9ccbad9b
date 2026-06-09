import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Zap,
  Star,
  Sparkles,
  TrendingUp,
  Eye,
  Heart,
  Flame,
  Crown,
} from "lucide-react";
import { PACKS, type Pack, type PackKind } from "@/lib/pricing";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";
import { useCredits } from "@/hooks/useCredits";

const PACKS_ARRAY = Object.values(PACKS);

const COPY: Record<
  PackKind,
  {
    eyebrow: string;
    title: string;
    titleAccent: string;
    sub: string;
    benefits: { icon: typeof TrendingUp; label: string }[];
  }
> = {
  super_like: {
    eyebrow: "Hunie Store",
    title: "Sem Super Likes.",
    titleAccent: "Destaca-te à primeira.",
    sub: "Quem recebe um Super Like tem 3× mais probabilidade de dar match.",
    benefits: [
      { icon: Heart, label: "3× mais matches" },
      { icon: Sparkles, label: "Notificação especial" },
      { icon: Eye, label: "Apareces primeiro" },
    ],
  },
  boost: {
    eyebrow: "Hunie Store",
    title: "Sem Boosts.",
    titleAccent: "Sê visto primeiro.",
    sub: "30 minutos no topo do feed da tua zona.",
    benefits: [
      { icon: TrendingUp, label: "Até 10× visualizações" },
      { icon: Eye, label: "30 min no topo" },
      { icon: Heart, label: "Mais matches" },
    ],
  },
};

export interface CreditShopSheetProps {
  open: boolean;
  kind: PackKind;
  onClose: () => void;
  onSuccess?: () => void;
}

function unitPrice(p: Pack) {
  return Math.round((p.priceMzn / p.quantity) * 10) / 10;
}

export function CreditShopSheet({ open, kind, onClose, onSuccess }: CreditShopSheetProps) {
  const { credits, reload } = useCredits();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const packs = useMemo(
    () => PACKS_ARRAY.filter((p) => p.kind === kind).sort((a, b) => a.priceMzn - b.priceMzn),
    [kind],
  );
  const copy = COPY[kind];
  const accent = kind === "boost" ? "from-fuchsia-500 to-indigo-500" : "from-sky-400 to-blue-500";
  const accentColor = kind === "boost" ? "#A855F7" : "#38BDF8";
  const balance = kind === "boost" ? credits.boost_balance : credits.super_like_balance;

  useEffect(() => {
    if (open) {
      // Default to "Mais Popular"
      const popular = packs.find((p) => p.popular) ?? packs[0];
      setSelectedId(popular?.id ?? null);
    }
  }, [open, packs]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const selected = packs.find((p) => p.id === selectedId) ?? packs[0];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="credit-shop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            style={{ zIndex: 10000 }}
            onClick={onClose}
          />
          <motion.div
            key="credit-shop-sheet"
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
            {/* Drag handle */}
            <div className="relative flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="h-[5px] w-9 rounded-full bg-white/15" />
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] backdrop-blur hover:bg-white/[0.14] transition-colors"
            >
              <X size={15} className="text-white/80" />
            </button>

            <div className="relative flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(env(safe-area-inset-bottom),132px)]">
              {/* Hero */}
              <div className="pt-8 pb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  {copy.eyebrow}
                </p>
                <div className="mt-4 flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                      style={{ background: accentColor }}
                    />
                    <div
                      className="relative grid h-12 w-12 place-items-center rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}14)`,
                        boxShadow: `inset 0 1px 0 ${accentColor}55, 0 8px 20px -10px ${accentColor}99`,
                      }}
                    >
                      {kind === "boost" ? (
                        <Zap size={22} fill={accentColor} stroke="none" />
                      ) : (
                        <Star size={22} fill={accentColor} stroke="none" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2
                      className="text-[30px] uppercase leading-[0.95] tracking-[-0.02em] text-white"
                      style={{ fontFamily: "Montserrat, var(--font-display)", fontWeight: 900 }}
                    >
                      {copy.title}
                    </h2>
                    <p
                      className="mt-1.5 text-[13px] uppercase tracking-[0.08em] text-white/55"
                      style={{ fontFamily: "Montserrat, var(--font-display)", fontWeight: 800 }}
                    >
                      {copy.titleAccent}
                    </p>
                  </div>
                </div>
                <p className="mt-4 max-w-[320px] text-[13.5px] leading-snug text-white/55">
                  {copy.sub}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-1.5">
                  {copy.benefits.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.035] px-2.5 py-2.5"
                    >
                      <Icon size={13} style={{ color: accentColor }} className="mb-1.5" />
                      <div className="text-[10.5px] font-medium leading-[1.2] text-white/80">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    Escolhe o teu pack
                  </span>
                  <span className="text-[10.5px] text-white/45">
                    Tens <b className="text-white/85">{balance}</b> disponíve{balance === 1 ? "l" : "is"}
                  </span>
                </div>
              </div>

              {/* Packs */}
              <div className="space-y-2">
                {packs.map((pack) => {
                  const active = pack.id === selected?.id;
                  const unit = unitPrice(pack);
                  return (
                    <motion.button
                      key={pack.id}
                      onClick={() => setSelectedId(pack.id)}
                      whileTap={{ scale: 0.99 }}
                      className="relative block w-full rounded-2xl border px-4 py-3.5 text-left transition-all"
                      style={{
                        borderColor: active ? `${accentColor}80` : "rgba(255,255,255,0.07)",
                        background: active
                          ? `linear-gradient(135deg, ${accentColor}1a, ${accentColor}08)`
                          : "rgba(255,255,255,0.025)",
                        boxShadow: active
                          ? `inset 0 0 0 1px ${accentColor}40, 0 8px 24px -16px ${accentColor}aa`
                          : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors"
                          style={{
                            borderColor: active ? accentColor : "rgba(255,255,255,0.2)",
                          }}
                        >
                          {active && (
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ background: accentColor }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[14px] uppercase tracking-tight text-white whitespace-nowrap"
                              style={{ fontFamily: "Montserrat, var(--font-display)", fontWeight: 800 }}
                            >
                              {pack.quantity} {kind === "boost" ? "Boosts" : "Super Likes"}
                            </span>
                            {pack.popular && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.08em] text-orange-300">
                                <Flame size={8} /> Popular
                              </span>
                            )}
                            {pack.best && (
                              <span
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.08em]"
                                style={{
                                  background: `${accentColor}22`,
                                  color: accentColor,
                                }}
                              >
                                <Crown size={8} /> Melhor
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-white/45">
                            {unit} MZN cada
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className="text-[15px] tabular-nums text-white"
                            style={{ fontFamily: "Montserrat, var(--font-display)", fontWeight: 800 }}
                          >
                            {pack.priceMzn.toLocaleString("pt-PT")}
                          </span>
                          <span className="ml-1 text-[11px] font-medium text-white/45">MZN</span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <p className="mt-6 text-center text-[10.5px] leading-relaxed tracking-wide text-white/35">
                Crédito instantâneo · Nunca expira<br />
                Pagamento via M-Pesa ou e-Mola
              </p>
            </div>

            {/* Sticky CTA */}
            <div
              className="absolute inset-x-0 bottom-0 border-t border-white/[0.06] bg-[#0b0b0d]/95 px-6 pt-3 backdrop-blur-xl"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 18px)", zIndex: 5 }}
            >
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => setCheckoutOpen(true)}
                disabled={!selected}
                className={`relative h-12 w-full overflow-hidden rounded-full bg-gradient-to-r ${accent} text-[15px] font-bold text-white disabled:opacity-50`}
                style={{
                  boxShadow: selected
                    ? `0 10px 24px -12px ${accentColor}99, inset 0 1px 0 rgba(255,255,255,0.18)`
                    : undefined,
                }}
              >
                <span
                  className="relative inline-flex items-center justify-center gap-1.5 uppercase tracking-[0.04em]"
                  style={{ fontFamily: "Montserrat, var(--font-display)", fontWeight: 800 }}
                >
                  <Sparkles size={14} className="opacity-90" />
                  Desbloquear · {selected?.priceMzn.toLocaleString("pt-PT")} MZN
                </span>
              </motion.button>
            </div>
          </motion.div>

          {selected && checkoutOpen && (
            <DebitoCheckoutSheet
              open={checkoutOpen}
              onClose={() => setCheckoutOpen(false)}
              title={`${selected.quantity} ${kind === "boost" ? "Boosts" : "Super Likes"}`}
              subtitle="Crédito instantâneo após confirmação"
              amountMzn={selected.priceMzn}
              packId={selected.id}
              onSuccess={async () => {
                await reload();
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
