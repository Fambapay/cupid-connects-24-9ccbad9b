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
  onRewind?: () => void | Promise<unknown>;
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

  // Preload next cards' first photos so the stack behind the top card never
  // flashes black. Defer to idle time so it never competes with swipe rendering.
  useEffect(() => {
    const urls = [next1, next2, next3]
      .map((p) => p?.photos?.[0])
      .filter(Boolean) as string[];
    if (!urls.length) return;
    const run = () => {
      urls.forEach((url) => {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        img.decode?.().catch(() => {});
      });
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) {
      const id = ric(run, { timeout: 500 });
      return () => {
        const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        cic?.(id);
      };
    }
    const t = window.setTimeout(run, 50);
    return () => window.clearTimeout(t);
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
