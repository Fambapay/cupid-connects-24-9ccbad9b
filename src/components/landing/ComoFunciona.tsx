import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const EASE = [0.32, 0.72, 0, 1] as const;

const STEPS = [
  {
    n: "01",
    t: "Cria o teu perfil.",
    c: "Adiciona fotos, escreve quem és, partilha o que procuras. Quanto mais autêntico, melhor o teu match.",
  },
  {
    n: "02",
    t: "Escolhe o teu plano.",
    c: "Select, Plus ou Elite. Todos dão acesso à comunidade verificada. Escolhe o que faz sentido para ti.",
  },
  {
    n: "03",
    t: "Conecta-te a sério.",
    c: "Só pessoas reais, verificadas e com a mesma intenção. O Hunie é feito para conexões que vão além do ‘oi’.",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="hl-section">
      <div className="hl-container">
        <div className="hl-section-head reveal">
          <span className="hl-eyebrow">Como funciona</span>
          <h2 className="hl-h2">
            Três passos.
            <br />
            <span className="hl-italic">Uma comunidade.</span>
          </h2>
          <p className="hl-section-sub">
            Sem fricção. Sem bots. Sem perfis falsos. Como o dating devia ser.
          </p>
        </div>

        <div className="hl-steps">
          {STEPS.map((s, i) => (
            <motion.article
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.15 }}
            >
              <div className="hl-step-num">{s.n}</div>
              <h3 className="hl-step-title">{s.t}</h3>
              <p className="hl-step-copy">{s.c}</p>
            </motion.article>
          ))}
        </div>

        <div style={{ marginTop: 56 }}>
          <a href="#faq" className="hl-btn-link">
            Vê as perguntas frequentes <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
