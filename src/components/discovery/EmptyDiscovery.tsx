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

      {/* Radar search animation */}
      {loading && (
        <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
          {/* Expanding rings */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full border"
              style={{
                width: 180,
                height: 180,
                borderColor: `color-mix(in oklab, var(--brand-pink) ${70 - i * 15}%, transparent)`,
                background: `radial-gradient(circle, color-mix(in oklab, var(--brand-pink) ${8 - i * 2}%, transparent) 0%, transparent 70%)`,
                animation: `radar-ring 2s ease-out ${i * 0.6}s infinite`,
              }}
            />
          ))}
          {/* Rotating sweep arc */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 180, height: 180 }}
          >
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              className="animate-[radar-sweep_2.5s_linear_infinite]"
              style={{ transformOrigin: 'center' }}
            >
              <defs>
                <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--brand-pink)" stopOpacity="0" />
                  <stop offset="50%" stopColor="var(--brand-pink)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--brand-purple)" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <path
                d="M 90 90 L 90 0 A 90 90 0 0 1 180 90 Z"
                fill="url(#radarGrad)"
              />
            </svg>
          </div>
          {/* Center dot */}
          <div
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: 'var(--brand-pink)',
              boxShadow: '0 0 12px 3px color-mix(in oklab, var(--brand-pink) 50%, transparent)',
            }}
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
          animate={loading ? { rotate: [-3, 3, -3] } : { y: [0, -5, 0] }}
          transition={{
            duration: loading ? 1.6 : 3.4,
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
        {loading ? "À procura..." : "A colmeia está calma"}
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
