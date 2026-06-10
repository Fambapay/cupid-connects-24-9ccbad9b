import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Sparkles, Crown, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/liquid-landing.css";
import { InstallModal } from "@/components/landing/InstallModal";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useTypewriter } from "@/hooks/useTypewriter";
import hunieMark from "@/assets/hunie-mark-transparent.png.asset.json";
import { useCountry } from "@/lib/country/context";
import { getCountryCopy } from "@/lib/country/copy";
import { COUNTRY_CONFIG, DEFAULT_COUNTRY, formatCountryPrice, paymentLabel, type PaymentMethodCode } from "@/lib/country/config";
import { countryFromHost, resolveCountryClient } from "@/lib/country/detect";
import { getPlanCards } from "@/lib/plans";
import { CountrySwitcher } from "@/components/CountrySwitcher";

// Build country-aware <head> at SSR time using the request host.
// The route is ssr: false so this runs client-side on hydration; we read
// host on the server fetch path in future iterations.
function buildHead(country: keyof typeof COUNTRY_CONFIG): any {
  const cfg = COUNTRY_CONFIG[country];
  const copy = getCountryCopy(country);
  const s = copy.seo;
  return {
    meta: [
      { title: s.title },
      { name: "description", content: s.description },
      { name: "keywords", content: s.keywords },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#07060a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Hunie" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: s.ogUrl },
      { property: "og:title", content: s.ogTitle },
      { property: "og:description", content: s.ogDescription },
      { property: "og:image", content: "https://hunie.app/og-image.jpg" },
      { property: "og:locale", content: cfg.ogLocale },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: s.ogTitle },
      { name: "twitter:description", content: s.twitterDescription },
      { name: "twitter:image", content: "https://hunie.app/og-image.jpg" },
    ],
    links: [
      { rel: "canonical", href: s.canonical },
      { rel: "alternate", hrefLang: "pt-MZ", href: "https://hunie.app/" },
      { rel: "alternate", hrefLang: "pt-AO", href: "https://ao.hunie.app/" },
      { rel: "alternate", hrefLang: "x-default", href: "https://hunie.app/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "MobileApplication",
        name: "Hunie",
        description: `Dating membership-only ${cfg.nameLocative}`,
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "PWA",
        url: s.ogUrl,
        offers: { "@type": "Offer", price: s.priceFrom, priceCurrency: cfg.currency },
        areaServed: { "@type": "Country", name: s.areaServed },
        aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
      }),
    }],
  };
}

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => {
    // Client-only resolution; the SSR shell uses defaults from __root.tsx.
    const country =
      typeof window !== "undefined"
        ? (countryFromHost(window.location.host) ?? DEFAULT_COUNTRY)
        : DEFAULT_COUNTRY;
    return buildHead(country);
  },
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
        <img src={hunieMark.url} alt="Hunie" style={{ width: 56, height: 56, borderRadius: 14, display: "block" }} />
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>Hunie</span>
      </div>
    </div>
  );
}

/* ============================================================
   New Landing — Apple liquid glass, dark, brand pink↔purple.
   Fully country-driven via useCountry / getCountryCopy.
   ============================================================ */

function Landing() {
  const [installOpen, setInstallOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { deferredPrompt, isStandalone } = usePWAInstall();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  // Re-resolve country on mount in case the route's head() default was
  // wrong (e.g. SSR shell rendered a different host than this fetch).
  const { country, config, setCountry } = useCountry();
  useEffect(() => {
    const resolved = resolveCountryClient();
    if (resolved !== country) setCountry(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = useMemo(() => getCountryCopy(country), [country]);
  const planCards = useMemo(() => getPlanCards(country), [country]);

  // City phrases for typewriter, country-driven
  const typePhrases = useMemo(
    () => config.heroCities.map((c) => `em ${c.replace(/\.$/, "")}.`),
    [config.heroCities],
  );
  const typed = useTypewriter(typePhrases, { typeMs: 70, deleteMs: 38, holdMs: 1900 });

  const stepsCopy = useMemo(
    () => [
      { n: "01", title: "Cria o teu perfil", body: "Foto verificada, bio e o que procuras. Em menos de dois minutos estás dentro." },
      { n: "02", title: "Descobre quem combina", body: `Algoritmo afinado para ${config.name}. Sem swipes infinitos — só perfis que fazem sentido.` },
      { n: "03", title: "Conversa quando há match", body: "Mensagens diretas, áudios e fotos. Reais. Privados. Sem ruído de redes sociais." },
    ],
    [config.name],
  );

  // Top 5 cities for the grid
  const heroCityCounts = useMemo(() => {
    const sample = config.cities.slice(0, 5);
    const counts = ["12.4k", "4.2k", "3.1k", "1.8k", "980"];
    return sample.map((name, i) => ({ name, count: counts[i] ?? "—" }));
  }, [config.cities]);

  const paymentMethodLine = useMemo(
    () => config.payments.map((p) => paymentLabel(p as PaymentMethodCode)).join(", "),
    [config.payments],
  );

  const planosSubtitle = `Sem letra pequena. Cancelas quando quiseres. Pagas em ${config.currency} com ${config.payments.slice(0, 2).map((p) => paymentLabel(p as PaymentMethodCode)).join(" ou ")} ou cartão.`;

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

  // Smooth inertia scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: any;
    let rafId: number;
    let cancelled = false;
    (async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
      });
      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    })();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) lenis.destroy();
    };
  }, []);

  // Reveal observer
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll<HTMLElement>(".ll-reveal") ?? [];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const handleInstallClick = () => {
    if (isStandalone) { navigate({ to: "/auth/register" }); return; }
    setInstallOpen(true);
  };

  // Map plan cards to landing-tier display
  const tiers = planCards
    .slice()
    .sort((a, b) => a.priceMzn - b.priceMzn)
    .map((p, i) => ({
      name: p.label,
      price: formatCountryPrice(p.priceMzn, country),
      per: "/mês",
      icon: i === 0 ? <BadgeCheck size={18} /> : i === 1 ? <Sparkles size={18} /> : <Crown size={18} />,
      perks: p.highlights.map((h) => h.label),
      cta: i === 0 ? "Começar grátis" : `Escolher ${p.label}`,
      featured: p.badge === "Mais popular",
    }));

  return (
    <div className="ll-root" ref={rootRef}>
      <div className="ll-ambient" aria-hidden>
        <div className="ll-orb ll-orb-1" />
        <div className="ll-orb ll-orb-2" />
        <div className="ll-orb ll-orb-3" />
        <div className="ll-grain" />
      </div>

      <div className="ll-shell">
        <nav className="ll-nav" aria-label="Navegação principal">
          <div className="ll-nav-inner">
            <Link to="/" className="ll-logo" aria-label="Hunie">
              <img src={hunieMark.url} alt="Hunie" className="ll-logo-img" />
            </Link>
            <div className="ll-nav-links">
              <a className="ll-nav-link" href="#como-funciona">Como funciona</a>
              <a className="ll-nav-link" href="#planos">Planos</a>
              <a className="ll-nav-link" href="#cidades">Cidades</a>
              <a className="ll-nav-link" href="#faq">FAQ</a>
              <Link to="/auth/login" className="ll-nav-link">Entrar</Link>
            </div>
            <Link to="/auth/register" className="ll-btn ll-btn-primary" style={{ height: 38, padding: "0 18px", fontSize: 13.5 }}>
              Criar conta
            </Link>
          </div>
        </nav>

        <header className="ll-hero">
          <div className="ll-container">
            <div className="ll-hero-inner">
              <span className="ll-eyebrow ll-reveal">{copy.hero.eyebrow}</span>
              <h1 className="ll-h1 ll-reveal">
                {copy.hero.line1}
                <br />
                <span className="ll-tw-line">
                  {typed}
                  <span className="ll-caret" aria-hidden />
                </span>
              </h1>
              <p
                className="ll-lead ll-reveal"
                dangerouslySetInnerHTML={{ __html: copy.hero.leadHtml }}
              />
              <div className="ll-hero-cta ll-reveal">
                <button onClick={handleInstallClick} className="ll-btn ll-btn-primary">{copy.hero.ctaPrimary}</button>
                <Link to="/auth/register" className="ll-btn ll-btn-ghost">{copy.hero.ctaSecondary}</Link>
              </div>
            </div>
          </div>
        </header>

        <section id="como-funciona" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Como funciona</span>
            <h2 className="ll-h2 ll-reveal">Três passos. Zero <span className="ll-italic ll-grad-text">complicação.</span></h2>
            <div className="ll-grid-3">
              {stepsCopy.map((s) => (
                <div key={s.n} className="ll-card ll-reveal" style={{ textAlign: "left" }}>
                  <div className="ll-step-num">{s.n}</div>
                  <div className="ll-step-title">{s.title}</div>
                  <div className="ll-step-body">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Planos</span>
            <h2 className="ll-h2 ll-reveal">Escolhe o teu <span className="ll-italic ll-grad-text">ritmo.</span></h2>
            <p className="ll-lead ll-reveal">{planosSubtitle}</p>
            <div className="ll-tiers">
              {tiers.map((t) => (
                <div key={t.name} className={`ll-card ll-tier ll-reveal ${t.featured ? "ll-tier-featured" : ""}`} style={{ textAlign: "left" }}>
                  {t.featured && <span className="ll-tier-badge">POPULAR</span>}
                  <div className="ll-tier-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {t.icon} {t.name}
                  </div>
                  <div className="ll-tier-price">{t.price}<small>{t.per}</small></div>
                  <ul className="ll-tier-list">
                    {t.perks.map((p) => (
                      <li key={p}><Check size={16} strokeWidth={2.5} /> <span>{p}</span></li>
                    ))}
                  </ul>
                  <Link to="/auth/register" className={`ll-btn ${t.featured ? "ll-btn-primary" : "ll-btn-ghost"} ll-tier-cta`}>{t.cta}</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cidades" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Onde estamos</span>
            <h2 className="ll-h2 ll-reveal">
              Comunidade ativa {config.nameLocative}, da capital às <span className="ll-italic ll-grad-text">grandes cidades.</span>
            </h2>
            <div className="ll-cities">
              {heroCityCounts.map((c) => (
                <div key={c.name} className="ll-city ll-reveal">
                  <div className="ll-city-name">{c.name}</div>
                  <div className="ll-city-count">{c.count} pessoas</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Histórias reais</span>
            <h2 className="ll-h2 ll-reveal">Quem já <span className="ll-italic ll-grad-text">encontrou.</span></h2>
            <div className="ll-quotes">
              {copy.testimonials.map((q) => (
                <div key={q.name} className="ll-card ll-quote ll-reveal" style={{ textAlign: "left" }}>
                  <p>"{q.text}"</p>
                  <div className="ll-quote-who">
                    <div className="ll-quote-avatar" />
                    <div>
                      <div className="ll-quote-name">{q.name}</div>
                      <div className="ll-quote-meta">{q.meta}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">FAQ</span>
            <h2 className="ll-h2 ll-reveal">Perguntas <span className="ll-italic ll-grad-text">honestas.</span></h2>
            <div className="ll-faq">
              {copy.faq.map((f, i) => (
                <div key={f.q} className="ll-faq-item ll-reveal" data-open={openFaq === i}>
                  <button className="ll-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                    <span>{f.q}</span>
                    <Plus size={20} />
                  </button>
                  <div className="ll-faq-a">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ll-section" style={{ paddingTop: 0 }}>
          <div className="ll-container">
            <div className="ll-card ll-final ll-reveal">
              <span className="ll-eyebrow">Pronto?</span>
              <h2 className="ll-h2" style={{ marginTop: 18 }}>
                Conhece alguém novo
                <br />
                <span className="ll-italic ll-grad-text">esta semana.</span>
              </h2>
              <p className="ll-lead">
                {copy.final.sub} Acesso desde {formatCountryPrice(planCards[0]?.priceMzn ?? 0, country)}/mês.
              </p>
              <div className="ll-hero-cta" style={{ marginTop: 28 }}>
                <button onClick={handleInstallClick} className="ll-btn ll-btn-primary">{copy.hero.ctaPrimary}</button>
                <Link to="/auth/register" className="ll-btn ll-btn-ghost">Criar conta</Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="ll-footer">
          <div className="ll-container">
            <div className="ll-footer-inner">
              <Link to="/" className="ll-logo" aria-label="Hunie">
                <img src={hunieMark.url} alt="Hunie" className="ll-logo-img" />
              </Link>

              <div className="ll-footer-links">
                <a href="#como-funciona">Como funciona</a>
                <a href="#planos">Planos</a>
                <a href="#faq">FAQ</a>
                <Link to="/auth/login">Entrar</Link>
                <Link to="/legal/privacidade">Privacidade</Link>
                <Link to="/legal/termos">Termos</Link>
                <a href="mailto:ola@hunie.app">Contacto</a>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                  Pagamentos: {paymentMethodLine}
                </span>
                <CountrySwitcher compact />
              </div>

              <span>© 2026 Hunie · {config.flag} {config.name}</span>
            </div>
          </div>
        </footer>
      </div>

      <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} deferredPrompt={deferredPrompt} />
    </div>
  );
}


