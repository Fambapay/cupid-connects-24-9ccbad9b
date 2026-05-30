import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { MapPin, SlidersHorizontal, Sparkles, ArrowUp } from "lucide-react";
import type { Profile } from "@/data/profiles";

type Props = {
  profile: Profile;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
  offset: number;
};

export function SwipeCard({ profile, onSwipe, isTop, offset }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
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
        scale: 1 - offset * 0.04,
        y: offset * 12,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-card shadow-card">
        <img
          src={profile.photo}
          alt={profile.name}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 card-overlay" />

        {/* Top floating controls */}
        {isTop && (
          <>
            <button
              type="button"
              aria-label="Filtros"
              className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Boost"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-grape backdrop-blur-md"
            >
              <Sparkles className="h-5 w-5 fill-current" />
            </button>
          </>
        )}

        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute left-5 top-20 rotate-[-12deg] rounded-xl border-4 border-flame px-4 py-2 text-2xl font-extrabold uppercase tracking-wider text-flame"
            >
              Curti
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute right-5 top-20 rotate-[12deg] rounded-xl border-4 border-destructive px-4 py-2 text-2xl font-extrabold uppercase tracking-wider text-destructive"
            >
              Nope
            </motion.div>
          </>
        )}

        {/* Info button bottom-right */}
        {isTop && (
          <button
            type="button"
            aria-label="Ver mais"
            className="absolute bottom-44 right-4 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}

        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-bold leading-none">{profile.name}</h2>
            <span className="pb-0.5 text-3xl font-light opacity-95">{profile.age}</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm opacity-90">
            <MapPin className="h-4 w-4" />
            <span>{profile.distance}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.interests.map((i, idx) => (
              <span
                key={i}
                className={
                  idx === 0
                    ? "rounded-full bg-gradient-flame px-4 py-1.5 text-sm font-semibold text-flame-foreground shadow-rose"
                    : "rounded-full border border-white/60 bg-white/5 px-4 py-1.5 text-sm font-medium backdrop-blur-sm"
                }
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
