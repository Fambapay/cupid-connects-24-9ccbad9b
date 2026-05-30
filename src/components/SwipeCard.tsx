import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { MapPin, SlidersHorizontal, Sparkles, ChevronUp } from "lucide-react";
import type { Profile } from "@/data/profiles";

type Props = {
  profile: Profile;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
  offset: number;
};

export function SwipeCard({ profile, onSwipe, isTop, offset }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  const handleEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) onSwipe("right");
    else if (info.offset.x < -120) onSwipe("left");
  };

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 10 - offset,
        scale: 1 - offset * 0.035,
        y: offset * 10,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* Outer white frame — premium polaroid feel */}
      <div className="relative h-full w-full rounded-[36px] bg-card p-2.5 shadow-card ring-1 ring-border/60">
        <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-secondary">
          <img
            src={profile.photo}
            alt={profile.name}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          {/* Soft gradient veil */}
          <div className="pointer-events-none absolute inset-0 card-overlay" />

          {/* Top floating controls */}
          {isTop && (
            <>
              <button
                type="button"
                aria-label="Filtros"
                className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-xl transition active:scale-90"
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                aria-label="Boost"
                className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-xl transition active:scale-90"
              >
                <Sparkles className="h-[18px] w-[18px] fill-current" strokeWidth={2} />
              </button>
            </>
          )}

          {/* Swipe stamps */}
          {isTop && (
            <>
              <motion.div
                style={{ opacity: likeOpacity }}
                className="pointer-events-none absolute left-6 top-24 -rotate-[10deg] rounded-2xl border-[3px] border-primary px-4 py-1.5 text-2xl font-extrabold uppercase tracking-wide text-primary"
              >
                Curti
              </motion.div>
              <motion.div
                style={{ opacity: nopeOpacity }}
                className="pointer-events-none absolute right-6 top-24 rotate-[10deg] rounded-2xl border-[3px] border-destructive px-4 py-1.5 text-2xl font-extrabold uppercase tracking-wide text-destructive"
              >
                Nope
              </motion.div>
            </>
          )}

          {/* Floating glass info panel */}
          <div className="absolute inset-x-4 bottom-4">
            <div className="rounded-[24px] bg-white/12 p-5 ring-1 ring-white/20 backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[32px] font-extrabold leading-none tracking-tight text-white">
                    {profile.name}
                    <span className="ml-2 align-baseline text-2xl font-medium text-white/85">
                      {profile.age}
                    </span>
                  </h2>
                  <div className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-white/85">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span>{profile.distance}</span>
                  </div>
                </div>
                {isTop && (
                  <button
                    type="button"
                    aria-label="Ver mais"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-xl transition active:scale-90"
                  >
                    <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile.interests.map((i, idx) => (
                  <span
                    key={i}
                    className={
                      idx === 0
                        ? "rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground"
                        : "rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur-sm"
                    }
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
