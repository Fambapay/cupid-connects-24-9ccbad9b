import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUp } from "lucide-react";
import type { DiscoveryProfile } from "./types";

interface FirstImpressionSheetProps {
  open: boolean;
  profile: DiscoveryProfile | null;
  superLikeBalance?: number;
  onClose: () => void;
  onSend: (message: string) => Promise<void> | void;
}

const MAX_LEN = 140;

export const FirstImpressionSheet = ({
  open,
  profile,
  superLikeBalance,
  onClose,
  onSend,
}: FirstImpressionSheetProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setMessage("");
      setActiveIdx(0);
      scrollerRef.current?.scrollTo({ left: 0 });
    }
  }, [open, profile?.id]);

  const photos = (profile?.photos ?? []).slice(0, 5);
  const total = Math.max(1, photos.length);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / (el.clientWidth * 0.78));
    setActiveIdx(Math.min(photos.length - 1, Math.max(0, i)));
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await onSend(message.trim());
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "#0B1020",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
          >
            {/* Top bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px 8px",
              }}
            >
              <button
                onClick={onClose}
                aria-label="Fechar"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
              <div
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                }}
              >
                {MAX_LEN - message.length}
              </div>
            </div>

            {/* Headlines */}
            <div style={{ padding: "8px 22px 18px" }}>
              <div
                style={{
                  color: "#5AA9FF",
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: 0.1,
                }}
              >
                Aumenta até 5x as tuas hipóteses de match
              </div>
              <h2
                style={{
                  marginTop: 8,
                  fontSize: 22,
                  lineHeight: 1.25,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Destaca-te com First Impressions. Envia uma mensagem.
                Vê se há match.
              </h2>
            </div>

            {/* Photo carousel */}
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <div
                ref={scrollerRef}
                onScroll={onScroll}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "0 22px",
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  height: "100%",
                  alignItems: "stretch",
                }}
              >
                {(photos.length ? photos : [undefined]).map((url, i) => (
                  <div
                    key={i}
                    style={{
                      flex: "0 0 78%",
                      maxWidth: 360,
                      scrollSnapAlign: "start",
                      borderRadius: 18,
                      overflow: "hidden",
                      position: "relative",
                      background: "#1a2236",
                      boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
                      border: "1px solid rgba(90,169,255,0.25)",
                      height: "min(58vh, 520px)",
                      alignSelf: "center",
                    }}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={profile.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        draggable={false}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "#1a2236" }} />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        padding: "5px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      {i + 1}/{total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input row */}
            <div
              style={{
                padding: "14px 18px 18px",
                background: "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <input
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value.slice(0, MAX_LEN))
                  }
                  placeholder="A tua mensagem"
                  maxLength={MAX_LEN}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: 16,
                    padding: "6px 4px",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  aria-label="Enviar"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    border: "none",
                    cursor: message.trim() ? "pointer" : "default",
                    background: message.trim()
                      ? "linear-gradient(135deg,#5AA9FF,#7C5BFF)"
                      : "rgba(255,255,255,0.12)",
                    color: "#fff",
                    transition: "background 0.2s",
                    opacity: sending ? 0.6 : 1,
                  }}
                >
                  <ArrowUp size={18} strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
