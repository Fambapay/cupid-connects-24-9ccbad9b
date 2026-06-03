import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface Props {
  minutes?: number;
}

export function BoostActivatedToast({ minutes = 30 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="relative overflow-hidden rounded-2xl px-4 py-3 min-w-[280px] shadow-[0_10px_40px_-10px_rgba(168,85,247,0.55)] border border-white/15"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.55 0.22 295) 0%, oklch(0.62 0.24 320) 50%, oklch(0.65 0.22 25) 100%)",
      }}
    >
      {/* shimmer */}
      <motion.div
        aria-hidden
        initial={{ x: "-120%" }}
        animate={{ x: "120%" }}
        transition={{ duration: 1.4, ease: "easeInOut", delay: 0.15 }}
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
      />
      {/* glow orb */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-50"
        style={{ background: "oklch(0.8 0.2 320)" }}
      />

      <div className="relative flex items-center gap-3">
        <motion.div
          initial={{ rotate: -20, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.05 }}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="w-5 h-5 text-white fill-white drop-shadow" />
          </motion.div>
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm tracking-tight leading-tight">
            Boost ativado
          </div>
          <div className="text-white/85 text-xs mt-0.5">
            Estás em destaque por {minutes} min
          </div>
        </div>
      </div>

      {/* progress bar */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4, ease: "linear" }}
        style={{ transformOrigin: "left" }}
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/70"
      />
    </motion.div>
  );
}
