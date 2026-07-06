import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, Sparkles, Compass, Lock, Send } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AppShell, TopBar } from "@/components/AppShell";
import { useLikedMe } from "@/hooks/useLikedMe";
import { useSubscription } from "@/hooks/useSubscription";
import { useOfferEngine } from "@/hooks/useOfferEngine";
import { OfferSheet } from "@/components/offers/OfferSheet";


import hunieMarkTransparent from "@/assets/hunie-mark-transparent.png.asset.json";


import { requireAuthAndOnboarding } from "@/lib/authGuard";

export const Route = createFileRoute("/matches")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: "Likes — Hunie" },
      { name: "description", content: "Vê quem já te deu like na Hunie. Desbloqueia com membership e começa conversas com quem realmente está interessado em ti." },
      { property: "og:title", content: "Likes — Hunie" },
      { property: "og:description", content: "Vê quem já te deu like na Hunie. Desbloqueia com membership e começa conversas com quem realmente está interessado em ti." },
      { property: "og:url", content: "https://hunie.app/matches" },
    ],
    links: [{ rel: "canonical", href: "https://hunie.app/matches" }],
  }),
  component: LikesPage,
});

function LikesPage() {
  const { likers, loading, error, reload } = useLikedMe();
  const { entitlements, isTrialing } = useSubscription();
  // Trial users get premium features globally, but "ver quem te deu like" is
  // reserved for paying subscribers to preserve conversion incentive.
  const isPremium = entitlements.canSeeWhoLiked && !isTrialing;
  const navigate = useNavigate();
  const isEmpty = !loading && !error && likers.length === 0;
  const offerEngine = useOfferEngine();

  const handleBlurredTap = () => {
    // Dispara oferta contextual; se não houver oferta elegível, cai no /membership.
    offerEngine.triggerLikesTeaser();
    // Pequeno atraso para dar prioridade à sheet quando aparece.
    setTimeout(() => {
      if (!offerEngine.activeOffer) navigate({ to: "/membership" });
    }, 120);
  };


  return (
    <AppShell className="bg-[var(--profile-bg)]">
      <TopBar title="Likes" />

      <section className="px-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-flame" fill="currentColor" />
          <span>
            <span className="font-semibold text-foreground">{likers.length}</span> pessoas curtiram-te
          </span>
        </div>

        {error ? (
          <div role="alert" className="mt-10 flex flex-col items-center gap-3 text-center text-sm">
            <p className="text-muted-foreground">Não foi possível carregar os teus likes.</p>
            <button
              type="button"
              onClick={() => reload()}
              className="rounded-full bg-white/10 px-4 py-2 text-foreground active:scale-95"
            >
              Tentar de novo
            </button>
          </div>
        ) : loading && likers.length === 0 ? (
          <LikesLoadingPreview />
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
                onClick={() => !isPremium && handleBlurredTap()}
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
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-black/40 ring-1 ring-white/20">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                {p.firstImpression && isPremium && (
                  <div className="absolute left-2 right-2 top-2 flex items-start gap-1.5 rounded-xl border border-white/15 bg-black/55 px-2.5 py-1.5">
                    <Send className="mt-0.5 h-3 w-3 shrink-0 text-[#4FA8FF]" strokeWidth={2.6} />
                    <p className="line-clamp-2 text-[11px] leading-snug text-white/95">
                      “{p.firstImpression}”
                    </p>
                  </div>
                )}
                {p.firstImpression && !isPremium && (
                  <div className="absolute left-2 right-2 top-2 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#4FA8FF]/85 px-2.5 py-1 shadow-lg">
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

      <OfferSheet
        offer={offerEngine.activeOffer}
        onDismiss={offerEngine.dismissOffer}
        onClaim={offerEngine.claimOffer}
        onSuccess={() => {
          offerEngine.closeAfterClaim();
          reload();
        }}
      />
    </AppShell>
  );
}

function LikesLoadingPreview() {
  return (
    <div className="relative mt-6 flex flex-col items-center overflow-hidden px-2 pb-10 pt-4 text-center">
      <div className="relative grid h-[230px] w-[240px] place-items-center">
        {[
          { rot: -10, x: -54, scale: 0.88 },
          { rot: 10, x: 54, scale: 0.88 },
          { rot: 0, x: 0, scale: 1 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute h-[210px] w-[148px] rounded-[22px] border border-border bg-card/70"
            style={{
              transform: `translateX(${c.x}px) rotate(${c.rot}deg) scale(${c.scale})`,
              boxShadow: "0 24px 50px -24px rgba(0,0,0,0.45)",
            }}
          />
        ))}
      </div>
      <div className="mt-2 h-8 w-8 rounded-full bg-card/80" />
      <div className="mt-4 h-7 w-44 rounded-full bg-card/80" />
      <div className="mt-4 h-4 w-[280px] max-w-full rounded-full bg-card/60" />
      <div className="mt-2 h-4 w-[220px] max-w-full rounded-full bg-card/50" />
      <div className="mt-7 flex w-full max-w-[320px] flex-col gap-2.5">
        <div className="h-12 rounded-full bg-card/80" />
        <div className="h-11 rounded-full border border-border bg-card/40" />
      </div>
    </div>
  );
}


function EmptyLikes({ onDiscover, onBoost }: { onDiscover: () => void; onBoost: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mt-6 flex flex-col items-center overflow-hidden px-2 pb-10 pt-4 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[110px] h-[360px] w-[360px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--brand-pink) 30%, transparent) 0%, transparent 70%)",
          filter: "blur(22px)",
        }}
      />

      {/* Stacked blurred "mystery" cards */}
      <div className="relative grid h-[230px] w-[240px] place-items-center">
        {[
          { rot: -10, x: -54, delay: 0.05, scale: 0.88, gradient: "linear-gradient(135deg, #4a2a55, #2a1a3d)" },
          { rot: 10, x: 54, delay: 0.12, scale: 0.88, gradient: "linear-gradient(135deg, #3a1a4a, #1a1530)" },
          { rot: 0, x: 0, delay: 0.18, scale: 1, gradient: "linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)" },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute h-[210px] w-[148px] overflow-hidden rounded-[22px] border border-white/10 shadow-2xl"
            style={{
              background: c.gradient,
              transform: `translateX(${c.x}px) rotate(${c.rot}deg) scale(${c.scale})`,
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
                <div
                  className="grid h-14 w-14 place-items-center rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    backdropFilter: "blur(14px)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 10px 24px -8px rgba(0,0,0,0.5)",
                  }}
                >
                  <Lock className="h-6 w-6 text-white" strokeWidth={2.4} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Floating hearts */}
        {!reduceMotion &&
          [
            { x: -88, delay: 0.4, size: 14 },
            { x: 72, delay: 1.4, size: 16 },
          ].map((h, i) => (
            <motion.div
              key={`h-${i}`}
              className="pointer-events-none absolute bottom-4"
              style={{ left: `calc(50% + ${h.x}px)`, willChange: "transform, opacity" }}
              initial={false}
              animate={{ y: -128, opacity: [0, 1, 0], scale: [0.75, 1, 0.85] }}
              transition={{ duration: 3.8, delay: h.delay, repeat: Infinity, ease: "easeOut" }}
            >
              <Heart className="text-flame" fill="currentColor" style={{ width: h.size, height: h.size }} />
            </motion.div>
          ))}
      </div>

      <motion.img
        src={hunieMarkTransparent.url}
        alt=""
        aria-hidden
        className="relative mt-2 h-8 w-8 opacity-80"
        initial={false}
        animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <h2
        className="relative mt-3 text-[24px] tracking-tight"
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
      </h2>

      <p
        className="relative mt-2 max-w-[280px] text-[14px] leading-relaxed text-muted-foreground"
      >
        Quando alguém der like, aparece aqui. Continua a explorar — a tua pessoa pode estar perto.
      </p>

      <div className="relative mt-7 flex w-full max-w-[320px] flex-col gap-2.5">
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
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-5 py-3 text-[13px] font-medium text-foreground/80 backdrop-blur-md transition-transform active:scale-[0.98]"
        >
          <Sparkles className="h-[14px] w-[14px] text-flame" />
          Ativa Boost para 10× mais visibilidade
        </button>
      </div>
    </div>
  );
}
