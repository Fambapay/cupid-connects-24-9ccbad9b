import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, Instagram, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/landing.css";
import { EditorialHero } from "@/components/landing/EditorialHero";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { FaqSection } from "@/components/landing/FaqSection";
import { CidadesSection } from "@/components/landing/CidadesSection";
import { InstallModal } from "@/components/landing/InstallModal";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hunie — Namoro em Moçambique. Comunidade verificada." },
      { name: "description", content: "Hunie é a comunidade de encontros feita em Moçambique. Perfis verificados em Maputo, Matola, Beira, Nampula e Chimoio. Preços em MZN, pagamento M-Pesa." },
      { name: "keywords", content: "namoro moçambique, dating maputo, encontros beira, solteiros matola, app namoro mz, hunie" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#07060a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Hunie" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hunie.app" },
      { property: "og:title", content: "Hunie — Namoro em Moçambique" },
      { property: "og:description", content: "Comunidade de encontros membership-only feita em MZ. Maputo, Matola, Beira, Nampula, Chimoio." },
      { property: "og:image", content: "https://hunie.app/og-image.jpg" },
      { property: "og:locale", content: "pt_MZ" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hunie — Namoro em Moçambique" },
      { name: "twitter:description", content: "Comunidade verificada. Conversas em PT. Preços em MZN." },
      { name: "twitter:image", content: "https://hunie.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://hunie.app" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "MobileApplication",
        name: "Hunie",
        description: "Dating membership-only feito em Moçambique",
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "PWA",
        url: "https://hunie.app",
        offers: { "@type": "Offer", price: "149", priceCurrency: "MZN" },
        aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
      }),
    }],
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
      if (!session) { setReady(true); return; }
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
    return () => { cancelled = true; };
  }, [navigate]);

  if (!ready) return <Splash />;
  return <Landing />;
}

function Splash() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100dvh", background: "#07060a" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span style={{ width: 56, height: 56, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#FF4FA3,#FF7AB8)", fontSize: 28 }}>🍯</span>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>Hunie</span>
      </div>
    </div>
  );
}

function Landing() {
  const [installOpen, setInstallOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const { deferredPrompt, isStandalone } = usePWAInstall();
  const navigate = useNavigate();
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Body scroll unlock
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("landing-scroll-unlocked");
    document.body.classList.add("landing-scroll-unlocked");
    const r = document.getElementById("root");
    r?.classList.add("landing-scroll-unlocked");
    return () => {
      root.classList.remove("landing-scroll-unlocked");
      document.body.classList.remove("landing-scroll-unlocked");
      r?.classList.remove("landing-scroll-unlocked");
    };
  }, []);

  // Scroll progress
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      const q = Math.round(pct * 200) / 200;
      if (q !== last) { last = q; setScrollPct(q); }
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Reveal observer
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".hunie-landing .reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Cursor spotlight
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const el = spotlightRef.current;
    if (!el) return;
    let tx = -9999, ty = -9999, x = -9999, y = -9999, raf = 0;
    const onMove = (e: MouseEvent) => { tx = e.clientX - 180; ty = e.clientY - 180; if (!raf) raf = requestAnimationFrame(tick); };
    const tick = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const handleInstallClick = () => {
    if (isStandalone) { navigate({ to: "/auth/register" }); return; }
    setInstallOpen(true);
  };

  return (
    <div className="hunie-landing">
      <div className="scroll-progress" aria-hidden>
        <div style={{ transform: `scaleX(${scrollPct})` }} />
      </div>
      <div className="cursor-spotlight" ref={spotlightRef} aria-hidden />

      <nav className="hl-nav" aria-label="Navegação principal">
        <div className="hl-container hl-nav-inner">
          <Link to="/" className="hl-logo">
            <span className="hl-logo-bee" aria-hidden>🍯</span>
            <span>Hunie</span>
          </Link>
          <div className="hl-nav-links">
            <a className="hl-nav-link" href="#como-funciona">Como funciona</a>
            <a className="hl-nav-link" href="#faq">FAQ</a>
            <a className="hl-nav-link" href="#cidades">Cidades</a>
            <Link to="/auth/login" className="hl-nav-link">Entrar</Link>
            <Link to="/auth/register" className="hl-btn-primary">Criar conta</Link>
          </div>
          <Link to="/auth/register" className="hl-btn-primary md:hidden" style={{ padding: "10px 18px", fontSize: 13 }}>
            Criar conta
          </Link>
        </div>
      </nav>

      <main>
        <EditorialHero onOpenInstall={handleInstallClick} />
        <ComoFunciona />
        <FaqSection />
        <CidadesSection />

        <section className="hl-section" style={{ paddingTop: 0 }}>
          <div className="hl-container">
            <div className="hl-final-card glass reveal">
              <span className="hl-eyebrow">Conexões que ficam</span>
              <h2 className="hl-h2" style={{ marginTop: 14 }}>
                Conhece alguém novo
                <br />
                em <span className="hl-italic hl-coral-grad">Maputo esta semana.</span>
              </h2>
              <p className="hl-section-sub" style={{ margin: "20px auto 32px", maxWidth: 520 }}>
                Junta-te à comunidade de solteiros em Moçambique. Acesso desde 149 MZN/mês.
              </p>
              <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={handleInstallClick} className="hl-btn-primary">Instalar app</button>
                <Link to="/auth/register" className="hl-btn-ghost">Criar conta</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {scrollPct > 0.18 && (
        <div className="hl-sticky-cta">
          <button className="glass-brand-pill" onClick={handleInstallClick}>
            Instalar app
          </button>
        </div>
      )}

      <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} deferredPrompt={deferredPrompt} />
    </div>
  );
}

function Footer() {
  return (
    <footer className="hl-container">
      <div className="hl-footer glass">
        <div className="hl-footer-grid">
          <div>
            <Link to="/" className="hl-logo" style={{ fontSize: 20 }}>
              <span className="hl-logo-bee" aria-hidden>🍯</span>
              <span>Hunie</span>
            </Link>
            <p style={{ marginTop: 14, color: "rgba(255,255,255,0.6)", fontSize: 14, maxWidth: 320 }}>
              Conexões reais, da tua terra. Feito para Moçambique, em Moçambique.
            </p>
            <span className="hl-made-pill">
              <Heart size={12} fill="#FF7AB8" stroke="#FF7AB8" /> Made with love in NL &amp; MZ
            </span>
          </div>

          <div>
            <h4>App</h4>
            <ul>
              <li><a href="#como-funciona">Como funciona</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#cidades">Cidades</a></li>
              <li><Link to="/auth/login">Entrar</Link></li>
            </ul>
          </div>

          <div>
            <h4>Legal &amp; contacto</h4>
            <ul>
              <li><a href="#">Termos</a></li>
              <li><a href="#">Privacidade</a></li>
              <li><a href="#">Cookies</a></li>
              <li><a href="#">Diretrizes</a></li>
              <li><a href="mailto:ola@hunie.app">Contacto</a></li>
            </ul>
            <div className="hl-socials">
              <a href="#" aria-label="Instagram"><Instagram size={16} /></a>
              <a href="#" aria-label="TikTok"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0115.54 3h-3.09v12.4a2.59 2.59 0 11-2.59-2.59c.27 0 .53.04.78.12V9.79a5.7 5.7 0 00-.78-.05A5.69 5.69 0 1015.55 15.4V9.01a7.34 7.34 0 004.29 1.38V7.3a4.28 4.28 0 01-3.24-1.48z"/></svg></a>
              <a href="#" aria-label="X"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
              <a href="#" aria-label="LinkedIn"><Linkedin size={16} /></a>
            </div>
          </div>
        </div>

        <div className="hl-copyright">
          <span>© 2026 Hunie. Todos os direitos reservados.</span>
          <span>🌐 PT</span>
        </div>
      </div>
    </footer>
  );
}
