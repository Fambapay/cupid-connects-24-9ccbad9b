import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import hunieMark from "@/assets/hunie-mark.png.asset.json";

interface EmptyDiscoveryProps {
  loading?: boolean;
  onRefresh?: () => void;
}

export const EmptyDiscovery = ({ loading = false, onRefresh }: EmptyDiscoveryProps) => {
  const [searching, setSearching] = useState(false);
  const isSearching = loading || searching;

  useEffect(() => {
    if (!searching) return;
    const t = setTimeout(() => setSearching(false), 2200);
    return () => clearTimeout(t);
  }, [searching]);

  const handleRefresh = () => {
    setSearching(true);
    onRefresh?.();
  };

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

      {/* Radar search animation */}
      {isSearching && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 260, height: 260 }}
        >
          {/* Expanding rings */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border"
              style={{
                borderColor: `color-mix(in oklab, var(--brand-pink) ${55 - i * 12}%, transparent)`,
                background: `radial-gradient(circle, color-mix(in oklab, var(--brand-pink) ${6 - i * 1.5}%, transparent) 0%, transparent 65%)`,
                animation: `radar-pulse 2.4s ease-out ${i * 0.8}s infinite`,
                opacity: 0,
              }}
            />
          ))}

          {/* Static base ring */}
          <div
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: "color-mix(in oklab, var(--brand-pink) 22%, transparent)",
            }}
          />

          {/* Rotating conic sweep */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, color-mix(in oklab, var(--brand-pink) 55%, transparent) 350deg, color-mix(in oklab, var(--brand-purple) 75%, transparent) 360deg)",
              maskImage:
                "radial-gradient(circle, black 58%, transparent 70%)",
              WebkitMaskImage:
                "radial-gradient(circle, black 58%, transparent 70%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}


      {/* Hunie mark — branded */}
      <motion.div
        className="relative grid place-items-center"
        initial={{ opacity: 0, y: 8, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Soft halo behind the mark */}
        <div
          aria-hidden
          className="absolute inset-0 -m-6 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--brand-pink) 55%, transparent) 0%, transparent 70%)",
            filter: "blur(24px)",
            opacity: 0.85,
          }}
        />
        <motion.img
          src={hunieMark.url}
          alt="Hunie"
          width={132}
          height={132}
          className="relative h-[132px] w-[132px] select-none"
          draggable={false}
          animate={isSearching ? { rotate: [-3, 3, -3] } : { y: [0, -5, 0] }}
          transition={{
            duration: isSearching ? 1.6 : 3.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            filter:
              "drop-shadow(0 14px 28px color-mix(in oklab, var(--brand-pink) 45%, transparent)) drop-shadow(0 4px 10px rgba(0,0,0,0.45))",
          }}
        />
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
        {isSearching ? "À procura..." : "A colmeia está calma"}
      </motion.h2>

      <motion.p
        className="relative mt-2 max-w-[280px] text-[14px] leading-relaxed text-white/55"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
      >
        {isSearching
          ? "A encontrar pessoas perto de ti."
          : "Voltamos já com novos perfis para descobrires."}
      </motion.p>

      {!isSearching && onRefresh && (
        <motion.button
          type="button"
          onClick={handleRefresh}
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
