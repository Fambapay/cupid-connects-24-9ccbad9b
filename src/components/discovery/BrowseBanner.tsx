import { motion } from "framer-motion";
import { Flame } from "lucide-react";

export function BrowseBanner({ count, onActivate }: { count: number; onActivate: () => void }) {
  return (
    <motion.button
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      onClick={onActivate}
      className="fixed left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3.5 py-2 text-left shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 60px)" }}
    >
      <Flame size={13} className="text-pink-400" />
      <span className="text-[12px] font-semibold text-white">
        {count} perto de ti
      </span>
      <span className="text-[11px] text-white/60">· Activar</span>
    </motion.button>
  );
}
