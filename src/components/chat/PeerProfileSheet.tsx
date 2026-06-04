import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, MapPin, Quote, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signPhotos } from "@/lib/photos";

interface PeerProfile {
  name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  interests: string[];
  isVerified: boolean;
  isPremium: boolean;
  isElite: boolean;
  photos: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  fallbackName: string;
  fallbackPhoto?: string;
}

export function PeerProfileSheet({ open, onClose, userId, fallbackName, fallbackPhoto }: Props) {
  const [profile, setProfile] = useState<PeerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    setLoading(true);
    setIdx(0);
    (async () => {
      const [{ data: prof }, { data: photoRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("name,age,city,bio,interests,is_verified,membership_tier,membership_status")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("profile_photos")
          .select("storage_path")
          .eq("profile_id", userId)
          .order("position", { ascending: true }),
      ]);

      const paths = (photoRows ?? []).map((p) => p.storage_path as string).filter(Boolean);
      const urls = await signPhotos(paths, 3600, { width: 900, height: 1200, resize: "cover", quality: 75 });

      if (!alive) return;
      const isActivePremium = prof?.membership_status === "active" && prof?.membership_tier !== "free";
      setProfile({
        name: (prof?.name as string) ?? fallbackName,
        age: (prof?.age as number | null) ?? null,
        city: (prof?.city as string | null) ?? null,
        bio: (prof?.bio as string | null) ?? null,
        interests: ((prof?.interests as string[] | null) ?? []) as string[],
        isVerified: Boolean(prof?.is_verified),
        isPremium: isActivePremium,
        isElite: isActivePremium && prof?.membership_tier === "elite",
        photos: urls.filter(Boolean),
      });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, userId, fallbackName]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const photos = profile?.photos.length ? profile.photos : fallbackPhoto ? [fallbackPhoto] : [];
  const current = photos[idx];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-background"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320 }}
        >
          <div className="relative h-full w-full overflow-y-auto overscroll-contain pb-12">
            {/* Photo viewer */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
              {current ? (
                <motion.img
                  key={current}
                  src={current}
                  alt={profile?.name ?? fallbackName}
                  className="h-full w-full object-cover"
                  initial={{ opacity: 0.6, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-flame" />
              )}

              {/* Top scrim + close */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
                style={{ top: "max(env(safe-area-inset-top), 12px)" }}
              >
                <ChevronDown className="h-5 w-5" />
              </button>

              {/* Progress segments */}
              {photos.length > 1 && (
                <div
                  className="absolute inset-x-3 flex gap-1.5"
                  style={{ top: "max(env(safe-area-inset-top), 12px)" }}
                >
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-white transition-all duration-300"
                        style={{ width: i === idx ? "100%" : i < idx ? "100%" : "0%" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Tap zones to advance */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute inset-y-0 left-0 w-1/3"
                  />
                  <button
                    type="button"
                    aria-label="Próxima foto"
                    onClick={() => setIdx((i) => (i + 1) % photos.length)}
                    className="absolute inset-y-0 right-0 w-2/3"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-white/70">
                    <ChevronLeft className="h-6 w-6 opacity-0" />
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white/70">
                    <ChevronRight className="h-6 w-6 opacity-0" />
                  </div>
                </>
              )}

              {/* Name overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-5 pt-16">
                <div className="flex items-end gap-2 text-white">
                  <h2 className="text-3xl font-bold tracking-tight">
                    {profile?.name ?? fallbackName}
                  </h2>
                  {profile?.age ? (
                    <span className="text-2xl font-light leading-9">{profile.age}</span>
                  ) : null}
                  {profile?.isVerified && (
                    <BadgeCheck className="mb-1.5 h-5 w-5" fill="#5BB8FF" color="#fff" />
                  )}
                </div>
                {profile?.city && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-3 px-4 pt-4">
              {loading && !profile && (
                <div className="grid h-24 place-items-center text-muted-foreground">
                  A carregar…
                </div>
              )}

              {profile?.bio && (
                <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Quote className="h-4 w-4" />
                    Sobre mim
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-snug text-foreground">
                    {profile.bio}
                  </p>
                </section>
              )}

              {(profile?.city || profile?.age) && (
                <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Essenciais
                  </div>
                  <div className="space-y-2 text-[15px]">
                    {profile.city && (
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-flame" />
                        <span>{profile.city}</span>
                      </div>
                    )}
                    {profile.age && (
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-4 w-4 place-items-center text-flame">🎂</span>
                        <span>{profile.age} anos</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {profile && profile.interests.length > 0 && (
                <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold text-muted-foreground">
                    Interesses
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((it) => (
                      <span
                        key={it}
                        className="rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-sm text-foreground"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {profile && !profile.bio && profile.interests.length === 0 && !profile.city && (
                <div className="grid place-items-center px-6 py-10 text-center text-sm text-muted-foreground">
                  Esta pessoa ainda não preencheu o perfil.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
