import { ChevronDown } from "lucide-react";
import { faqData } from "./faqData";

export function FaqSection() {
  return (
    <section id="faq" className="hl-section">
      <div className="hl-container">
        <div className="hl-section-head reveal">
          <span className="hl-eyebrow">Perguntas frequentes</span>
          <h2 className="hl-h2">
            Tudo o que precisas
            <br />
            <span className="hl-italic">de saber.</span>
          </h2>
          <p className="hl-section-sub">
            Preços em MZN, pagamento M-Pesa, verificação por selfie e tudo o resto.
          </p>
        </div>

        <div className="hl-faq-list">
          {faqData.map((item) => (
            <details key={item.q} className="hl-faq reveal">
              <summary>
                <span>{item.q}</span>
                <span className="hl-faq-chev" aria-hidden>
                  <ChevronDown size={16} />
                </span>
              </summary>
              <div className="hl-faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
