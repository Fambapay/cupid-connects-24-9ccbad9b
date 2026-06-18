import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function BrowseBanner({ count, onActivate }: { count: number; onActivate: () => void }) {
  const label =
    count === 1
      ? "1 alma à tua espera"
      : `${count} almas à tua espera`;

  return (
    <motion.button
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -12, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      onClick={onActivate}
      aria-label={`${label}. Toca para desbloquear.`}
      className="fixed left-1/2 z-40 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md px-2.5 py-1 text-left shadow-[0_4px_16px_-6px_rgba(0,0,0,0.5)]"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      <Sparkles size={11} className="text-pink-300" />
      <span className="text-[10.5px] font-medium text-white/90 tracking-tight">
        {label}
      </span>
      <span className="text-[10.5px] text-pink-300/90 font-semibold">Revelar</span>
    </motion.button>
  );
}
