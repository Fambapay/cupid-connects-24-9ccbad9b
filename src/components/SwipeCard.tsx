import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { MapPin, Info } from "lucide-react";
import type { Profile } from "@/data/profiles";

type Props = {
  profile: Profile;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
  offset: number;
};

export function SwipeCard({ profile, onSwipe, isTop, offset }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  const handleEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) onSwipe("right");
    else if (info.offset.x < -120) onSwipe("left");
  };

  // Fake multi-photo indicator (3 segments)
  const photoCount = 3;
  const activePhoto = 0;

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
      dragElastic={0.7}
      onDragEnd={handleEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* Full-bleed photo card — Tinder style */}
      <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-secondary shadow-card">
        <img
          src={profile.photo}
          alt={profile.name}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Photo segments indicator */}
        {isTop && (
          <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
            {Array.from({ length: photoCount }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className={`h-full rounded-full bg-white transition-all ${
                    i === activePhoto ? "w-full" : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Bottom gradient veil for legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* LIKE / NOPE stamps */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="pointer-events-none absolute left-5 top-16 -rotate-[14deg] rounded-xl border-[3px] border-mint px-3 py-1 text-[28px] font-black uppercase tracking-wider text-mint"
            >
              Like
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="pointer-events-none absolute right-5 top-16 rotate-[14deg] rounded-xl border-[3px] border-rose px-3 py-1 text-[28px] font-black uppercase tracking-wider text-rose"
            >
              Nope
            </motion.div>
          </>
        )}

        {/* Bottom info block — clean, Tinder-like */}
        <div className="absolute inset-x-0 bottom-0 p-6 pb-7">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[34px] font-bold leading-none tracking-tight text-white drop-shadow-sm">
                {profile.name.split(' ')[0]}
                <span className="ml-2 align-baseline text-[28px] font-light text-white/95">
                  {profile.age}
                </span>
              </h2>
              <div className="mt-2.5 flex items-center gap-1.5 text-[14px] font-medium text-white/90">
                <MapPin className="h-4 w-4" strokeWidth={2.5} />
                <span>{profile.distance}</span>
              </div>
              <p className="mt-2 line-clamp-2 max-w-[88%] text-[13.5px] leading-snug text-white/85">
                {profile.bio}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.interests.slice(0, 3).map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-white/25 px-3 py-1 text-[11.5px] font-semibold text-white ring-1 ring-white/25"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
            {isTop && (
              <button
                type="button"
                aria-label="Mais info"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/25 text-white ring-1 ring-white/30 transition active:scale-90"
              >
                <Info className="h-5 w-5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
