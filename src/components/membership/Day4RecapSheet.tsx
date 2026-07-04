// Recap mostrado no dia 4 (24h após o trial Elite terminar).
// Aparece 1x — flag show_day4_recap em profiles.
// Mostra o que o utilizador teve acesso durante o trial e convida a subir.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { X, Heart, Star, Rocket, Eye, MessageCircle, Sparkles } from "lucide-react";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function Day4RecapGate() {
  const { user } = useAuth();
  const { access, reload } = useAccessLevel();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (access.showDay4Recap) setOpen(true);
  }, [access.showDay4Recap]);

  const dismiss = async () => {
    if (dismissing || !user) return;
    setDismissing(true);
    setOpen(false);
    try {
      await supabase
        .from("profiles")
        .update({ show_day4_recap: false })
        .eq("id", user.id);
      await reload();
    } finally {
      setDismissing(false);
    }
  };

  const goPlans = async () => {
    await dismiss();
    navigate({ to: "/membership", search: { required: 1 } });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="d4-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        style={{ zIndex: 10000 }}
        onClick={dismiss}
      />
      <motion.div
        key="d4-sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-x-0 bottom-0 rounded-t-[28px] border-t border-white/[0.08] bg-[#0b0b0d] text-white"
        style={{
          zIndex: 10001,
          paddingBottom: "max(env(safe-area-inset-bottom), 18px)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
        >
          <X size={14} className="text-white/80" />
        </button>

        <div className="px-6 pt-8">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#FF4FA3] to-[#B13CFF]">
              <Sparkles size={14} className="text-white" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
              Os teus 3 dias Elite
            </span>
          </div>

          <h2
            className="mt-4 text-[26px] font-semibold leading-[1.12] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sentiste a diferença?
          </h2>
          <p className="mt-2 text-[14px] leading-snug text-white/55">
            Estes 3 dias mostraram-te o que é a Hunie no seu melhor.
            Continua com Plus ou Elite — ou fica no Free com 10 likes por dia.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              { icon: Heart, label: "Deste likes sem contar os dias" },
              { icon: Eye, label: "Viste quem já tinha reparado em ti" },
              { icon: MessageCircle, label: "Iniciaste conversas com os teus matches" },
              { icon: Star, label: "Tinhas 10 Super Likes por dia" },
              { icon: Rocket, label: "1 Boost diário para apareceres primeiro" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/85">
                  <Icon size={14} />
                </span>
                <span className="text-[14px] leading-tight text-white/85">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 pt-7">
          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={goPlans}
            className="h-12 w-full rounded-full bg-white text-[15px] font-semibold text-black hover:bg-white/95 transition-colors"
          >
            Ver planos
          </motion.button>
          <button
            onClick={dismiss}
            className="mt-3 h-10 w-full text-[13px] font-medium text-white/45 hover:text-white/70 transition-colors"
          >
            Continuar no Free
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
