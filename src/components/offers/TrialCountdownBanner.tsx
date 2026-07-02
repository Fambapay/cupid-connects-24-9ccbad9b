import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { OFFER_COPY, formatCountdown } from "@/lib/offers/copy";

export interface TrialCountdownBannerProps {
  trialEndsAt: Date;
  onTap: () => void;
}

/**
 * Banner overlay fino no topo do discover, só nas últimas 24h do trial.
 * Não empurra o layout do deck — está em position:absolute sobre a top bar.
 */
export function TrialCountdownBanner({ trialEndsAt, onTap }: TrialCountdownBannerProps) {
  const [msLeft, setMsLeft] = useState(() => trialEndsAt.getTime() - Date.now());

  useEffect(() => {
    const tick = () => setMsLeft(trialEndsAt.getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [trialEndsAt]);

  if (msLeft <= 0 || msLeft > 24 * 60 * 60 * 1000) return null;

  return (
    <motion.button
      type="button"
      onClick={onTap}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="absolute left-3 right-3 z-30 flex items-center justify-between rounded-2xl border border-[#FF4458]/25 bg-black/60 px-3.5 py-2.5 text-left shadow-[0_8px_30px_rgba(255,68,88,0.15)] backdrop-blur-xl"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
      }}
    >
      <span className="flex items-center gap-2 text-[13px] font-medium text-white/90">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FF4458]/20 text-[#FF7A88]">
          <Clock size={12} />
        </span>
        <span className="tabular-nums">{OFFER_COPY.last24hBanner(formatCountdown(msLeft))}</span>
      </span>
      <span className="rounded-full bg-[#FF4458] px-3 py-1 text-[11px] font-semibold text-white">
        Garantir
      </span>
    </motion.button>
  );
}
