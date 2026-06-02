import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Zap, Star, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { useCredits } from "@/hooks/useCredits";
import { requireAuthAndOnboarding } from "@/lib/authGuard";
import { toast } from "sonner";

export const Route = createFileRoute("/shop")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: "Loja — Boost & Super Likes" },
      { name: "description", content: "Compra Boosts e Super Likes para apareceres mais." },
    ],
  }),
  component: ShopPage,
});

interface Pack {
  id: string;
  kind: "boost" | "super_like";
  quantity: number;
  priceMzn: number;
  label?: string;
}

const PACKS: Pack[] = [
  { id: "boost_1", kind: "boost", quantity: 1, priceMzn: 199 },
  { id: "boost_5", kind: "boost", quantity: 5, priceMzn: 799, label: "Popular" },
  { id: "boost_15", kind: "boost", quantity: 15, priceMzn: 1899, label: "Melhor valor" },
  { id: "super_like_5", kind: "super_like", quantity: 5, priceMzn: 299 },
  { id: "super_like_25", kind: "super_like", quantity: 25, priceMzn: 1299, label: "Popular" },
  { id: "super_like_60", kind: "super_like", quantity: 60, priceMzn: 2499, label: "Melhor valor" },
];

function ShopPage() {
  const navigate = useNavigate();
  const { credits } = useCredits();

  const boosts = PACKS.filter((p) => p.kind === "boost");
  const supers = PACKS.filter((p) => p.kind === "super_like");

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: "max(var(--sat, 16px), 16px)" }}
      >
        <button
          onClick={() => navigate({ to: "/discover" })}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06]"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold">Loja</h1>
      </div>

      {/* Saldo atual */}
      <div className="mx-4 mb-6 grid grid-cols-2 gap-3">
        <BalanceTile
          icon={<Zap size={20} fill="#C026D3" stroke="none" />}
          label="Boosts"
          value={credits.boost_balance}
        />
        <BalanceTile
          icon={<Star size={20} fill="#3b82f6" stroke="none" />}
          label="Super Likes"
          value={credits.super_like_balance}
        />
      </div>

      <Section
        title="⚡ Boosts"
        subtitle="Apareces no topo do feed por 30 min"
      >
        {boosts.map((p) => (
          <PackCard key={p.id} pack={p} accent="from-purple-500 to-fuchsia-500" />
        ))}
      </Section>

      <Section
        title="⭐ Super Likes"
        subtitle="3x mais probabilidade de match"
      >
        {supers.map((p) => (
          <PackCard key={p.id} pack={p} accent="from-sky-500 to-blue-500" />
        ))}
      </Section>

      <BottomNav />
    </div>
  );
}

function BalanceTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 px-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PackCard({ pack, accent }: { pack: Pack; accent: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() =>
        toast("Pagamentos em breve", {
          description: "Vamos ligar Stripe / Debito Pay nesta loja.",
        })
      }
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"
    >
      <div>
        <div className="text-base font-bold">
          {pack.quantity}× {pack.kind === "boost" ? "Boost" : "Super Like"}
        </div>
        {pack.label && (
          <div className="mt-0.5 text-xs font-semibold text-pink-400">
            {pack.label}
          </div>
        )}
      </div>
      <div
        className={`rounded-full bg-gradient-to-r ${accent} px-4 py-2 text-sm font-semibold text-white shadow-lg`}
      >
        {pack.priceMzn.toLocaleString("pt-PT")} MZN
      </div>
    </motion.button>
  );
}
