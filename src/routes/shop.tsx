import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Zap,
  Star,
  Sparkles,
  TrendingUp,
  Eye,
  Heart,
  Shield,
  Crown,
  Flame,
  Infinity as InfinityIcon,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BottomNav } from "@/components/BottomNav";
import { useCredits } from "@/hooks/useCredits";
import { requireAuthAndOnboarding } from "@/lib/authGuard";
import { DebitoCheckoutSheet } from "@/components/DebitoCheckoutSheet";

type PackKind = "boost" | "super_like";

interface Pack {
  id: string;
  kind: PackKind;
  quantity: number;
  priceMzn: number;
  popular?: boolean;
  best?: boolean;
}

const PACKS: Pack[] = [
  { id: "boost_1", kind: "boost", quantity: 1, priceMzn: 199 },
  { id: "boost_5", kind: "boost", quantity: 5, priceMzn: 799, popular: true },
  { id: "boost_15", kind: "boost", quantity: 15, priceMzn: 1899, best: true },
  { id: "super_like_5", kind: "super_like", quantity: 5, priceMzn: 299 },
  { id: "super_like_25", kind: "super_like", quantity: 25, priceMzn: 1299, popular: true },
  { id: "super_like_60", kind: "super_like", quantity: 60, priceMzn: 2499, best: true },
];

const POSITION_HOOKS = ["Para testar", "A escolha de 7 em cada 10", "Maior poupança"];

const TAB_COPY: Record<PackKind, { hook: string; sub: string; benefits: { icon: typeof TrendingUp; label: string }[] }> = {
  boost: {
    hook: "Sê visto primeiro.",
    sub: "30 minutos no topo do feed da tua zona.",
    benefits: [
      { icon: TrendingUp, label: "Até 10× visualizações" },
      { icon: Eye, label: "30 min no topo" },
      { icon: Heart, label: "Mais matches" },
    ],
  },
  super_like: {
    hook: "Destaca-te à primeira.",
    sub: "Quem recebe um Super Like tem 3× mais probabilidade de dar match.",
    benefits: [
      { icon: Heart, label: "3× mais matches" },
      { icon: Sparkles, label: "Notificação especial" },
      { icon: Eye, label: "Apareces primeiro" },
    ],
  },
};

const searchSchema = z.object({
  tab: z.enum(["boost", "super_like"]).optional(),
});

export const Route = createFileRoute("/shop")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Hunie Store — Boosts & Super Likes" },
      { name: "description", content: "Compra Boosts e Super Likes para apareceres mais e ter mais matches." },
    ],
  }),
  component: ShopPage,
});

function formatMZN(n: number) {
  return `${n.toLocaleString("pt-PT")} MZN`;
}

function unitPrice(p: Pack) {
  return Math.round((p.priceMzn / p.quantity) * 10) / 10;
}

function discountPct(kind: PackKind, pricePerUnit: number) {
  const base = PACKS.find((p) => p.kind === kind && p.quantity === 1)?.priceMzn
    ?? (kind === "super_like" ? PACKS.find((p) => p.kind === kind)!.priceMzn / PACKS.find((p) => p.kind === kind)!.quantity : 0);
  if (!base) return 0;
  return Math.round((1 - pricePerUnit / base) * 100);
}

function ShopPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { credits } = useCredits();
  const [tab, setTab] = useState<PackKind>(search.tab ?? "boost");

  useEffect(() => {
    if (search.tab && search.tab !== tab) setTab(search.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tab]);

  const packs = useMemo(() => PACKS.filter((p) => p.kind === tab), [tab]);
  const copy = TAB_COPY[tab];
  const tabCount = tab === "boost" ? credits.boost_balance : credits.super_like_balance;

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl"
        style={{ paddingTop: "max(var(--sat, 12px), 12px)" }}
      >
        <div className="flex items-center gap-3 px-4 pb-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate({ to: "/discover" })}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06]"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-black leading-none tracking-tight">Hunie Store</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <Sparkles size={10} /> Pro
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Ofertas ativas agora
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="grid h-12 grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <TabButton
              active={tab === "boost"}
              onClick={() => setTab("boost")}
              icon={<Zap size={16} fill={tab === "boost" ? "#fff" : "transparent"} />}
              label="Boosts"
              count={credits.boost_balance}
              gradient="from-fuchsia-500 to-indigo-500"
            />
            <TabButton
              active={tab === "super_like"}
              onClick={() => setTab("super_like")}
              icon={<Star size={16} fill={tab === "super_like" ? "#fff" : "transparent"} />}
              label="Super Likes"
              count={credits.super_like_balance}
              gradient="from-sky-400 to-blue-500"
            />
          </div>
        </div>
      </header>

      {/* Hero + list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Hero */}
          <div className="mx-4 mt-4">
            <div
              className="relative overflow-hidden rounded-3xl border border-white/10 p-5"
              style={{
                background:
                  tab === "boost"
                    ? "linear-gradient(160deg, rgba(168,85,247,0.22), rgba(20,20,30,0.6))"
                    : "linear-gradient(160deg, rgba(56,189,248,0.22), rgba(20,20,30,0.6))",
              }}
            >
              <div
                className="absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-40 blur-3xl"
                style={{ background: tab === "boost" ? "#A855F7" : "#38BDF8" }}
              />
              <div className="relative">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                  {tab === "boost" ? (
                    <Zap size={24} fill="#C026D3" stroke="none" />
                  ) : (
                    <Star size={24} fill="#38BDF8" stroke="none" />
                  )}
                </div>
                <h2 className="text-[22px] font-extrabold leading-tight">{copy.hook}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">{copy.sub}</p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {copy.benefits.map(({ icon: Icon, label }) => (
                    <div key={label} className="rounded-xl bg-white/[0.05] px-2 py-2">
                      <Icon size={14} className="mb-1 text-white/80" />
                      <div className="text-[11px] leading-tight text-white/80">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Tens <b className="text-white">{tabCount}</b> disponíve{tabCount === 1 ? "l" : "is"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 font-semibold text-orange-300">
                    <Flame size={10} /> Procurado agora
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pack list */}
          <div className="mt-5 space-y-3 px-4">
            {packs.map((pack, i) => (
              <PackCard key={pack.id} pack={pack} index={i} />
            ))}
          </div>

          {/* Trust row */}
          <div className="mx-4 mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
            <TrustTile icon={<Shield size={14} />} label="Pagamento seguro" />
            <TrustTile icon={<Sparkles size={14} />} label="Crédito instantâneo" />
            <TrustTile icon={<InfinityIcon size={14} />} label="Nunca expira" />
          </div>
          <p className="mx-4 mt-3 text-center text-[10.5px] leading-relaxed text-muted-foreground/80">
            Mais de 12 000 compras processadas · Sem renovações automáticas
          </p>
        </motion.div>
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  gradient,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  gradient: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="relative flex items-center justify-center gap-2 rounded-xl text-sm font-semibold"
    >
      {active && (
        <motion.span
          layoutId="shop-tab-pill"
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
        />
      )}
      <span className={`relative z-10 flex items-center gap-2 ${active ? "text-white" : "text-white/70"}`}>
        {icon}
        <span>{label}</span>
        <span
          className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold ${
            active ? "bg-white/25 text-white" : "bg-white/10 text-white/80"
          }`}
        >
          {count}
        </span>
      </span>
    </button>
  );
}

function TrustTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-white/5 bg-white/[0.03] py-3">
      <span className="text-white/80">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function PackCard({ pack, index }: { pack: Pack; index: number }) {
  const [loading, setLoading] = useState(false);
  const accent =
    pack.kind === "boost"
      ? "from-fuchsia-500 to-indigo-500"
      : "from-sky-400 to-blue-500";
  const accentColor = pack.kind === "boost" ? "#A855F7" : "#38BDF8";
  const featured = pack.popular || pack.best;
  const unit = unitPrice(pack);
  const disc = discountPct(pack.kind, unit);

  const handleBuy = async () => {
    setLoading(true);
    // Stripe Checkout integration coming soon — keep UX honest.
    await new Promise((r) => setTimeout(r, 700));
    toast("Pagamentos em breve", {
      description: "Stripe Checkout vai ser ligado nesta loja muito em breve.",
    });
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="relative"
    >
      {featured && (
        <div
          className={`absolute inset-0 rounded-[18px] bg-gradient-to-br ${accent} opacity-90`}
          style={{ padding: 1.5 }}
        >
          <div className="h-full w-full rounded-[16.5px] bg-background" />
        </div>
      )}
      <div
        className={`relative overflow-hidden rounded-[16px] border ${
          featured ? "border-transparent" : "border-white/10"
        } bg-white/[0.04] p-4`}
      >
        {featured && (
          <div
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-40 blur-3xl"
            style={{ background: accentColor }}
          />
        )}
        <div className="relative">
          {/* Top badge / hook */}
          <div className="mb-3 flex items-center justify-between">
            {pack.popular ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-300">
                <Flame size={10} /> Mais Popular
              </span>
            ) : pack.best ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                <Crown size={10} /> Melhor Valor
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {POSITION_HOOKS[Math.min(index, POSITION_HOOKS.length - 1)]}
              </span>
            )}
            {disc > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                −{disc}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
              style={{ background: `${accentColor}22` }}
            >
              {pack.kind === "boost" ? (
                <Zap size={26} fill={accentColor} stroke="none" />
              ) : (
                <Star size={26} fill={accentColor} stroke="none" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-extrabold leading-none">{pack.quantity}</span>
                <span className="text-sm font-semibold text-white/80">
                  {pack.kind === "boost" ? "Boosts" : "Super Likes"}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {unit} MZN cada
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">{formatMZN(pack.priceMzn)}</div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            onClick={handleBuy}
            className={`relative mt-4 h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r ${accent} text-sm font-bold text-white shadow-lg disabled:opacity-60`}
          >
            <motion.span
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
              style={{
                background:
                  "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
              }}
              animate={{ x: ["0%", "400%"] }}
              transition={{
                duration: 2.6,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1.2,
              }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> A processar…
                </>
              ) : (
                <>✨ Desbloquear agora</>
              )}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
