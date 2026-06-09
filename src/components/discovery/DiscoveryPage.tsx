import { useRef, useState, useCallback, useEffect } from "react";
import { useMotionValue } from "framer-motion";
import { ProfileCard, type ProfileCardHandle } from "./ProfileCard";
import { SwipeActions } from "./SwipeActions";
import { DiscoverTopBar } from "./DiscoverTopBar";
import { EmptyDiscovery } from "./EmptyDiscovery";
import type { DiscoveryProfile, SwipeDirection } from "./types";

interface DiscoveryPageProps {
  profiles: DiscoveryProfile[];
  onSwipe?: (
    profile: DiscoveryProfile,
    dir: SwipeDirection,
  ) => void | "blocked" | Promise<void | "blocked">;
  onOpenFilters?: () => void;
  onBoost?: () => void;
  onRewind?: () => boolean | Promise<boolean | unknown>;
  onEnd?: () => void;
  showTopBar?: boolean;
}

export const DiscoveryPage = ({
  profiles,
  onSwipe,
  onOpenFilters,
  onBoost,
  onRewind,
  onEnd,
  showTopBar = true,
}: DiscoveryPageProps) => {
  const [index, setIndex] = useState(0);
  const [rewinding, setRewinding] = useState(false);
  // Local stack of past swipes so rewind can restore the previous card and
  // animate it back from the direction it flew off.
  const [history, setHistory] = useState<{ id: string; dir: SwipeDirection }[]>([]);
  // One rewind allowed until the next swipe.
  const [rewindUsed, setRewindUsed] = useState(false);
  const [enterAnim, setEnterAnim] = useState<
    "rewind-left" | "rewind-right" | "rewind-up" | null
  >(null);
  const [animNonce, setAnimNonce] = useState(0);
  const cardRef = useRef<ProfileCardHandle>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const current = profiles[index];
  const next1 = profiles[index + 1];
  const next2 = profiles[index + 2];
  const next3 = profiles[index + 3];

  // Reset stack when the parent feed is replaced (e.g. filters / reload).
  const firstId = profiles[0]?.id;
  useEffect(() => {
    setIndex(0);
    setHistory([]);
    setRewindUsed(false);
    setEnterAnim(null);
  }, [firstId]);

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
    async (dir: SwipeDirection) => {
      if (!current) return;
      const result = await onSwipe?.(current, dir);
      if (result === "blocked") {
        // Parent rejected the swipe (e.g. out of likes → paywall).
        // Bounce the card back from where it flew off.
        setEnterAnim(
          dir === "left"
            ? "rewind-left"
            : dir === "right"
              ? "rewind-right"
              : "rewind-up",
        );
        return;
      }
      setHistory((h) => [...h, { id: current.id, dir }]);
      setRewindUsed(false);
      setEnterAnim(null);
      if (index + 1 >= profiles.length) onEnd?.();
      x.set(0);
      y.set(0);
      setIndex((i) => i + 1);
    },
    [current, index, profiles.length, onSwipe, onEnd, x, y],
  );

  const handleRewind = useCallback(async () => {
    if (rewinding || !onRewind || rewindUsed || history.length === 0 || index === 0) return;
    const last = history[history.length - 1];
    // Optimistic: restore the previous card and play reverse-direction entry.
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
    setEnterAnim(
      last.dir === "left"
        ? "rewind-left"
        : last.dir === "right"
          ? "rewind-right"
          : "rewind-up",
    );
    setRewindUsed(true);
    setRewinding(true);
    try {
      const ok = await onRewind();
      if (ok === false) {
        // Roll back optimistic UI on RPC failure.
        setHistory((h) => [...h, last]);
        setIndex((i) => i + 1);
        setEnterAnim(null);
        setRewindUsed(false);
      }
    } finally {
      setRewinding(false);
    }
  }, [onRewind, rewinding, rewindUsed, history, index]);

  const canRewind = !!onRewind && !rewinding && !rewindUsed && history.length > 0 && index > 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#000", color: "#fff" }}
    >
      {current ? (
        <>
          <ProfileCard
            ref={cardRef}
            key={`${current.id}:${enterAnim ?? "n"}`}
            profile={current}
            nextProfiles={[next1, next2].filter(Boolean) as DiscoveryProfile[]}
            onSwipe={handle}
            sharedX={x}
            sharedY={y}
            enterAnim={enterAnim}
            actions={
              <SwipeActions
                onSwipe={(d) => {
                  if (d === "left") cardRef.current?.flyLeft();
                  else if (d === "right") cardRef.current?.flyRight();
                  else cardRef.current?.flyUp();
                }}
                onBoost={onBoost}
                onRewind={handleRewind}
                canRewind={canRewind}
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
                onRewind={handleRewind}
                canRewind={canRewind}
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
