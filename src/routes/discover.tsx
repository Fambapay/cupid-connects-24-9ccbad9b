import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useMotionValue } from "framer-motion";
import { toast } from "sonner";

import { BottomNav } from "@/components/BottomNav";
import { ProfileCard } from "@/components/ProfileCard";
import { SwipeActions } from "@/components/SwipeActions";
import { DiscoverTopBar } from "@/components/DiscoverTopBar";
import { EmptyDiscovery } from "@/components/discovery/EmptyDiscovery";
import { FiltersSheet, DEFAULT_FILTERS, type DiscoveryFilters } from "@/components/FiltersSheet";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useCredits } from "@/hooks/useCredits";
import { useBoost } from "@/hooks/useBoost";
import type { Profile, SwipeDirection } from "@/types/dating";

import { requireAuthAndOnboarding } from "@/lib/authGuard";

export const Route = createFileRoute("/discover")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: "Hunie — Descobrir" },
      { name: "description", content: "Desliza pra curtir, encontra o teu match." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const navigate = useNavigate();
  const { items, loading, swipe, rewind } = useDiscovery();
  const { credits } = useCredits();
  const goShop = () => navigate({ to: "/shop" });
  const boost = useBoost(goShop);
  const [index, setIndex] = useState(0);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const cardRef = useRef<React.ComponentRef<typeof ProfileCard>>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Reset index when items reload
  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  const mapped: Profile[] = items.map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    city: p.city,
    country: (p.country as Profile["country"]) || "Portugal",
    distance: 0,
    bio: p.bio,
    photos: p.photos,
    gender: (p.gender as Profile["gender"]) || "feminino",
    lookingFor: "ambos",
    interests: p.interests,
    isOnline: p.isOnline,
    is_verified: p.is_verified,
  }));

  const current = mapped[index];
  const next = mapped.slice(index + 1, index + 3);

  const handleSwipe = async (dir: SwipeDirection) => {
    const target = current;
    x.set(0);
    y.set(0);
    setIndex((i) => i + 1);
    if (!target) return;
    const direction = dir === "right" ? "like" : dir === "up" ? "super" : "pass";
    const result = await swipe(target.id, direction);
    if (direction === "super" && result.reason === "insufficient_credits") {
      toast.error("Sem Super Likes — vai à loja");
      goShop();
      return;
    }
    if (result.matched) setMatchedName(target.name);
  };

  const handleRewind = async () => {
    const res = await rewind();
    if (res.success) {
      toast.success("Voltaste atrás");
      setIndex(0);
    } else if (res.error === "no_swipe_found") {
      toast("Não há swipe para reverter");
    } else if (res.error === "match_exists") {
      toast.error("Já fizeram match — não dá para desfazer");
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div className="absolute inset-0" style={{ top: "-20px" }}>
        <DiscoverTopBar onOpenFilters={() => {}} onBoost={boost.activate} />
        {current ? (
          <>
            <ProfileCard
              ref={cardRef}
              key={current.id}
              profile={current}
              nextProfiles={next}
              isTop
              onSwipe={handleSwipe}
              sharedX={x}
              sharedY={y}
            />
            {boost.active && (
              <div
                className="absolute left-1/2 z-30 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg"
                style={{
                  top: "calc(max(var(--sat, 54px), 54px) + 8px)",
                  background: "linear-gradient(135deg,#a855f7,#ec4899)",
                  boxShadow: "0 0 16px rgba(168,85,247,0.55)",
                }}
              >
                ⚡ Boost ativo · {boost.remainingMinutes} min
              </div>
            )}
            <div
              data-swipe-actions
              className="absolute inset-x-0 z-30"
              style={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}
            >
              <SwipeActions
                onSwipe={(d) => {
                  if (d === "left") cardRef.current?.flyLeft?.();
                  else if (d === "right") cardRef.current?.flyRight?.();
                  else cardRef.current?.flyUp?.();
                }}
                onRewind={handleRewind}
                canRewind
                cardX={x}
                photoUrl={current.photos[0]}
                cardKey={current.id}
                purchasedSuperLikes={credits.super_like_balance}
              />
            </div>
          </>
        ) : (
          <EmptyDiscovery loading={loading} onRefresh={() => window.location.reload()} />
        )}
      </div>

      {matchedName && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-xl px-6"
          onClick={() => setMatchedName(null)}
        >
          <div className="rounded-3xl bg-gradient-flame p-8 text-center shadow-glow">
            <div className="text-6xl">🔥</div>
            <h3 className="mt-4 text-3xl font-black text-white">É um match!</h3>
            <p className="mt-2 text-white/90">Tu e {matchedName} curtiram-se mutuamente.</p>
            <button
              className="mt-6 rounded-full bg-white px-6 py-3 font-semibold text-flame"
              onClick={() => setMatchedName(null)}
            >
              Continuar a descobrir
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
