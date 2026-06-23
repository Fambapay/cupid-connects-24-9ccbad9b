import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/BottomNav";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import { EmptyDiscovery } from "@/components/discovery/EmptyDiscovery";
import { MatchOverlay } from "@/components/discovery/MatchOverlay";
import { FiltersSheet, DEFAULT_FILTERS, type DiscoveryFilters } from "@/components/FiltersSheet";
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { CreditShopSheet } from "@/components/paywall/CreditShopSheet";
import type { PackKind } from "@/lib/pricing";
import { FirstImpressionSheet } from "@/components/discovery/FirstImpressionSheet";
import { FirstImpressionToast } from "@/components/discovery/FirstImpressionToast";
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
      { title: "Descobrir matches — Hunie" },
      { name: "description", content: "Descobre perfis verificados perto de ti. Desliza, dá like e encontra o teu próximo match na comunidade Hunie." },
      { property: "og:title", content: "Descobrir matches — Hunie" },
      { property: "og:description", content: "Descobre perfis verificados perto de ti. Desliza, dá like e encontra o teu próximo match na comunidade Hunie." },
      { property: "og:url", content: "https://hunie.app/discover" },
    ],
    links: [{ rel: "canonical", href: "https://hunie.app/discover" }],
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
  const boost = useBoost(() => setCreditShop("boost"));
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<{ id: string; name: string; photo?: string | null } | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [creditShop, setCreditShop] = useState<PackKind | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [firstImpression, setFirstImpression] = useState<DiscoveryProfile | null>(null);
  const [sendingFI, setSendingFI] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { profileId: string; direction: "like" | "super"; firstImpressionMessage?: string }
    | null
  >(null);

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

  // Free users browse the full feed; the daily-likes counter (5/day) gates the like action itself.
  const visible = mapped;

  const performSwipe = async (
    target: { id: string; name: string; photo?: string | null },
    direction: "like" | "super" | "pass",
    options?: { firstImpressionMessage?: string },
  ) => {
    const result = await swipe(target.id, direction, options);
    const isFI = !!options?.firstImpressionMessage;
    if (isFI) {
      if (result.reason === "insufficient_credits") {
        toast.error("Sem First Impressions disponíveis este mês");
        return result;
      }
      if (typeof result.remainingFirstImpressions === "number") {
        syncCredits({ first_impression_balance: result.remainingFirstImpressions });
      }
      reloadCredits();
    } else if (direction === "super") {
      if (result.reason === "insufficient_credits") {
        setCreditShop("super_like");
        return result;
      }
      if (typeof result.remainingSuperLikes === "number") {
        syncCredits({ super_like_balance: result.remainingSuperLikes });
      }
      reloadCredits();
    }
    if (result.matched) {
      setMatched({ id: target.id, name: target.name, photo: target.photo ?? null });
    }
    return result;
  };

  const handleSwipe = async (
    target: DiscoveryProfile,
    dir: SwipeDirection,
  ): Promise<void | "blocked"> => {
    const direction = dir === "right" ? "like" : dir === "up" ? "super" : "pass";

    // Pass (dislike) is always free — never trigger paywall.
    if (direction === "pass") {
      setIndex((i) => i + 1);
      await performSwipe({ id: target.id, name: target.name, photo: target.photos?.[0] }, "pass");
      return;
    }

    // Super Like requires active membership for non-premium users.
    if (direction === "super" && !isPremium) {
      setPendingAction({ profileId: target.id, direction });
      openPaywall();
      return "blocked";
    }

    // Like: free users get 5/day. On the 6th attempt, open paywall.
    if (direction === "like" && !isPremium) {
      if (dailyLimits.likesLimit >= 0 && dailyLimits.likesRemaining <= 0) {
        setPendingAction({ profileId: target.id, direction });
        openPaywall();
        return "blocked";
      }
    }

    // Premium daily-limit guard (likesLimit < 0 means unlimited).
    if (dailyLimits.likesLimit >= 0 && dailyLimits.likesRemaining <= 0 && isPremium) {
      toast.error("Atingiste o limite diário de likes.");
      return "blocked";
    }
    setIndex((i) => i + 1);
    const res = await performSwipe(
      { id: target.id, name: target.name, photo: target.photos?.[0] },
      direction,
    );
    if (direction === "super" && res?.reason === "insufficient_credits") {
      // Credit shop was opened by performSwipe; bounce the card back so the
      // profile returns to the stack (same UX as the out-of-likes case).
      setIndex((i) => Math.max(0, i - 1));
      return "blocked";
    }
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
    // Boost ativa-se com créditos, não com membership.
    // Qualquer user (Free ou Premium) que tenha boost_balance > 0 pode ativar.
    // Sem créditos → manda para a loja (onInsufficient já tratado pelo useBoost,
    // mas validamos antes para evitar uma RPC desnecessária).
    if (credits.boost_balance <= 0) { setCreditShop("boost"); return; }
    boost.activate();
  };

  const onOpenFilters = () => {
    setFiltersOpen(true);
  };

  const onFirstImpression = (profile: DiscoveryProfile) => {
    setFirstImpression(profile);
  };

  const handleSendFirstImpression = async (message: string) => {
    if (!firstImpression || sendingFI) return;
    const target = firstImpression;
    if (!entitlements.canSendFirstImpression) {
      setFirstImpression(null);
      openPaywall();
      return;
    }
    if (credits.first_impression_balance <= 0) {
      setFirstImpression(null);
      toast.error("Sem First Impressions disponíveis este mês");
      return;
    }
    setSendingFI(true);
    try {
      const result = await performSwipe(
        { id: target.id, name: target.name, photo: target.photos?.[0] },
        "super",
        { firstImpressionMessage: message },
      );
      if (result?.reason) {
        // performSwipe already surfaced the right error toast / paywall.
        // Keep card visible so the user can retry or pass.
        return;
      }
      // Only advance & close sheet on confirmed success.
      setFirstImpression(null);
      setIndex((i) => i + 1);
      toast.custom(
        () => (
          <FirstImpressionToast photo={target.photos?.[0]} name={target.name} />
        ),
        { duration: 2600 },
      );
    } finally {
      setSendingFI(false);
    }
  };

  return (
    <div className="relative h-[100lvh] overflow-hidden bg-background text-foreground">
      <h1 className="sr-only">Descobrir matches verificados na Hunie</h1>
      <main
        className="relative w-full overflow-hidden"
        style={{
          pointerEvents: "auto",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: `calc(max(env(safe-area-inset-bottom) - 22px, 6px) + 56px + 8px)`,
        }}
      >
        {visible.length > 0 ? (
          <DiscoveryPage
            profiles={visible}
            onSwipe={handleSwipe}
            onOpenFilters={onOpenFilters}
            onBoost={onBoost}
            onFirstImpression={onFirstImpression}
            onRewind={onRewind}
            onEnd={reload}
            boostActive={boost.active}
            boostMultiplier={10}
          />

        ) : (
          <EmptyDiscovery loading={loading} onRefresh={reload} onOpenFilters={onOpenFilters} />
        )}
      </main>


      {!isPremium && bannerVisible && items.length > 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          <BrowseBanner count={items.length} onActivate={openPaywall} />
        </div>
      )}

      <PaywallSheet
        open={paywallOpen}
        onClose={() => {
          setPaywallOpen(false);
          setPendingAction(null);
        }}
        onSuccess={async () => {
          setPaywallOpen(false);
          const action = pendingAction;
          setPendingAction(null);
          await reload();
          if (action) {
            // Auto-record the like that triggered the paywall.
            const target = items.find((p) => p.id === action.profileId);
            if (target) {
              setIndex((i) => i + 1);
              await performSwipe(
                { id: target.id, name: target.name, photo: target.photos?.[0] },
                action.direction,
                action.firstImpressionMessage
                  ? { firstImpressionMessage: action.firstImpressionMessage }
                  : undefined,
              );
            }
          }
        }}
      />

      <CreditShopSheet
        open={creditShop !== null}
        kind={creditShop ?? "super_like"}
        onClose={() => setCreditShop(null)}
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

          // Try direct query first — the match trigger usually runs in <100ms.
          const findMatch = async (): Promise<string | null> => {
            const { data } = await supabase
              .from("matches")
              .select("id")
              .or(
                `and(user_a.eq.${user.id},user_b.eq.${matched.id}),and(user_a.eq.${matched.id},user_b.eq.${user.id})`,
              )
              .maybeSingle();
            return (data as { id?: string } | null)?.id ?? null;
          };

          let matchId = await findMatch();

          // If not yet present, listen for the INSERT via realtime with a
          // 4s ceiling — much more responsive than polling and handles slow triggers.
          if (!matchId) {
            matchId = await new Promise<string | null>((resolve) => {
              const channel = supabase
                .channel(`match-wait-${user.id}-${matched.id}`)
                .on(
                  "postgres_changes",
                  { event: "INSERT", schema: "public", table: "matches", filter: `user_a=eq.${user.id}` },
                  (payload) => {
                    const m = payload.new as { id: string; user_b: string };
                    if (m.user_b === matched.id) {
                      cleanup();
                      resolve(m.id);
                    }
                  },
                )
                .on(
                  "postgres_changes",
                  { event: "INSERT", schema: "public", table: "matches", filter: `user_b=eq.${user.id}` },
                  (payload) => {
                    const m = payload.new as { id: string; user_a: string };
                    if (m.user_a === matched.id) {
                      cleanup();
                      resolve(m.id);
                    }
                  },
                )
                .subscribe();
              const timeout = window.setTimeout(async () => {
                cleanup();
                resolve(await findMatch());
              }, 4000);
              function cleanup() {
                window.clearTimeout(timeout);
                supabase.removeChannel(channel);
              }
            });
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

      <FirstImpressionSheet
        open={!!firstImpression}
        profile={firstImpression}
        firstImpressionBalance={credits.first_impression_balance}
        onClose={() => setFirstImpression(null)}
        onSend={handleSendFirstImpression}
      />

      {!filtersOpen && !firstImpression && <BottomNav />}
    </div>
  );
}

