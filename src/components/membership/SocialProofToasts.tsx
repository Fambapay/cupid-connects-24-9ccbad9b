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
  const [notice, setNotice] = useState<Notice>(() => ({
    id: 0,
    name: pick(NAMES),
    city: pick(CITIES),
    plan: pick(PLANS),
    when: pick(TIME_AGO),
  }));

  useEffect(() => {
    let counter = 0;
    const id = window.setInterval(() => {
      counter += 1;
      setNotice({
        id: counter,
        name: pick(NAMES),
        city: pick(CITIES),
        plan: pick(PLANS),
        when: pick(TIME_AGO),
      });
    }, 5000 + Math.random() * 2000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={notice.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="flex items-center gap-2.5 px-3 py-2.5"
        >
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
            style={{ background: `${notice.plan.accent}22`, color: notice.plan.accent }}
          >
            <Sparkles size={14} />
          </div>
          <div className="min-w-0 flex-1 text-[11px] leading-tight">
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
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


