import { useState } from "react";
import { Globe2, Check, ChevronDown } from "lucide-react";
import { useCountry } from "@/lib/country/context";
import { COUNTRY_CONFIG, SUPPORTED_COUNTRIES } from "@/lib/country/config";

export function CountrySwitcher({ compact = false }: { compact?: boolean }) {
  const { country, config, setCountry } = useCountry();
  const [open, setOpen] = useState(false);

  const choose = (c: typeof country) => {
    setCountry(c);
    setOpen(false);
    // If user picks a country with a dedicated subdomain, send them there
    // so SEO + payments + future SSR all match the choice.
    if (typeof window === "undefined") return;
    const target = COUNTRY_CONFIG[c].defaultReturnHost;
    if (target && window.location.host !== target && /\.hunie\.app$/.test(window.location.host)) {
      window.location.host = target;
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: compact ? "6px 10px" : "8px 12px",
          fontSize: compact ? 12 : 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.78)",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 999,
          cursor: "pointer",
        }}
      >
        <Globe2 size={13} />
        <span>{config.flag}</span>
        <span>{config.name}</span>
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            padding: 6,
            margin: 0,
            listStyle: "none",
            background: "#0b0b0d",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            boxShadow: "0 20px 50px -20px rgba(0,0,0,0.7)",
            zIndex: 50,
          }}
        >
          {SUPPORTED_COUNTRIES.map((c) => {
            const cfg = COUNTRY_CONFIG[c];
            const active = c === country;
            return (
              <li key={c}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 10px",
                    border: "none",
                    background: active ? "rgba(255,255,255,0.06)" : "transparent",
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 13,
                    textAlign: "left",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <span>{cfg.flag}</span>
                  <span style={{ flex: 1 }}>{cfg.name}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                    {cfg.currencySymbol}
                  </span>
                  {active && <Check size={12} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
