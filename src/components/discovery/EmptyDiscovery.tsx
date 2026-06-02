import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import hunieMark from "@/assets/hunie-mark.png.asset.json";

interface EmptyDiscoveryProps {
  loading?: boolean;
  onRefresh?: () => void;
}

export const EmptyDiscovery = ({ loading = false, onRefresh }: EmptyDiscoveryProps) => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Ambient brand glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--brand-pink) 28%, transparent) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--brand-purple) 24%, transparent) 0%, transparent 70%)",
          filter: "blur(28px)",
        }}
        animate={{ scale: [1.06, 1, 1.06], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />

      {/* Honey jar — branded ring + float */}
      <motion.div
        className="relative grid place-items-center"
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="absolute inset-0 -m-3 rounded-full"
          style={{
            background:
              "conic-gradient(from 120deg, var(--brand-pink), var(--brand-purple), var(--brand-magenta), var(--brand-pink))",
            filter: "blur(14px)",
            opacity: 0.55,
          }}
        />
        <div
          className="relative grid h-[120px] w-[120px] place-items-center rounded-full"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.20) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 50px -18px color-mix(in oklab, var(--brand-pink) 60%, transparent)",
            backdropFilter: "blur(14px)",
          }}
        >
          <motion.div
            className="text-[64px] leading-none"
            animate={loading ? { rotate: [-4, 4, -4] } : { y: [0, -4, 0] }}
            transition={{
              duration: loading ? 1.6 : 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))" }}
          >
            🍯
          </motion.div>
        </div>
      </motion.div>

      {/* Title with brand gradient */}
      <motion.h2
        className="relative mt-6 text-[26px] font-bold tracking-tight"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundImage:
            "linear-gradient(135deg, #FF4FA3 0%, #E935A0 50%, #B13CFF 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {loading ? "À procura..." : "Sem mais mel por agora"}
      </motion.h2>

      <motion.p
        className="relative mt-2 max-w-[280px] text-[14px] leading-relaxed text-white/55"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
      >
        {loading
          ? "A encontrar pessoas perto de ti."
          : "Voltamos já com novos perfis para descobrires."}
      </motion.p>

      {!loading && onRefresh && (
        <motion.button
          type="button"
          onClick={onRefresh}
          whileTap={{ scale: 0.96 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-7 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)",
            boxShadow:
              "0 10px 28px -10px color-mix(in oklab, var(--brand-pink) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          <RefreshCw className="h-[14px] w-[14px]" strokeWidth={2.4} />
          Atualizar
        </motion.button>
      )}
    </div>
  );
};
