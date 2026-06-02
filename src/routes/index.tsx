import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Heart, MapPin, MessageCircle, Sparkles, ShieldCheck, Brain, Flame, Globe2, Instagram, Facebook, Music2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hunie — Encontros reais em Moçambique" },
      { name: "description", content: "O primeiro app de encontros feito para Moçambique. Conhece pessoas reais perto de ti em Maputo, Beira, Nampula e por todo o país." },
      { name: "keywords", content: "dating app moçambique, encontros maputo, conhecer pessoas moçambique, app namoro moçambique, hunie" },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "Hunie" },
      { name: "theme-color", content: "#FF4FA3" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Hunie" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hunie.app" },
      { property: "og:title", content: "Hunie — Encontros reais em Moçambique" },
      { property: "og:description", content: "Conhece pessoas reais perto de ti. O app de encontros feito para quem vive e sente Moçambique." },
      { property: "og:image", content: "https://hunie.app/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: "pt_MZ" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hunie — Encontros reais em Moçambique" },
      { name: "twitter:description", content: "Conhece pessoas reais perto de ti." },
      { name: "twitter:image", content: "https://hunie.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://hunie.app" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          name: "Hunie",
          description: "O primeiro app de encontros feito para Moçambique",
          applicationCategory: "SocialNetworkingApplication",
          operatingSystem: "PWA",
          url: "https://hunie.app",
          offers: { "@type": "Offer", price: "0", priceCurrency: "MZN" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
        }),
      },
    ],
  }),
  component: LandingGate,
});

function LandingGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const session = data.session;
      if (!session) {
        setReady(true);
        return;
      }
      // Authenticated: figure out destination
      (async () => {
        if (!session.user.email_confirmed_at) {
          navigate({ to: "/auth/verify-email", replace: true });
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, onboarding_step")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!profile?.onboarding_completed) {
          navigate({ to: "/onboarding", search: { step: profile?.onboarding_step ?? 1 }, replace: true });
          return;
        }
        navigate({ to: "/discover", replace: true });
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <h1 className="text-gradient-sunset text-5xl font-bold tracking-tight">Hunie</h1>
      </div>
    );
  }
  return <Landing />;
}

/* ----------------------- helpers ----------------------- */

function useInView<T extends HTMLElement>(opts?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, ...opts },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 600ms ease ${delay}ms, transform 600ms ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function CountUp({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1000;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("pt-PT")}
      {suffix}
    </span>
  );
}

function Typewriter({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    const word = words[idx];
    if (!del && sub === word) {
      const t = setTimeout(() => setDel(true), 1800);
      return () => clearTimeout(t);
    }
    if (del && sub === "") {
      setDel(false);
      setIdx((i) => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(
      () => setSub((s) => (del ? s.slice(0, -1) : word.slice(0, s.length + 1))),
      del ? 40 : 75,
    );
    return () => clearTimeout(t);
  }, [sub, del, idx, words]);

  return (
    <span className="italic">
      {sub}
      <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-current align-middle" style={{ height: "1em" }} />
    </span>
  );
}

/* ----------------------- landing ----------------------- */

function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Cities />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ----------------------- navbar ----------------------- */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border/60 bg-background/80 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8" aria-label="Navegação principal">
        <Link to="/" className="flex items-center gap-2" aria-label="Hunie — início">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-sunset shadow-glow">
            <Heart className="h-5 w-5 fill-white text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight">Hunie</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <a href="#como-funciona" className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground">
            Como funciona
          </a>
          <Link to="/auth/login" className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition hover:text-primary">
            Entrar
          </Link>
          <Button asChild className="h-10 rounded-full bg-gradient-sunset px-5 text-sm font-semibold text-white shadow-glow">
            <Link to="/auth/register">Criar conta</Link>
          </Button>
        </div>

        <button
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setOpen(false)} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-border/60 bg-background p-6"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">Hunie</span>
              <button aria-label="Fechar menu" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-border/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-10 flex flex-col gap-1">
              <a href="#como-funciona" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-4 text-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                Como funciona
              </a>
              <Link to="/auth/login" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-4 text-lg hover:bg-secondary">
                Entrar
              </Link>
              <Button asChild className="mt-4 h-14 rounded-2xl bg-gradient-sunset text-base font-semibold text-white shadow-glow">
                <Link to="/auth/register" onClick={() => setOpen(false)}>
                  Criar conta
                </Link>
              </Button>
            </div>
          </motion.aside>
        </div>
      )}
    </header>
  );
}

/* ----------------------- hero ----------------------- */

function Hero() {
  return (
    <section className="relative -mt-[72px] flex min-h-[100svh] items-center overflow-hidden px-5 pt-[72px] lg:px-8" aria-label="Apresentação">
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-90" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--brand-pink)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-10 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div className="relative mx-auto w-full max-w-5xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-[clamp(2.75rem,8vw,5.75rem)] font-extrabold leading-[1.02] tracking-tight"
        >
          Encontra alguém
          <br />
          que <span className="text-gradient-sunset">vale a pena</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mt-5 text-xl text-muted-foreground sm:text-2xl"
          aria-live="polite"
        >
          <Typewriter words={["em Maputo.", "em Beira.", "em Nampula.", "perto de ti.", "agora."]} />
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          O primeiro app de encontros feito para quem vive e sente Moçambique.
          <br className="hidden sm:inline" /> Pessoas reais. Histórias verdadeiras. Ligações que ficam.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button asChild className="h-14 w-full rounded-2xl bg-gradient-sunset px-8 text-base font-semibold text-white shadow-glow sm:w-auto">
            <Link to="/auth/register" aria-label="Criar conta grátis">
              Criar conta grátis
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-14 w-full rounded-2xl border-border/60 bg-white/5 px-8 text-base font-semibold backdrop-blur-md hover:bg-white/10 sm:w-auto"
          >
            <Link to="/auth/login" aria-label="Já tenho conta — entrar">
              Já tenho conta
            </Link>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.32 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          <span>✓ Grátis</span>
          <span>✓ Sem cartão</span>
          <span>✓ Feito para Moçambique</span>
        </motion.p>
      </div>
    </section>
  );
}

/* ----------------------- social proof ----------------------- */

function SocialProof() {
  const stats: { value: number; suffix?: string; prefix?: string; label: string }[] = [
    { value: 12000, prefix: "+", label: "utilizadores" },
    { value: 98, suffix: "%", label: "satisfação" },
    { value: 5, label: "cidades disponíveis" },
  ];
  return (
    <section className="border-y border-border/60 bg-secondary/40 py-10" aria-label="Provas sociais">
      <div className="mx-auto grid max-w-5xl grid-cols-3 items-center gap-4 px-5 text-center lg:px-8">
        {stats.map((s, i) => (
          <div key={s.label} className={i < stats.length - 1 ? "border-r border-border/60" : ""}>
            <div className="font-display text-2xl font-bold sm:text-4xl">
              <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------- how it works ----------------------- */

function HowItWorks() {
  const steps = [
    { icon: Sparkles, title: "Cria o teu perfil", desc: "Adiciona as tuas fotos e conta um pouco sobre ti. Leva menos de 2 minutos." },
    { icon: MapPin, title: "Descobre pessoas", desc: "Vê perfis de pessoas reais perto de ti e dá like em quem te interessa." },
    { icon: MessageCircle, title: "Começa a conversar", desc: "Quando há match os dois podem conversar. Sem regras — só conexão real." },
  ];
  return (
    <section id="como-funciona" className="px-5 py-24 lg:px-8" aria-label="Como funciona">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Como funciona</h2>
          <p className="mt-3 text-lg text-muted-foreground">Três passos para começares</p>
        </Reveal>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div aria-hidden className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-px md:block" style={{ background: "linear-gradient(90deg, transparent, var(--brand-pink), var(--brand-purple), transparent)" }} />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 150}>
              <article className="relative h-full rounded-3xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm">
                <div className="absolute -top-5 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full bg-gradient-sunset text-sm font-bold text-white shadow-glow">
                  {i + 1}
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- features ----------------------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[520px] w-[260px]">
      <div className="absolute inset-0 rounded-[3rem] border border-border/70 bg-card shadow-card" />
      <div className="absolute inset-[6px] overflow-hidden rounded-[2.65rem] bg-background">
        <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />
        <div className="h-full w-full p-3 pt-9">{children}</div>
      </div>
      <div aria-hidden className="absolute -inset-10 -z-10 rounded-[4rem] bg-gradient-sunset opacity-20 blur-3xl" />
    </div>
  );
}

function FeatureVerified() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-secondary/40 p-4">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-sunset text-3xl font-bold text-white">A</div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-base font-semibold">
            Ana, 24 <ShieldCheck className="h-4 w-4 text-[color:var(--super-like)]" />
          </div>
          <div className="text-xs text-muted-foreground">Perfil verificado</div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function FeatureMatch() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-sunset p-6 text-white">
        <Heart className="h-12 w-12 fill-white" />
        <div className="font-display text-2xl font-bold">É um match!</div>
        <div className="flex -space-x-3">
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-[color:var(--brand-purple)] font-bold">T</div>
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-[color:var(--brand-pink)] font-bold">N</div>
        </div>
        <div className="text-xs opacity-80">Compatibilidade 92%</div>
      </div>
    </PhoneFrame>
  );
}

function FeatureChat() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col gap-2 rounded-2xl bg-secondary/40 p-3 text-xs">
        <div className="self-end max-w-[80%] rounded-2xl rounded-br-md bg-gradient-sunset px-3 py-2 text-white">Olá! Vi que também gostas de jazz 🎷</div>
        <div className="self-start max-w-[80%] rounded-2xl rounded-bl-md bg-card px-3 py-2">Sim! Tens algum sítio favorito em Maputo?</div>
        <div className="self-end max-w-[80%] rounded-2xl rounded-br-md bg-gradient-sunset px-3 py-2 text-white">Conheço um perfeito. Sexta?</div>
        <div className="self-start max-w-[80%] rounded-2xl rounded-bl-md bg-card px-3 py-2">Combinado ✨</div>
      </div>
    </PhoneFrame>
  );
}

function FeatureMap() {
  const dots = [
    { x: 55, y: 22 }, { x: 60, y: 38 }, { x: 50, y: 55 }, { x: 58, y: 72 }, { x: 48, y: 85 }, { x: 52, y: 92 },
  ];
  return (
    <PhoneFrame>
      <div className="relative h-full rounded-2xl bg-secondary/40 p-4">
        <svg viewBox="0 0 100 110" className="h-full w-full" aria-hidden>
          <path
            d="M48 6 C58 8, 64 16, 62 26 C70 32, 68 44, 60 50 C66 58, 60 70, 52 72 C58 82, 50 96, 44 100 C46 90, 38 84, 42 72 C36 62, 42 52, 38 44 C34 34, 40 24, 42 16 Z"
            fill="oklch(0.20 0.02 320)"
            stroke="oklch(0.69 0.24 1 / 0.6)"
            strokeWidth="0.6"
          />
          {dots.map((d, i) => (
            <g key={i}>
              <circle cx={d.x} cy={d.y} r="3" fill="url(#g)">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
              </circle>
              <circle cx={d.x} cy={d.y} r="6" fill="none" stroke="oklch(0.69 0.24 1 / 0.6)" strokeWidth="0.5">
                <animate attributeName="r" values="3;8;3" dur="2.4s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
              </circle>
            </g>
          ))}
          <defs>
            <radialGradient id="g">
              <stop offset="0%" stopColor="#FF4FA3" />
              <stop offset="100%" stopColor="#B13CFF" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </PhoneFrame>
  );
}

function Features() {
  const items = [
    { icon: ShieldCheck, title: "Perfis verificados", desc: "Só pessoas reais. Verificamos cada perfil para garantires que não estás a falar com bots.", Visual: FeatureVerified },
    { icon: Brain, title: "Match inteligente", desc: "O nosso algoritmo aprende o que gostas e mostra-te pessoas cada vez mais compatíveis.", Visual: FeatureMatch },
    { icon: Flame, title: "Chat premium", desc: "Conversa flui como deve ser — rápido, bonito, e sem anúncios a interromper.", Visual: FeatureChat },
    { icon: Globe2, title: "100% Moçambique", desc: "Feito em Moçambique, para Moçambique. Percebemos a nossa cultura e o que o amor aqui significa.", Visual: FeatureMap },
  ];
  return (
    <section className="px-5 py-24 lg:px-8" aria-label="Funcionalidades">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Feito para ti</h2>
        </Reveal>
        <div className="mt-20 space-y-24">
          {items.map((f, i) => {
            const reverse = i % 2 === 1;
            return (
              <Reveal key={f.title}>
                <article className={`grid items-center gap-12 md:grid-cols-2 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
                  <div>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-display text-3xl font-bold sm:text-4xl">{f.title}</h3>
                    <p className="mt-3 text-lg text-muted-foreground">{f.desc}</p>
                  </div>
                  <div>
                    <f.Visual />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- testimonials ----------------------- */

function Testimonials() {
  const items = [
    { quote: "Nunca pensei que ia conhecer alguém assim aqui em Maputo. Estamos juntos há 4 meses.", name: "Ana M.", age: 24, city: "Maputo", initials: "AM" },
    { quote: "A interface é muito melhor que qualquer app que já usei. Parece mesmo um app de outro nível.", name: "Carlos T.", age: 27, city: "Beira", initials: "CT" },
    { quote: "Adorei que é focado em Moçambique. Sinto que as pessoas aqui são mais reais do que noutros apps.", name: "Fátima N.", age: 22, city: "Nampula", initials: "FN" },
  ];
  return (
    <section className="px-5 py-24 lg:px-8" aria-label="Testemunhos">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">O que dizem os nossos utilizadores</h2>
        </Reveal>
        <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:snap-none md:grid-cols-3 md:overflow-visible">
          {items.map((t, i) => (
            <Reveal key={t.name} delay={i * 100} className="min-w-[85%] snap-start md:min-w-0">
              <figure className="flex h-full flex-col rounded-3xl border border-border/60 bg-card/60 p-7 backdrop-blur-sm">
                <div className="flex gap-0.5 text-[color:var(--brand-pink)]" aria-label="5 estrelas">
                  {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="mt-4 flex-1 text-base leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-sunset font-bold text-white">{t.initials}</div>
                  <div className="text-sm">
                    <div className="font-semibold">{t.name}, {t.age} anos</div>
                    <div className="text-muted-foreground">{t.city}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- cities ----------------------- */

function Cities() {
  const cities = [
    { name: "Maputo", active: 5240 },
    { name: "Beira", active: 2180 },
    { name: "Nampula", active: 1690 },
    { name: "Quelimane", active: 980 },
    { name: "Tete", active: 760 },
    { name: "Inhambane", active: 540 },
  ];
  return (
    <section className="px-5 py-24 lg:px-8" aria-label="Cidades disponíveis">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Já estamos em todo o país</h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {cities.map((c, i) => (
            <Reveal key={c.name} delay={i * 60}>
              <div className="group cursor-default rounded-3xl border border-border/60 bg-card/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-xl font-semibold">{c.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.active.toLocaleString("pt-PT")} pessoas ativas</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 text-center text-sm text-muted-foreground">
          A expandir para mais cidades em breve
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------- final cta ----------------------- */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-5 py-28 lg:px-8" aria-label="Começa hoje">
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-grape)", opacity: 0.18 }} />
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-70" />
      <Reveal className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-4xl font-bold sm:text-6xl">
          Começa hoje — <span className="text-gradient-sunset">é grátis</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Mais de 12.000 pessoas já encontraram a sua conexão. A tua está à espera.
        </p>
        <Button asChild className="mt-9 h-16 rounded-2xl bg-gradient-sunset px-10 text-lg font-semibold text-white shadow-glow">
          <Link to="/auth/register" aria-label="Criar conta grátis">Criar conta grátis</Link>
        </Button>
        <p className="mt-5 text-sm text-muted-foreground">Sem cartão de crédito. Sem truques. Só conexões reais.</p>
      </Reveal>
    </section>
  );
}

/* ----------------------- footer ----------------------- */

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/30 px-5 py-16 lg:px-8" aria-label="Rodapé">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-sunset">
              <Heart className="h-5 w-5 fill-white text-white" />
            </span>
            <span className="text-xl font-bold">Hunie</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">Encontros reais em Moçambique</p>
          <div className="mt-4 flex gap-3">
            <a href="#" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-border/60 transition hover:border-primary hover:text-primary">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" aria-label="TikTok" className="grid h-10 w-10 place-items-center rounded-full border border-border/60 transition hover:border-primary hover:text-primary">
              <Music2 className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-border/60 transition hover:border-primary hover:text-primary">
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>

        <FooterCol title="App" links={[
          { label: "Como funciona", href: "#como-funciona" },
          { label: "Criar conta", to: "/auth/register" },
          { label: "Entrar", to: "/auth/login" },
          { label: "Download PWA", href: "#" },
        ]} />
        <FooterCol title="Empresa" links={[
          { label: "Sobre nós", href: "#" },
          { label: "Blog", href: "#" },
          { label: "Carreiras", href: "#" },
          { label: "Imprensa", href: "#" },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Termos de uso", href: "#" },
          { label: "Política de privacidade", href: "#" },
          { label: "Política de cookies", href: "#" },
          { label: "Contacto", href: "#" },
        ]} />
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
        <p>© 2025 Hunie. Feito com ❤️ em Moçambique</p>
        <select aria-label="Selector de idioma" className="rounded-full border border-border/60 bg-transparent px-3 py-1 text-xs">
          <option>PT</option>
        </select>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href?: string; to?: string }[] }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to} className="transition hover:text-primary">{l.label}</Link>
            ) : (
              <a href={l.href} className="transition hover:text-primary">{l.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
