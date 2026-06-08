import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Heart, Info, RotateCcw, SlidersHorizontal, Star, X, Zap } from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
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

  const currentPhoto = current?.photos?.[0];

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <main className="relative h-[100svh] w-full overflow-hidden">
        <div
          className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between px-4"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 18px)" }}
        >
          <button
            type="button"
            onClick={() => (isPremium ? setFiltersOpen(true) : openPaywall())}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl"
            aria-label="Filtros"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={isPremium ? boost.activate : openPaywall}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl"
            aria-label="Boost"
          >
            <Zap className="h-5 w-5 text-brand-purple" fill="currentColor" />
            {boost.active && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brand-pink" />}
          </button>
        </div>

        {current ? (
          <section className="absolute inset-0 overflow-hidden bg-card">
            {next[0]?.photos?.[0] && (
              <img
                src={next[0].photos[0]}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm scale-105"
                draggable={false}
              />
            )}
            <div className="absolute inset-x-3 bottom-[92px] top-0 overflow-hidden rounded-[28px] bg-card shadow-card">
              {currentPhoto ? (
                <img
                  key={current.id}
                  src={currentPhoto}
                  alt={current.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="h-full w-full bg-gradient-flame" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-32 px-5 text-white">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h1 className="truncate text-4xl font-semibold leading-none text-white">
                        {current.name}
                      </h1>
                      <span className="text-3xl font-light text-white/85">{current.age}</span>
                    </div>
                    {current.city && <p className="mt-2 text-sm font-medium text-white/75">{current.city}</p>}
                    {current.bio && <p className="mt-3 line-clamp-2 max-w-[32rem] text-sm text-white/80">{current.bio}</p>}
                    {current.interests.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {current.interests.slice(0, 4).map((interest) => (
                          <span key={interest} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toast(current.bio || "Perfil sem mais detalhes.")}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-xl"
                    aria-label="Mais info"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div
              data-swipe-actions
              className="absolute inset-x-0 z-50 flex items-center justify-center gap-4 px-5"
              style={{ bottom: "calc(98px + env(safe-area-inset-bottom, 0px))" }}
            >
              <button
                type="button"
                onClick={handleRewind}
                className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/65 text-amber-300 shadow-soft backdrop-blur-xl"
                aria-label="Voltar"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => handleSwipe("left")}
                className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 text-white shadow-rose"
                aria-label="Passar"
              >
                <X className="h-8 w-8" />
              </button>
              <button
                type="button"
                onClick={() => handleSwipe("up")}
                className="relative grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-black/65 text-superlike shadow-soft backdrop-blur-xl"
                aria-label="Super like"
              >
                <Star className="h-7 w-7" fill="currentColor" />
                {credits.super_like_balance > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-superlike px-1 text-[10px] font-bold text-white">
                    {credits.super_like_balance}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSwipe("right")}
                className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-black/65 text-success shadow-mint backdrop-blur-xl"
                aria-label="Like"
              >
                <Heart className="h-8 w-8" />
              </button>
            </div>
          </section>
        ) : (
          <EmptyDiscovery loading={loading} onRefresh={reload} />
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
