import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTypewriter } from "@/hooks/useTypewriter";

const EASE = [0.32, 0.72, 0, 1] as const;
const CITIES = ["Maputo.", "Matola.", "Beira.", "Nampula.", "Chimoio.", "Tete.", "Pemba."];
const ROTATING = [
  "Perfis verificados",
  "Comunidade curada",
  "Zero perfis falsos",
  "Pagamento em MZN",
];

interface Props {
  onOpenInstall: () => void;
}

export function EditorialHero({ onOpenInstall }: Props) {
  const word = useTypewriter(CITIES, { typeMs: 70, deleteMs: 40, holdMs: 2200 });
  const [rotIdx, setRotIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRotIdx((i) => (i + 1) % ROTATING.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="hl-hero hl-hero-editorial">
      <div className="hl-atmo-1" aria-hidden />
      <div className="hl-atmo-2" aria-hidden />

      <div className="hl-container hl-hero-inner">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0 }}
          className="hl-hero-pill"
        >
          <span className="pulse-dot" aria-hidden />
          <span>🇲🇿 Feito em Moçambique</span>
        </motion.div>

        <h1 className="hl-edit-display">
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
            style={{ display: "block" }}
          >
            O amor que procuras
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.22 }}
            className="hl-hero-line2 hl-italic"
            aria-live="polite"
          >
            está em <span className="hl-coral-grad">{word}</span>
            <span className="typewriter-cursor" aria-hidden />
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
          className="hl-hero-sub"
        >
          Uma comunidade de encontros feita em Moçambique, para pessoas em Maputo,
          Matola, Beira, Nampula e Chimoio. Perfis verificados, conversas em
          português, preços em meticais.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.65 }}
          className="hl-hero-cta"
        >
          <Link to="/auth/register" className="hl-btn-primary">
            Criar conta <ArrowRight size={16} />
          </Link>
          <Link to="/auth/login" className="hl-btn-ghost">
            Entrar
          </Link>
          <button type="button" onClick={onOpenInstall} className="hl-btn-link">
            <Download size={15} /> Instalar app
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.8 }}
          className="hl-hero-trust"
        >
          Comunidade verificada · Sem anúncios · Desde 149 MZN/mês
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.95 }}
          className="hl-rotator"
          aria-live="polite"
        >
          <span className="hl-rotator-dot" aria-hidden />
          <span key={rotIdx} style={{ animation: "hl-fade 320ms ease-out" }}>
            {ROTATING[rotIdx]}
          </span>
        </motion.div>
      </div>

      <style>{`@keyframes hl-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </section>
  );
}
