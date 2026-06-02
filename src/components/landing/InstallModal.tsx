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
