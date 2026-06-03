import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useMotionValue } from "framer-motion";
import { toast } from "sonner";

import { BottomNav } from "@/components/BottomNav";
import { ProfileCard } from "@/components/ProfileCard";
import { SwipeActions } from "@/components/SwipeActions";
import { DiscoverTopBar } from "@/components/DiscoverTopBar";
import { EmptyDiscovery } from "@/components/discovery/EmptyDiscovery";
import { MatchOverlay } from "@/components/discovery/MatchOverlay";
import { FiltersSheet, DEFAULT_FILTERS, type DiscoveryFilters } from "@/components/FiltersSheet";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useCredits } from "@/hooks/useCredits";
import { useBoost } from "@/hooks/useBoost";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
  const { user } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const { items, loading, swipe, rewind, reload } = useDiscovery({ filters });
  const { credits } = useCredits();
  const goShop = () => navigate({ to: "/shop" });
  const boost = useBoost(goShop);
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<{ id: string; name: string; photo?: string | null } | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
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
    distance: p.distance,
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
    if (result.matched) setMatched({ id: target.id, name: target.name, photo: target.photos?.[0] ?? null });
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
        <DiscoverTopBar onOpenFilters={() => setFiltersOpen(true)} onBoost={boost.activate} />
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
          <EmptyDiscovery loading={loading} onRefresh={reload} />
        )}
      </div>

      <MatchOverlay
        open={!!matched}
        targetName={matched?.name ?? ""}
        targetPhoto={matched?.photo}
        sending={openingChat}
        onClose={() => setMatched(null)}
        onSendMessage={async () => {
          if (!matched || !user) return;
          setOpeningChat(true);
          // Try a few times — match row is created by a trigger that may
          // race with the swipe insert response.
          let matchId: string | null = null;
          for (let i = 0; i < 5 && !matchId; i++) {
            const { data } = await supabase
              .from("matches")
              .select("id")
              .or(
                `and(user_a.eq.${user.id},user_b.eq.${matched.id}),and(user_a.eq.${matched.id},user_b.eq.${user.id})`
              )
              .maybeSingle();
            matchId = (data as { id?: string } | null)?.id ?? null;
            if (!matchId) await new Promise((r) => setTimeout(r, 250));
          }
          setOpeningChat(false);
          if (matchId) {
            setMatched(null);
            navigate({ to: "/chat/$matchId", params: { matchId } });
          } else {
            toast.error("Match ainda a sincronizar — tenta em /matches");
            setMatched(null);
            navigate({ to: "/matches" });
          }
        }}
      />

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onChange={setFilters}
        isPremium={false}
        onUpgrade={goShop}
      />

      {!filtersOpen && <BottomNav />}
    </div>
  );
}
