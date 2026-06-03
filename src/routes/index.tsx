import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Plus, Sparkles, Crown, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/liquid-landing.css";
import { InstallModal } from "@/components/landing/InstallModal";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useTypewriter } from "@/hooks/useTypewriter";

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
    links: [
      { rel: "canonical", href: "https://hunie.app" },
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
        <span style={{ width: 56, height: 56, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#FF4FA3,#B13CFF)", fontSize: 28 }}>🍯</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>Hunie</span>
      </div>
    </div>
  );
}

/* ============================================================
   New Landing — Apple liquid glass, dark, brand pink↔purple
   ============================================================ */

const TYPE_PHRASES = [
  "em Maputo.",
  "na Beira.",
  "em Matola.",
  "que vibra contigo.",
  "à tua altura.",
];

const STEPS = [
  { n: "01", title: "Cria o teu perfil", body: "Foto verificada, bio e o que procuras. Em menos de dois minutos estás dentro." },
  { n: "02", title: "Descobre quem combina", body: "Algoritmo afinado para Moçambique. Sem swipes infinitos — só perfis que fazem sentido." },
  { n: "03", title: "Conversa quando há match", body: "Mensagens diretas, áudios e fotos. Reais. Privados. Sem ruído de redes sociais." },
];

const CITIES = [
  { name: "Maputo", count: "12.4k" },
  { name: "Matola", count: "4.2k" },
  { name: "Beira", count: "3.1k" },
  { name: "Nampula", count: "1.8k" },
  { name: "Chimoio", count: "980" },
];

const TIERS = [
  {
    name: "Select", price: "149", per: "MZN/mês",
    icon: <BadgeCheck size={18} />,
    perks: ["Comunidade verificada", "Likes diários", "Mensagens com matches", "Sem anúncios"],
    cta: "Começar grátis",
    featured: false,
  },
  {
    name: "Plus", price: "499", per: "MZN/mês",
    icon: <Sparkles size={18} />,
    perks: ["Tudo do Select", "Likes ilimitados", "Vê quem te curtiu", "Modo Anónimo"],
    cta: "Escolher Plus",
    featured: true,
  },
  {
    name: "Elite", price: "1.499", per: "MZN/mês",
    icon: <Crown size={18} />,
    perks: ["Tudo do Plus", "Prioridade na descoberta", "Boost semanal", "Acesso a eventos privados"],
    cta: "Escolher Elite",
    featured: false,
  },
];

const QUOTES = [
  { text: "Conheci o Mário aqui. Três meses depois ainda estamos juntos. Coisa rara, hoje em dia.", name: "Carla", meta: "Maputo · 28" },
  { text: "Finalmente uma app feita para nós. Sem pessoas a fingir, sem perfis estranhos.", name: "Tiago", meta: "Matola · 31" },
  { text: "Adoro que pago em MZN com M-Pesa. Tudo simples, tudo cá.", name: "Joana", meta: "Beira · 25" },
];

const FAQ = [
  { q: "É só para Moçambique?", a: "Sim. Hunie foi pensada para Moçambique — preços em MZN, M-Pesa, perfis verificados nas principais cidades." },
  { q: "Como funciona a verificação?", a: "Tiras uma selfie que comparamos com a tua foto de perfil. Demora menos de um minuto e recebes o ✓ verificado." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Cancelas no settings em dois toques. Mantens o acesso até ao fim do ciclo pago." },
  { q: "Os meus dados estão seguros?", a: "Encriptação ponta-a-ponta nas conversas. Nunca vendemos dados. Nunca." },
];

function Landing() {
  const [installOpen, setInstallOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { deferredPrompt, isStandalone } = usePWAInstall();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const typed = useTypewriter(TYPE_PHRASES, { typeMs: 70, deleteMs: 38, holdMs: 1900 });

  // Body scroll unlock (landing page has its own scroll context)
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

  return (
    <div className="ll-root" ref={rootRef}>
      {/* Ambient */}
      <div className="ll-ambient" aria-hidden>
        <div className="ll-orb ll-orb-1" />
        <div className="ll-orb ll-orb-2" />
        <div className="ll-orb ll-orb-3" />
        <div className="ll-grain" />
      </div>

      <div className="ll-shell">
        {/* Nav */}
        <nav className="ll-nav" aria-label="Navegação principal">
          <div className="ll-nav-inner">
            <Link to="/" className="ll-logo">
              <span className="ll-logo-dot" aria-hidden />
              <span>Hunie</span>
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

        {/* Hero */}
        <header className="ll-hero">
          <div className="ll-container">
            <div className="ll-hero-inner">
              <span className="ll-eyebrow ll-reveal">🇲🇿 Feito em Moçambique</span>
              <h1 className="ll-h1 ll-reveal">
                Encontra alguém
                <br />
                <span className="ll-tw-line">
                  {typed}
                  <span className="ll-caret" aria-hidden />
                </span>
              </h1>
              <p className="ll-lead ll-reveal">
                Hunie é a comunidade de encontros <span className="ll-italic">membership-only</span> de Moçambique. Perfis verificados, conversas em português, preços em MZN.
              </p>
              <div className="ll-hero-cta ll-reveal">
                <button onClick={handleInstallClick} className="ll-btn ll-btn-primary">Instalar app</button>
                <Link to="/auth/register" className="ll-btn ll-btn-ghost">Criar conta grátis</Link>
              </div>

              {/* Floating glass profile cards */}
              <div className="ll-float-row" aria-hidden>
                <FloatCard name="Andreia, 27" meta="Maputo · 2 km" tag="Novo" img="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80" />
                <FloatCard name="Tiago, 31" meta="Beira · online" tag="✓" img="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80" />
                <FloatCard name="Joana, 24" meta="Matola · hoje" tag="Match" img="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80" />
              </div>
            </div>
          </div>
        </header>

        {/* Como funciona */}
        <section id="como-funciona" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Como funciona</span>
            <h2 className="ll-h2 ll-reveal">Três passos. Zero <span className="ll-italic ll-grad-text">complicação.</span></h2>
            <div className="ll-grid-3">
              {STEPS.map((s) => (
                <div key={s.n} className="ll-card ll-reveal" style={{ textAlign: "left" }}>
                  <div className="ll-step-num">{s.n}</div>
                  <div className="ll-step-title">{s.title}</div>
                  <div className="ll-step-body">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tiers / Planos */}
        <section id="planos" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Planos</span>
            <h2 className="ll-h2 ll-reveal">Escolhe o teu <span className="ll-italic ll-grad-text">ritmo.</span></h2>
            <p className="ll-lead ll-reveal">Sem letra pequena. Cancelas quando quiseres. Pagas em MZN com M-Pesa ou cartão.</p>
            <div className="ll-tiers">
              {TIERS.map((t) => (
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

        {/* Cities */}
        <section id="cidades" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Onde estamos</span>
            <h2 className="ll-h2 ll-reveal">Comunidade ativa em <span className="ll-italic ll-grad-text">cinco cidades.</span></h2>
            <div className="ll-cities">
              {CITIES.map((c) => (
                <div key={c.name} className="ll-city ll-reveal">
                  <div className="ll-city-name">{c.name}</div>
                  <div className="ll-city-count">{c.count} pessoas</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">Histórias reais</span>
            <h2 className="ll-h2 ll-reveal">Quem já <span className="ll-italic ll-grad-text">encontrou.</span></h2>
            <div className="ll-quotes">
              {QUOTES.map((q) => (
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

        {/* FAQ */}
        <section id="faq" className="ll-section">
          <div className="ll-container ll-section-center">
            <span className="ll-eyebrow ll-reveal">FAQ</span>
            <h2 className="ll-h2 ll-reveal">Perguntas <span className="ll-italic ll-grad-text">honestas.</span></h2>
            <div className="ll-faq">
              {FAQ.map((f, i) => (
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

        {/* Final CTA */}
        <section className="ll-section" style={{ paddingTop: 0 }}>
          <div className="ll-container">
            <div className="ll-card ll-final ll-reveal">
              <span className="ll-eyebrow">Pronto?</span>
              <h2 className="ll-h2" style={{ marginTop: 18 }}>
                Conhece alguém novo
                <br />
                <span className="ll-italic ll-grad-text">esta semana.</span>
              </h2>
              <p className="ll-lead">Junta-te aos solteiros de Moçambique. Acesso desde 149 MZN/mês.</p>
              <div className="ll-hero-cta" style={{ marginTop: 28 }}>
                <button onClick={handleInstallClick} className="ll-btn ll-btn-primary">Instalar app</button>
                <Link to="/auth/register" className="ll-btn ll-btn-ghost">Criar conta</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="ll-footer">
          <div className="ll-container">
            <div className="ll-footer-inner">
              <Link to="/" className="ll-logo" style={{ fontSize: 16 }}>
                <span className="ll-logo-dot" aria-hidden />
                <span>Hunie</span>
              </Link>
              <div className="ll-footer-links">
                <a href="#como-funciona">Como funciona</a>
                <a href="#planos">Planos</a>
                <a href="#faq">FAQ</a>
                <Link to="/auth/login">Entrar</Link>
                <a href="mailto:ola@hunie.app">Contacto</a>
              </div>
              <span>© 2026 Hunie · Made in MZ</span>
            </div>
          </div>
        </footer>
      </div>

      <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} deferredPrompt={deferredPrompt} />
    </div>
  );
}

function FloatCard({ name, meta, tag, img }: { name: string; meta: string; tag: string; img: string }) {
  return (
    <div className="ll-float-card">
      <span className="ll-fc-tag">{tag}</span>
      <div className="ll-fc-avatar" style={{ backgroundImage: `url(${img})` }} />
      <div className="ll-fc-name">{name}</div>
      <div className="ll-fc-meta">{meta}</div>
    </div>
  );
}
