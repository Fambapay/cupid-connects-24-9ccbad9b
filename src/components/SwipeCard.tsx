import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { MapPin } from "lucide-react";
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

        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute left-5 top-8 rotate-[-12deg] rounded-xl border-4 border-flame px-4 py-2 text-2xl font-extrabold uppercase tracking-wider text-flame"
            >
              Curti
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute right-5 top-8 rotate-[12deg] rounded-xl border-4 border-destructive px-4 py-2 text-2xl font-extrabold uppercase tracking-wider text-destructive"
            >
              Nope
            </motion.div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold leading-tight">{profile.name}</h2>
            <span className="pb-1 text-2xl font-light opacity-90">{profile.age}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm opacity-80">
            <MapPin className="h-3.5 w-3.5" />
            <span>a {profile.distance}</span>
          </div>
          <p className="mt-3 text-sm leading-snug opacity-95 line-clamp-2">{profile.bio}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.interests.map((i) => (
              <span
                key={i}
                className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm"
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
