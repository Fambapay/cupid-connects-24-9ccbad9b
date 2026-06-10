import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Share, Plus, Smartphone, MoreVertical, X } from "lucide-react";
import type { BeforeInstallPromptEvent } from "@/hooks/usePWAInstall";

interface Props {
  open: boolean;
  onClose: () => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

type Tab = "ios" | "android";

function detectTab(): Tab {
  if (typeof navigator === "undefined") return "ios";
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "android";
}

export function InstallModal({ open, onClose, deferredPrompt }: Props) {
  const [tab, setTab] = useState<Tab>("ios");
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTab(detectTab());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setTimeout(() => {
          onClose();
          navigate({ to: "/auth/register" });
        }, 600);
      }
    } catch {
      // user dismissed
    }
  };

  return (
    <div
      className="hl-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Instalar app"
    >
      <style>{`
        .hl-modal-backdrop{position:fixed;inset:0;background:rgba(7,6,10,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);z-index:2000;display:grid;place-items:end center;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom));animation:hlmFade .2s ease-out}
        @media(min-width:768px){.hl-modal-backdrop{place-items:center}}
        .hl-modal{width:100%;max-width:460px;border-radius:28px;background:linear-gradient(180deg,#15101e,#0b0710);border:1px solid rgba(255,255,255,.10);padding:28px 24px 24px;position:relative;color:#fff;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);animation:hlmRise .28s cubic-bezier(.2,.8,.2,1)}
        .hl-modal-close{position:absolute;top:14px;right:14px;width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:rgba(255,255,255,.06);border:none;color:#fff;cursor:pointer}
        .hl-modal h3{font-family:"SF Pro Display",system-ui,sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.02em;margin:0}
        .hl-modal-tabs{display:flex;gap:6px;margin:20px 0 22px;padding:4px;border-radius:999px;background:rgba(255,255,255,.05)}
        .hl-modal-tab{flex:1;padding:9px 14px;border-radius:999px;background:transparent;color:rgba(255,255,255,.7);border:none;cursor:pointer;font-weight:600;font-size:13px}
        .hl-modal-tab.active{background:linear-gradient(135deg,#FF4FA3,#FF7AB8);color:#fff}
        .hl-modal-step{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.06)}
        .hl-modal-step:last-of-type{border-bottom:none}
        .hl-modal-step-icon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:12px;background:rgba(255,79,163,.10);color:#FF7AB8}
        .hl-modal-step strong{font-size:14px}
        .hl-modal-step p{margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.62);line-height:1.5}
        .hl-modal .hl-btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 20px;border-radius:999px;background:linear-gradient(135deg,#FF4FA3,#FF7AB8);color:#fff;font-weight:600;border:none;cursor:pointer;font-size:15px}
        @keyframes hlmFade{from{opacity:0}to{opacity:1}}
        @keyframes hlmRise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="hl-modal" ref={dialogRef}>
        <button className="hl-modal-close" onClick={onClose} aria-label="Fechar">
          <X size={16} />
        </button>
        <h3>Instalar o Hunie</h3>
        <p style={{ marginTop: 6, color: "var(--hl-muted)", fontSize: 14 }}>
          Adiciona ao teu ecrã principal — abre como uma app, sem loja.
        </p>

        <div className="hl-modal-tabs" role="tablist">
          <button
            className={`hl-modal-tab ${tab === "ios" ? "active" : ""}`}
            onClick={() => setTab("ios")}
            role="tab"
            aria-selected={tab === "ios"}
          >
            iPhone
          </button>
          <button
            className={`hl-modal-tab ${tab === "android" ? "active" : ""}`}
            onClick={() => setTab("android")}
            role="tab"
            aria-selected={tab === "android"}
          >
            Android
          </button>
        </div>

        {tab === "ios" ? (
          <div>
            <div className="hl-modal-step">
              <div className="hl-modal-step-icon"><Share size={18} /></div>
              <div><strong>1. Toca Partilhar</strong><p>No Safari, toca no ícone de partilhar (▲) no fundo.</p></div>
            </div>
            <div className="hl-modal-step">
              <div className="hl-modal-step-icon"><Plus size={18} /></div>
              <div><strong>2. Adicionar ao Ecrã Principal</strong><p>Escolhe a opção “Adicionar ao Ecrã Principal”.</p></div>
            </div>
            <div className="hl-modal-step">
              <div className="hl-modal-step-icon"><Smartphone size={18} /></div>
              <div><strong>3. Confirma</strong><p>O Hunie aparece como app no teu ecrã. Pronto.</p></div>
            </div>
          </div>
        ) : (
          <div>
            {deferredPrompt ? (
              <div style={{ display: "grid", gap: 14, marginTop: 4 }}>
                <p style={{ color: "var(--hl-muted)", fontSize: 14 }}>
                  Estás em Chrome — instala diretamente:
                </p>
                <button className="hl-btn-primary" onClick={handleAndroidInstall} style={{ width: "100%" }}>
                  Instalar agora
                </button>
              </div>
            ) : (
              <div>
                <div className="hl-modal-step">
                  <div className="hl-modal-step-icon"><MoreVertical size={18} /></div>
                  <div><strong>1. Abre o menu</strong><p>Em Chrome, toca em ⋮ no canto superior direito.</p></div>
                </div>
                <div className="hl-modal-step">
                  <div className="hl-modal-step-icon"><Plus size={18} /></div>
                  <div><strong>2. Instalar app</strong><p>Escolhe “Instalar app” ou “Adicionar ao ecrã principal”.</p></div>
                </div>
                <div className="hl-modal-step">
                  <div className="hl-modal-step-icon"><Smartphone size={18} /></div>
                  <div><strong>3. Confirma</strong><p>O Hunie passa a abrir como aplicação nativa.</p></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
