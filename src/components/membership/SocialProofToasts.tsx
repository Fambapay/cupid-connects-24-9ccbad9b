import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const NAMES = [
  "Aissa", "Anésio", "Beatriz", "Bento", "Carla", "Celso", "Dércio", "Délcia",
  "Edmilson", "Elsa", "Fátima", "Felizardo", "Gildo", "Hélio", "Ivone", "Jaime",
  "Joaquim", "Kátia", "Laurinda", "Lúcio", "Mércia", "Nelson", "Nilza", "Octávio",
  "Olívia", "Paíto", "Rosária", "Sálvio", "Sheila", "Tomásia", "Ussene", "Valter",
  "Wilson", "Xavier", "Yara", "Zaida", "Aida", "Júlio", "Stélio", "Telma",
];

const CITIES = ["Maputo", "Matola", "Beira", "Nampula", "Tete", "Quelimane", "Pemba", "Xai-Xai", "Inhambane", "Chimoio"];
const PLANS: { label: string; accent: string }[] = [
  { label: "Select", accent: "#5BB8FF" },
  { label: "Plus", accent: "#F0468C" },
  { label: "Elite", accent: "#C9A84C" },
];

const TIME_AGO = ["agora mesmo", "há 1 min", "há 2 min", "há 3 min", "há 5 min"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Notice {
  id: number;
  name: string;
  city: string;
  plan: { label: string; accent: string };
  when: string;
}

export function SocialProofToasts() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let counter = 0;
    let hideTimer: number | undefined;
    let nextTimer: number | undefined;

    const show = () => {
      counter += 1;
      setNotice({
        id: counter,
        name: pick(NAMES),
        city: pick(CITIES),
        plan: pick(PLANS),
        when: pick(TIME_AGO),
      });
      hideTimer = window.setTimeout(() => setNotice(null), 4500);
      nextTimer = window.setTimeout(show, 9000 + Math.random() * 6000);
    };

    const initial = window.setTimeout(show, 2500);
    return () => {
      window.clearTimeout(initial);
      if (hideTimer) window.clearTimeout(hideTimer);
      if (nextTimer) window.clearTimeout(nextTimer);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-40 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 56, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-black/80 px-3 py-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{ background: `${notice.plan.accent}22`, color: notice.plan.accent }}
            >
              <Sparkles size={13} />
            </div>
            <div className="min-w-0 text-[11px] leading-tight">
              <div className="truncate font-semibold text-white">
                {notice.name} de {notice.city}
              </div>
              <div className="truncate text-white/55">
                subscreveu{" "}
                <span style={{ color: notice.plan.accent }} className="font-bold">
                  {notice.plan.label}
                </span>{" "}
                · {notice.when}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
