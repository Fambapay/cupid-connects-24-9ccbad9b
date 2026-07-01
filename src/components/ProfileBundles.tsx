import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Star, Flame, Crown, Sparkles, Check, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { hapticTap } from "@/hooks/useNativePlatform";
import { getPack } from "@/lib/pricing";
import { formatCountryPrice } from "@/lib/country/config";
import { useCountry } from "@/lib/country/context";

type Bundle = {
  id: string;
  packId: string;
  title: string;
  subtitle: string;
  /** Discount multiplier applied to per-unit price for the "original" strikethrough */
  originalMultiplier?: number;
  perks: string[];
  badge?: { label: string; icon: typeof Flame; tone: string };
  gradient: string;
  accent: string;
  Icon: typeof Zap;
};

const BUNDLES: Bundle[] = [
  {
    id: "starter",
    packId: "super_like_5",
    title: "Starter Bundle",
    subtitle: "5 Super Likes",
    perks: ["3× mais matches", "Notificação especial", "Apareces primeiro"],
    badge: { label: "Para começar", icon: Sparkles, tone: "#5BB8FF" },
    gradient: "linear-gradient(160deg, rgba(56,189,248,0.22), rgba(20,20,30,0.55))",
    accent: "#38BDF8",
    Icon: Star,
  },
  {
    id: "popular",
    packId: "boost_5",
    title: "Power Pack",
    subtitle: "5 Boosts",
    originalMultiplier: 1.25,
    perks: ["Até 10× visualizações", "30 min no topo", "Mais matches"],
    badge: { label: "Mais popular", icon: Flame, tone: "#FB923C" },
    gradient: "linear-gradient(160deg, rgba(168,85,247,0.28), rgba(20,20,30,0.6))",
    accent: "#A855F7",
    Icon: Zap,
  },
  {
    id: "mega",
    packId: "boost_15",
    title: "Mega Bundle",
    subtitle: "15 Boosts",
    originalMultiplier: 1.57,
    perks: ["Poupa 36%", "Suficiente para 2 semanas", "Vê quem te viu"],
    badge: { label: "Melhor valor", icon: Crown, tone: "#FFD66B" },
    gradient: "linear-gradient(160deg, rgba(255,79,163,0.28), rgba(177,60,255,0.22), rgba(20,20,30,0.6))",
    accent: "#FF4FA3",
    Icon: Zap,
  },
];

export function ProfileBundles() {
  const navigate = useNavigate();
  const { country } = useCountry();

  // Resolve each bundle's price from the country catalog at render time.
  const items = useMemo(
    () =>
      BUNDLES.map((b) => {
        const pack = getPack(b.packId, country);
        const price = pack?.price ?? 0;
        const original = b.originalMultiplier ? Math.round(price * b.originalMultiplier) : null;
        return { bundle: b, price, original };
      }),
    [country],
  );

  return (
    <section className="relative px-5 pt-2 pb-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-[20px] tracking-tight text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
            <Sparkles size={16} style={{ color: "#FF4FA3" }} />
            Pacotes & Bundles
          </h3>
          <p className="text-[11.5px] text-muted-foreground tracking-tight mt-0.5">
            Poupa mais comprando em pacote
          </p>
        </div>
        <Link
          to="/shop"
          onClick={() => hapticTap()}
          className="text-[11.5px] font-semibold text-muted-foreground inline-flex items-center gap-0.5 active:scale-95 transition-transform"
        >
          Ver tudo <ChevronRight size={13} />
        </Link>
      </div>

      <div className="-mx-5 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar">
        <div className="flex gap-3 px-5 pb-1">
          {items.map(({ bundle: b, price, original }, i) => {
            const discount = original ? Math.round((1 - price / original) * 100) : 0;
            const BadgeIcon = b.badge?.icon;
            return (
              <motion.button
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                onClick={() => {
                  hapticTap();
                  navigate({
                    to: "/checkout",
                    search: {
                      title: `${b.title} · ${b.subtitle}`,
                      subtitle: "Crédito instantâneo após confirmação",
                      amount: price,
                      packId: b.packId,
                      returnTo: "/profile",
                    },
                  });
                }}
                className="bundle-card relative shrink-0 snap-start w-[260px] text-left rounded-[20px] overflow-hidden border border-white/10 active:scale-[0.98] transition-transform"
                style={{ background: b.gradient }}
              >
                <div
                  aria-hidden
                  className="bundle-halo pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-3xl"
                  style={{ background: b.accent }}
                />


                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-3 min-h-[20px]">
                    {b.badge && BadgeIcon ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                        style={{ background: `${b.badge.tone}22`, color: b.badge.tone }}
                      >
                        <BadgeIcon size={10} /> {b.badge.label}
                      </span>
                    ) : <span />}
                    {discount > 0 && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                        −{discount}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
                      style={{
                        background: `${b.accent}22`,
                        boxShadow: `0 8px 20px -8px ${b.accent}99`,
                      }}
                    >
                      <b.Icon size={22} fill={b.accent} stroke="none" />
                    </div>
                    <div className="min-w-0">
                      <p className="bundle-text-primary text-[15px] font-extrabold tracking-tight text-white leading-tight">
                        {b.title}
                      </p>
                      <p className="bundle-text-secondary text-[12px] text-white/70 tracking-tight">{b.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3.5">
                    {b.perks.map((p) => (
                      <div key={p} className="flex items-center gap-2">
                        <div
                          className="h-[14px] w-[14px] rounded-full grid place-items-center shrink-0"
                          style={{ background: b.accent }}
                        >
                          <Check size={9} color="#fff" strokeWidth={4} />
                        </div>
                        <span className="bundle-text-secondary text-[12px] text-white/85 tracking-tight">{p}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      {original && (
                        <p className="bundle-text-muted text-[11px] text-white/40 line-through leading-none">
                          {formatCountryPrice(original, country)}
                        </p>
                      )}
                      <p className="bundle-text-primary text-[20px] font-black tracking-tight text-white leading-tight">
                        {formatCountryPrice(price, country)}
                      </p>

                    </div>
                    <div
                      className="rounded-xl px-3.5 py-2 text-[12px] font-extrabold text-white shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${b.accent}, ${b.accent}cc)`,
                        boxShadow: `0 8px 20px -6px ${b.accent}aa`,
                      }}
                    >
                      Comprar
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {active && (
        <DebitoCheckoutSheet
          open={!!active}
          onClose={() => setActive(null)}
          title={`${active.bundle.title} · ${active.bundle.subtitle}`}
          subtitle="Crédito instantâneo após confirmação"
          amountMzn={active.price}
          packId={active.bundle.packId}
        />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
