import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";

import { BottomNav } from "@/components/BottomNav";
import { ProfileCard } from "@/components/ProfileCard";
import { SwipeActions } from "@/components/SwipeActions";
import { DiscoverTopBar } from "@/components/DiscoverTopBar";
import { profiles as mockProfiles } from "@/data/profiles";
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
  const items: Profile[] = useMemo(
    () =>
      mockProfiles.map((p) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        city: p.distance,
        country: "Portugal" as const,
        distance: 5,
        bio: p.bio,
        photos: [p.photo],
        gender: "feminino" as const,
        lookingFor: "masculino" as const,
        interests: p.interests,
        isOnline: true,
        is_verified: true,
      })),
    [],
  );

  const [index, setIndex] = useState(0);
  const cardRef = useRef<React.ComponentRef<typeof ProfileCard>>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const current = items[index];
  const next = items.slice(index + 1, index + 3);

  const handleSwipe = (_dir: SwipeDirection) => {
    x.set(0);
    y.set(0);
    setIndex((i) => i + 1);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div className="absolute inset-0" style={{ top: '-20px' }}>
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
            <DiscoverTopBar
              onOpenFilters={() => {}}
              onBoost={() => {}}
            />
            <div
              data-swipe-actions
              className="absolute inset-x-0 z-30"
              style={{
                bottom: "calc(96px + env(safe-area-inset-bottom))",
              }}
            >
              <SwipeActions
                onSwipe={(d) => {
                  if (d === "left") cardRef.current?.flyLeft?.();
                  else if (d === "right") cardRef.current?.flyRight?.();
                  else cardRef.current?.flyUp?.();
                }}
                cardX={x}
                photoUrl={current.photos[0]}
                cardKey={current.id}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-6xl">🍯</div>
            <h2 className="mt-4 text-2xl font-bold">Voltamos já</h2>
            <p className="mt-2 max-w-[280px] text-white/60">
              Não há mais perfis por agora. Volta mais tarde.
            </p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
