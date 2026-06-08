import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/BottomNav";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
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
import type { DiscoveryProfile, SwipeDirection } from "@/components/discovery/types";

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

  const mapped: DiscoveryProfile[] = items.map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    city: p.city,
    distance: p.distance,
    bio: p.bio,
    photos: p.photos,
    interests: p.interests,
    isOnline: p.isOnline,
    isVerified: p.is_verified,
  }));

  // Limit non-members to first 6 profiles
  const visible = isPremium ? mapped : mapped.slice(0, 6);
  void index;

  const handleSwipe = async (target: DiscoveryProfile, dir: SwipeDirection) => {
    if (!isPremium) {
      openPaywall();
      return;
    }
    const direction = dir === "right" ? "like" : dir === "up" ? "super" : "pass";
    if ((direction === "like" || direction === "super") && dailyLimits.likesLimit >= 0 && dailyLimits.likesRemaining <= 0) {
      toast.error("Atingiste o limite diário de likes.");
      return;
    }
    setIndex((i) => i + 1);
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

  const onRewind = async (): Promise<boolean> => {
    if (!isPremium) { openPaywall(); return false; }
    const res = await rewind();
    if (!res.success) {
      if (res.error === "match_exists") toast.error("Já existe match — não dá para voltar atrás");
      else if (res.error === "no_swipe_found") toast.error("Não há swipe para reverter");
      else toast.error("Não foi possível reverter");
      return false;
    }
    return true;
  };

  const onBoost = () => {
    if (!isPremium) { openPaywall(); return; }
    boost.activate();
  };

  const onOpenFilters = () => {
    if (!isPremium) { openPaywall(); return; }
    setFiltersOpen(true);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <main
        className="relative w-full overflow-hidden"
        style={{
          height: "100svh",
          paddingBottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
          pointerEvents: "auto",
        }}
      >
        {visible.length > 0 ? (
          <DiscoveryPage
            profiles={visible}
            onSwipe={handleSwipe}
            onOpenFilters={onOpenFilters}
            onBoost={onBoost}
            onRewind={onRewind}
            onEnd={reload}
          />
        ) : (
          <EmptyDiscovery loading={loading} onRefresh={reload} onOpenFilters={onOpenFilters} />
        )}
      </main>


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

