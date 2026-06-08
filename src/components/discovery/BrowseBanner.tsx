import { motion } from "framer-motion";
import { Flame, ArrowRight } from "lucide-react";

export function BrowseBanner({ count, onActivate }: { count: number; onActivate: () => void }) {
  return (
    <motion.button
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      onClick={onActivate}
      className="fixed inset-x-3 z-40 flex items-center gap-3 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-fuchsia-500/95 to-pink-500/95 p-3 text-left shadow-[0_20px_60px_-20px_rgba(240,70,140,0.7)] backdrop-blur"
      style={{ bottom: "calc(80px + env(safe-area-inset-bottom))" }}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
        <Flame size={20} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-white">
          🔥 {count} pessoas perto de ti no Hunie
        </div>
        <div className="text-xs text-white/85">Activa para começar a dar match</div>
      </div>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
        <ArrowRight size={16} className="text-white" />
      </div>
    </motion.button>
  );
}
