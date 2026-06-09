import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, Sparkles, Compass, Lock, Send } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell, TopBar } from "@/components/AppShell";
import { useLikedMe } from "@/hooks/useLikedMe";
import { useSubscription } from "@/hooks/useSubscription";
import hunieMark from "@/assets/hunie-mark.png.asset.json";


import { requireAuthAndOnboarding } from "@/lib/authGuard";

export const Route = createFileRoute("/matches")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: "Likes — Hunie" },
      { name: "description", content: "Vê quem deu like em ti." },
    ],
  }),
  component: LikesPage,
});

function LikesPage() {
  const { likers, loading } = useLikedMe();
  const { entitlements } = useSubscription();
  const isPremium = entitlements.canSeeWhoLiked;
  const navigate = useNavigate();
  const isEmpty = !loading && likers.length === 0;

  return (
    <AppShell>
      <TopBar title="Likes" />

      <section className="px-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-flame" fill="currentColor" />
          <span>
            <span className="font-semibold text-foreground">{likers.length}</span> pessoas curtiram-te
          </span>
        </div>

        {loading && likers.length === 0 ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">A carregar...</div>
        ) : isEmpty ? (
          <EmptyLikes
            onDiscover={() => navigate({ to: "/discover" })}
            onBoost={() => navigate({ to: "/shop" })}
          />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {likers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => !isPremium && navigate({ to: "/membership" })}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-card text-left"
              >
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className={`h-full w-full object-cover transition ${
                      isPremium ? "" : "blur-xl scale-110 brightness-75"
                    }`}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-flame opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {!isPremium && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/20">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                {p.firstImpression && isPremium && (
                  <div className="absolute left-2 right-2 top-2 flex items-start gap-1.5 rounded-xl border border-white/15 bg-black/55 px-2.5 py-1.5 backdrop-blur-md">
                    <Send className="mt-0.5 h-3 w-3 shrink-0 text-[#4FA8FF]" strokeWidth={2.6} />
                    <p className="line-clamp-2 text-[11px] leading-snug text-white/95">
                      “{p.firstImpression}”
                    </p>
                  </div>
                )}
                {p.firstImpression && !isPremium && (
                  <div className="absolute left-2 right-2 top-2 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#4FA8FF]/85 px-2.5 py-1 shadow-lg backdrop-blur-md">
                    <Send className="h-3 w-3 shrink-0 text-white" strokeWidth={2.8} />
                    <span className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-white">
                      Mensagem · desbloquear
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {isPremium ? `${p.name}${p.age ? `, ${p.age}` : ""}` : p.age ? `${p.age} anos` : "Nova pessoa"}
                    </p>
                    <p className="truncate text-xs text-white/80">
                      {isPremium ? p.city : "Toca para revelar"}
                    </p>
                  </div>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-flame text-flame-foreground shadow-lg">
                    <Heart className="h-4 w-4" fill="currentColor" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function EmptyLikes({ onDiscover, onBoost }: { onDiscover: () => void; onBoost: () => void }) {
  return (
    <div className="relative mt-6 flex flex-col items-center overflow-hidden px-2 pb-10 pt-4 text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[110px] h-[360px] w-[360px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--brand-pink) 30%, transparent) 0%, transparent 70%)",
          filter: "blur(28px)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Stacked blurred "mystery" cards */}
      <div className="relative grid h-[230px] w-[240px] place-items-center">
        {[
          { rot: -10, x: -54, delay: 0.05, scale: 0.88, gradient: "linear-gradient(135deg, #4a2a55, #2a1a3d)" },
          { rot: 10, x: 54, delay: 0.12, scale: 0.88, gradient: "linear-gradient(135deg, #3a1a4a, #1a1530)" },
          { rot: 0, x: 0, delay: 0.18, scale: 1, gradient: "linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)" },
        ].map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 18, rotate: 0, scale: 0.9, x: 0 }}
            animate={{ opacity: 1, y: 0, rotate: c.rot, scale: c.scale, x: c.x }}
            transition={{ duration: 0.6, delay: c.delay, ease: [0.22, 1, 0.36, 1] }}
            className="absolute h-[210px] w-[148px] overflow-hidden rounded-[22px] border border-white/10 shadow-2xl"
            style={{
              background: c.gradient,
              boxShadow: "0 24px 50px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% 30%, rgba(255,255,255,0.18), transparent 60%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45) 100%)",
                backdropFilter: "blur(8px)",
              }}
            />
            {i === 2 && (
              <div className="absolute inset-0 grid place-items-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="grid h-14 w-14 place-items-center rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    backdropFilter: "blur(14px)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 10px 24px -8px rgba(0,0,0,0.5)",
                  }}
                >
                  <Lock className="h-6 w-6 text-white" strokeWidth={2.4} />
                </motion.div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Floating hearts */}
        {[
          { x: -90, delay: 0.6, size: 14 },
          { x: 88, delay: 1.0, size: 12 },
          { x: -30, delay: 1.6, size: 10 },
          { x: 40, delay: 2.1, size: 16 },
        ].map((h, i) => (
          <motion.div
            key={`h-${i}`}
            className="pointer-events-none absolute bottom-4"
            style={{ left: `calc(50% + ${h.x}px)` }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -130, opacity: [0, 1, 0], scale: [0.6, 1, 0.8] }}
            transition={{ duration: 3.4, delay: h.delay, repeat: Infinity, ease: "easeOut" }}
          >
            <Heart
              className="text-flame"
              fill="currentColor"
              style={{ width: h.size, height: h.size, filter: "drop-shadow(0 4px 10px rgba(255,79,163,0.6))" }}
            />
          </motion.div>
        ))}
      </div>

      <motion.img
        src={hunieMark.url}
        alt=""
        aria-hidden
        className="relative mt-2 h-8 w-8 opacity-80"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.h2
        className="relative mt-3 text-[24px] tracking-tight"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          backgroundImage: "linear-gradient(135deg, #FF4FA3 0%, #E935A0 50%, #B13CFF 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Ainda sem likes
      </motion.h2>

      <motion.p
        className="relative mt-2 max-w-[280px] text-[14px] leading-relaxed text-white/55"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.32 }}
      >
        Quando alguém der like, aparece aqui. Continua a explorar — a tua pessoa pode estar perto.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.42 }}
        className="relative mt-7 flex w-full max-w-[320px] flex-col gap-2.5"
      >
        <button
          type="button"
          onClick={onDiscover}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white transition-transform active:scale-[0.98]"
          style={{
            backgroundImage: "linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)",
            boxShadow:
              "0 14px 32px -12px color-mix(in oklab, var(--brand-pink) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          <Compass className="h-[16px] w-[16px]" strokeWidth={2.4} />
          Descobrir pessoas
        </button>

        <button
          type="button"
          onClick={onBoost}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium text-white/85 transition-transform active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(14px)",
          }}
        >
          <Sparkles className="h-[14px] w-[14px] text-flame" />
          Ativa Boost para 10× mais visibilidade
        </button>
      </motion.div>
    </div>
  );
}
