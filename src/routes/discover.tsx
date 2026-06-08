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
import { PaywallFlow } from "@/components/paywall/PaywallFlow";
import { BrowseBanner } from "@/components/discovery/BrowseBanner";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useCredits } from "@/hooks/useCredits";
import { useBoost } from "@/hooks/useBoost";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
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
  const { isPremium, entitlements } = useSubscription();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const { items, loading, swipe, rewind, reload, dailyLimits } = useDiscovery({ filters });
  const { credits, reload: reloadCredits, syncCredits } = useCredits();
  const goShop = () => navigate({ to: "/shop" });
  const boost = useBoost(goShop);
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<{ id: string; name: string; photo?: string | null } | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const cardRef = useRef<React.ComponentRef<typeof ProfileCard>>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  // Show banner after 3s if not premium
  useEffect(() => {
    if (isPremium) {
      setBannerVisible(false);
      return;
    }
    const t = setTimeout(() => setBannerVisible(true), 3000);
    return () => clearTimeout(t);
  }, [isPremium]);

  const openPaywall = () => {
    setBannerVisible(false);
    setPaywallOpen(true);
  };

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

  // Limit non-members to first 6 profiles
  const visible = isPremium ? mapped : mapped.slice(0, 6);
  const current = visible[index];
  const next = visible.slice(index + 1, index + 3);

  const handleSwipe = async (dir: SwipeDirection) => {
    if (!isPremium) {
      openPaywall();
      return;
    }
    const target = current;
    const direction = dir === "right" ? "like" : dir === "up" ? "super" : "pass";
    if ((direction === "like" || direction === "super") && dailyLimits.likesLimit >= 0 && dailyLimits.likesRemaining <= 0) {
      toast.error("Atingiste o limite diário de likes.");
      return;
    }
    x.set(0);
    y.set(0);
    setIndex((i) => i + 1);
    if (!target) return;
    const result = await swipe(target.id, direction);
    if (direction === "super") {
      if (result.reason === "insufficient_credits") {
        toast.error("Sem Super Likes — vai à loja");
        goShop();
        return;
      }
      if (typeof result.remainingSuperLikes === "number") {
        syncCredits({ super_like_balance: result.remainingSuperLikes });
      }
      reloadCredits();
    }
    if (result.matched) setMatched({ id: target.id, name: target.name, photo: target.photos?.[0] ?? null });
  };

  const handleRewind = async () => {
    if (!isPremium) { openPaywall(); return; }
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
    <div className="fixed inset-0 overflow-hidden bg-black text-white" onClick={!isPremium ? openPaywall : undefined}>
      <div className="absolute inset-0" style={{ top: "-20px" }} onClick={(e) => e.stopPropagation()}>
        <DiscoverTopBar onOpenFilters={() => isPremium ? setFiltersOpen(true) : openPaywall()} onBoost={isPremium ? boost.activate : openPaywall} boostActive={boost.active} boostRemainingMinutes={boost.remainingMinutes} />
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
            {isPremium && (
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
                  canRewind={entitlements.canRewind}
                  cardX={x}
                  photoUrl={current.photos[0]}
                  cardKey={current.id}
                  purchasedSuperLikes={credits.super_like_balance}
                  dailyLimits={dailyLimits}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyDiscovery loading={loading} onRefresh={reload} />
        )}
      </div>

      {!isPremium && bannerVisible && (
        <div onClick={(e) => e.stopPropagation()}>
          <BrowseBanner count={Math.max(3, Math.min(items.length, 12))} onActivate={openPaywall} />
        </div>
      )}

      <PaywallFlow
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onSuccess={() => {
          setPaywallOpen(false);
          reload();
        }}
      />

      <MatchOverlay
        open={!!matched}
        targetName={matched?.name ?? ""}
        targetPhoto={matched?.photo}
        sending={openingChat}
        onClose={() => setMatched(null)}
        onSendMessage={async () => {
          if (!matched || !user) return;
          setOpeningChat(true);
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
        isPremium={entitlements.canUseAdvancedFilters}
        onUpgrade={goShop}
      />

      {!filtersOpen && <BottomNav />}
    </div>
  );
}
