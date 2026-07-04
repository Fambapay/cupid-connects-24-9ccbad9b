import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/BottomNav";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import { EmptyDiscovery } from "@/components/discovery/EmptyDiscovery";
import { MatchOverlay } from "@/components/discovery/MatchOverlay";
import { FiltersSheet, DEFAULT_FILTERS, type DiscoveryFilters } from "@/components/FiltersSheet";
import { loadFilters, saveFilters, sanitizeForNonPremium, countActiveFilters } from "@/lib/discoveryFilters";
import { PaywallSheet } from "@/components/paywall/PaywallSheet";
import { CreditShopSheet } from "@/components/paywall/CreditShopSheet";
import type { PackKind } from "@/lib/pricing";
import { FirstImpressionSheet } from "@/components/discovery/FirstImpressionSheet";
import { FirstImpressionToast } from "@/components/discovery/FirstImpressionToast";
import { OfferSheet } from "@/components/offers/OfferSheet";
import { TrialCountdownBanner } from "@/components/offers/TrialCountdownBanner";
import { useOfferEngine } from "@/hooks/useOfferEngine";




import { useDiscoveryDetailOpen } from "@/lib/discoveryDetail";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCredits } from "@/hooks/useCredits";
import { useBoost } from "@/hooks/useBoost";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useLikesCount } from "@/hooks/useLikesCount";
import { supabase } from "@/integrations/supabase/client";
import type { DiscoveryProfile, SwipeDirection } from "@/components/discovery/types";

import { requireAuthAndOnboarding } from "@/lib/authGuard";
import { useForceDarkTheme } from "@/lib/theme";
import { maybeRequestReview, recordMatch } from "@/lib/native/inAppReview";

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
  useForceDarkTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, entitlements, subscription } = useSubscription();
  const offerEngine = useOfferEngine();
  const likesCount = useLikesCount();
  useEffect(() => {
    if (likesCount >= 3) offerEngine.triggerLikesReceived();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likesCount]);

  // Preview/debug: ?offer=trial_last_24h força o pop-up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("offer");
    if (!t) return;
    const valid = [
      "trial_day_2",
      "trial_last_24h",
      "post_first_match",
      "likes_received",
      "winback_day_7",
      "winback_day_14",
      "always_on",
    ] as const;
    if ((valid as readonly string[]).includes(t)) {
      void offerEngine.forceShowOffer(t as (typeof valid)[number]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { profile } = useProfile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Hydrate from localStorage on first mount so filters survive route
  // remounts, tab switches, and reloads. `user?.id` scopes per account.
  const [filters, setFiltersState] = useState<DiscoveryFilters>(() => loadFilters(user?.id) ?? DEFAULT_FILTERS);
  const [filtersInitialized, setFiltersInitialized] = useState(() => loadFilters(user?.id) != null);
  const setFilters = (next: DiscoveryFilters) => {
    setFiltersState(next);
    saveFilters(user?.id, next);
    setFiltersInitialized(true);
  };
  // Re-hydrate when the signed-in user changes (login/logout in same session).
  useEffect(() => {
    const stored = loadFilters(user?.id);
    if (stored) {
      setFiltersState(stored);
      setFiltersInitialized(true);
    }
  }, [user?.id]);
  // Seed gender from onboarding preferences on first run only — if the user
  // has already customised filters (stored copy exists), respect that.
  useEffect(() => {
    if (filtersInitialized || !profile?.interested_in) return;
    const ii = profile.interested_in;
    // Any DB gender value → the UI bucket that covers it. Anything mixed
    // (bi, pan, "man+woman") falls back to "todos" so no cohort is hidden.
    const NB_VALUES = new Set(['nonbinary', 'genderfluid', 'agender', 'other']);
    let gender: DiscoveryFilters['gender'] = 'todos';
    if (ii.length === 1) {
      const only = ii[0];
      if (only === 'man' || only === 'transman') gender = 'masculino';
      else if (only === 'woman' || only === 'transwoman') gender = 'feminino';
      else if (NB_VALUES.has(only)) gender = 'nao_binario';
    }
    const seeded = { ...DEFAULT_FILTERS, gender };
    setFiltersState(seeded);
    saveFilters(user?.id, seeded);
    setFiltersInitialized(true);
  }, [profile?.interested_in, filtersInitialized, user?.id]);
  // If premium was cancelled, clear premium-only fields so they don't "revive"
  // on a future resubscription. Runs whenever entitlement flips off.
  useEffect(() => {
    if (isPremium) return;
    const sanitized = sanitizeForNonPremium(filters);
    if (JSON.stringify(sanitized) === JSON.stringify(filters)) return;
    setFiltersState(sanitized);
    saveFilters(user?.id, sanitized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);
  const activeFilters = countActiveFilters(filters);
  const { coords: gpsCoords } = useGeolocation(true);
  const { items, loading, swipe, rewind, reload, loadMore, dailyLimits, needsLocation, needsPreference } = useDiscovery({ filters, userCoords: gpsCoords, isPremium });

  const { credits, reload: reloadCredits, syncCredits } = useCredits();
  const goShop = () => navigate({ to: "/shop" });
  const boost = useBoost(() => setCreditShop("boost"));
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<{ id: string; name: string; photo?: string | null } | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [creditShop, setCreditShop] = useState<PackKind | null>(null);
  const [firstImpression, setFirstImpression] = useState<DiscoveryProfile | null>(null);
  const [sendingFI, setSendingFI] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { profileId: string; direction: "like" | "super"; firstImpressionMessage?: string }
    | null
  >(null);
  const detailOpen = useDiscoveryDetailOpen();

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  // Prefetch the next page when the user is 10 cards away from the end so
  // the stack never runs dry for power-users.
  useEffect(() => {
    if (items.length - index <= 10 && items.length > 0) {
      void loadMore();
    }
  }, [items.length, index, loadMore]);


  const openPaywall = () => {
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
    heightCm: p.height_cm,
    lookingFor: p.looking_for,
    pets: p.pets,
    smoking: p.smoking,
    drinking: p.drinking,
    workout: p.workout,
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
      recordMatch().catch(() => {});
    }
    return result;
  };

  const handleSwipe = async (
    target: DiscoveryProfile,
    dir: SwipeDirection,
  ): Promise<void | "blocked"> => {
    const direction = dir === "right" ? "like" : dir === "up" ? "super" : "pass";

    // Hard paywall: without premium access (trial/active/grace), block ALL swipes.
    if (!isPremium) {
      if (direction !== "pass") {
        setPendingAction({ profileId: target.id, direction });
      }
      openPaywall();
      return "blocked";
    }

    // Pass is free once inside premium access.
    if (direction === "pass") {
      setIndex((i) => i + 1);
      await performSwipe({ id: target.id, name: target.name, photo: target.photos?.[0] }, "pass");
      return;
    }

    setIndex((i) => i + 1);
    const res = await performSwipe(
      { id: target.id, name: target.name, photo: target.photos?.[0] },
      direction,
    );
    if (res?.reason === "paywall_required") {
      setIndex((i) => Math.max(0, i - 1));
      setPendingAction({ profileId: target.id, direction });
      openPaywall();
      return "blocked";
    }
    if (direction === "super" && res?.reason === "insufficient_credits") {
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
      {subscription.expiresAt && (
        <TrialCountdownBanner
          trialEndsAt={subscription.expiresAt}
          onTap={() => offerEngine.enqueueTrigger("trial_last_24h")}
        />
      )}
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
          <EmptyDiscovery loading={loading} onRefresh={reload} onOpenFilters={onOpenFilters} needsLocation={needsLocation} needsPreference={needsPreference} />
        )}
      </main>



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
        onClose={async () => {
          setMatched(null);
          await maybeRequestReview();
          // Após fechar a celebração do 1º match: se elegível, mostra a oferta pós-match.
          offerEngine.triggerPostFirstMatch();
        }}
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

      <OfferSheet
        offer={offerEngine.activeOffer}
        trialEndsAt={subscription.expiresAt}
        onDismiss={offerEngine.dismissOffer}
        onClaim={offerEngine.claimOffer}
        onSuccess={async () => {
          offerEngine.closeAfterClaim();
          await reload();
        }}
      />

      {!filtersOpen && !firstImpression && !offerEngine.activeOffer && <BottomNav />}
    </div>
  );
}

