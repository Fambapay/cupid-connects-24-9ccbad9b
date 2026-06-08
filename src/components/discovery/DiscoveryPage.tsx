import { useRef, useState, useCallback, useEffect } from "react";
import { useMotionValue } from "framer-motion";
import { ProfileCard, type ProfileCardHandle } from "./ProfileCard";
import { SwipeActions } from "./SwipeActions";
import { DiscoverTopBar } from "./DiscoverTopBar";
import { EmptyDiscovery } from "./EmptyDiscovery";
import type { DiscoveryProfile, SwipeDirection } from "./types";

interface DiscoveryPageProps {
  profiles: DiscoveryProfile[];
  onSwipe?: (profile: DiscoveryProfile, dir: SwipeDirection) => void;
  onOpenFilters?: () => void;
  onBoost?: () => void;
  onEnd?: () => void;
  showTopBar?: boolean;
}

export const DiscoveryPage = ({
  profiles,
  onSwipe,
  onOpenFilters,
  onBoost,
  onEnd,
  showTopBar = true,
}: DiscoveryPageProps) => {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<ProfileCardHandle>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const current = profiles[index];
  const next1 = profiles[index + 1];
  const next2 = profiles[index + 2];
  const next3 = profiles[index + 3];

  // Aggressively preload the next 3 cards' first photos so the stack behind
  // the top card never flashes black during a swipe. Uses Image() + decode()
  // to push the decode work off the main thread before the user sees the card.
  useEffect(() => {
    [next1, next2, next3].forEach((p) => {
      const url = p?.photos?.[0];
      if (!url) return;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      img.decode?.().catch(() => {});
    });
  }, [next1, next2, next3]);

  const handle = useCallback(
    (dir: SwipeDirection) => {
      if (!current) return;
      onSwipe?.(current, dir);
      if (index + 1 >= profiles.length) onEnd?.();
      x.set(0);
      y.set(0);
      setIndex((i) => i + 1);
    },
    [current, index, profiles.length, onSwipe, onEnd, x, y],
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#000", color: "#fff" }}
    >
      {current ? (
        <>
          <ProfileCard
            ref={cardRef}
            key={current.id}
            profile={current}
            nextProfiles={[next1, next2].filter(Boolean) as DiscoveryProfile[]}
            onSwipe={handle}
            sharedX={x}
            sharedY={y}
            actions={
              <SwipeActions
                onSwipe={(d) => {
                  if (d === "left") cardRef.current?.flyLeft();
                  else if (d === "right") cardRef.current?.flyRight();
                  else cardRef.current?.flyUp();
                }}
                onBoost={onBoost}
              />
            }
            panelActions={
              <SwipeActions
                onSwipe={(d) => {
                  if (d === "left") cardRef.current?.flyLeft();
                  else if (d === "right") cardRef.current?.flyRight();
                  else cardRef.current?.flyUp();
                }}
                onBoost={onBoost}
              />
            }
          />
          {showTopBar && (
            <DiscoverTopBar onOpenFilters={onOpenFilters} onBoost={onBoost} />
          )}
        </>
      ) : (
        <EmptyDiscovery onRefresh={onEnd} />
      )}
    </div>
  );
};
