import { motion } from "framer-motion";
import { Send, Check } from "lucide-react";

interface Props {
  photo?: string | null;
  name: string;
}

export const FirstImpressionToast = ({ photo, name }: Props) => {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -30, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px 10px 10px",
        borderRadius: 999,
        background:
          "linear-gradient(135deg, rgba(20,20,26,0.92), rgba(28,20,40,0.92))",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow:
          "0 20px 50px -10px rgba(79,168,255,0.35), 0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        minWidth: 280,
        maxWidth: 360,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: "50%",
          flexShrink: 0,
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1.5px solid rgba(255,255,255,0.18)",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "rgba(79,168,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {name.slice(0, 1)}
          </div>
        )}
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 500, damping: 18 }}
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4FA8FF, #2E7BE0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(79,168,255,0.6), 0 0 0 2px rgba(20,20,26,0.95)",
          }}
        >
          <Check size={12} color="#fff" strokeWidth={3.5} />
        </motion.div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.55)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          <Send size={11} color="#4FA8FF" strokeWidth={2.6} />
          First Impression
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Enviada para {name}
        </div>
      </div>
    </motion.div>
  );
};
