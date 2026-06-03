import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle2, X, Smartphone, CreditCard, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createDebitoPayment } from "@/lib/debito.functions";
import { MOBILE_MONEY_METHODS, type PaymentMethod } from "@/lib/pricing";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

type Stage = "form" | "submitting" | "pending" | "success" | "error";

export interface DebitoCheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  amountMzn: number;
  /** Pass exactly one of pack_id or plan_tier */
  packId?: string;
  planTier?: "select" | "plus" | "elite";
  onSuccess?: () => void;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "mKesh",
  visa_mastercard: "Cartão Visa / Mastercard",
  payfast: "PayFast",
};

export function DebitoCheckoutSheet({
  open,
  onClose,
  title,
  subtitle,
  amountMzn,
  packId,
  planTier,
  onSuccess,
}: DebitoCheckoutSheetProps) {
  const create = useServerFn(createDebitoPayment);
  const { profile } = useProfile();
  const welcomeBonusActive =
    !(profile as { welcome_bonus_granted_at?: string | null } | null)?.welcome_bonus_granted_at;
  const [stage, setStage] = useState<Stage>("form");
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const isMobile = MOBILE_MONEY_METHODS.includes(method);
  const phoneOk = !isMobile || /^8[2-7]\d{7}$/.test(phone.replace(/\D/g, ""));

  const reset = () => {
    setStage("form");
    setReference(null);
    setErrMsg(null);
  };

  const handleClose = () => {
    if (stage === "submitting") return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!phoneOk) return;
    setStage("submitting");
    setErrMsg(null);
    try {
      const res = await create({
        data: {
          payment_method: method,
          phone: isMobile ? phone : undefined,
          pack_id: packId,
          plan_tier: planTier,
          return_url: isMobile ? undefined : "https://hunie.lovable.app/app?subscription=success",
        },
      });
      if (!res.success) {
        setErrMsg(res.message ?? "Não foi possível processar.");
        setStage("error");
        return;
      }
      setReference(res.reference ?? null);
      if (res.status === "success") {
        setStage("success");
        onSuccess?.();
        toast.success("Pagamento confirmado");
      } else if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        setStage("pending");
      }
    } catch (e) {
      console.error(e);
      setErrMsg("Erro ao processar pagamento. Tenta novamente.");
      setStage("error");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-gradient-to-b from-[#1a0a14] to-background p-5 pb-[max(env(safe-area-inset-bottom),24px)] text-foreground shadow-[0_-20px_60px_-10px_rgba(240,70,140,0.3)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300">
                  <Lock size={9} /> Checkout seguro
                </div>
                <h3 className="text-lg font-extrabold leading-tight">{title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <button
                onClick={handleClose}
                disabled={stage === "submitting"}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] disabled:opacity-40"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Order summary */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span>Subscrição</span>
                <span>{amountMzn.toLocaleString("pt-PT")} MZN</span>
              </div>
              {welcomeBonusActive && (
                <div className="mt-1 flex items-baseline justify-between text-xs text-emerald-300">
                  <span>Bónus de boas-vindas</span>
                  <span className="font-semibold">+1 Boost grátis</span>
                </div>
              )}
              <div className="my-2 h-px bg-white/8" />
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold">Total hoje</span>
                <span className="text-xl font-extrabold">{amountMzn.toLocaleString("pt-PT")} <span className="text-xs font-bold text-white/60">MZN</span></span>
              </div>
            </div>

            {stage === "form" || stage === "submitting" ? (
              <>
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Método de pagamento
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["mpesa", "emola", "mkesh"] as PaymentMethod[]).map((m) => (
                      <MethodTile key={m} m={m} active={method === m} onClick={() => setMethod(m)} icon={<Smartphone size={14} />} />
                    ))}
                    {(["visa_mastercard", "payfast"] as PaymentMethod[]).map((m) => (
                      <MethodTile key={m} m={m} active={method === m} onClick={() => setMethod(m)} icon={<CreditCard size={14} />} />
                    ))}
                  </div>
                </div>

                {isMobile && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Número {METHOD_LABEL[method]}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <span className="text-sm text-muted-foreground">+258</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="84 123 4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Vamos enviar um pedido de pagamento para o teu telemóvel.
                    </p>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={stage === "submitting" || !phoneOk}
                  onClick={submit}
                  className="relative mt-5 h-13 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(240,70,140,0.7)] disabled:opacity-50"
                >
                  {stage === "submitting" ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> A processar…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Lock size={14} /> Pagar {amountMzn.toLocaleString("pt-PT")} MZN
                    </span>
                  )}
                </motion.button>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-white/60">
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] py-2">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span>Garantia 7 dias</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] py-2">
                    <Lock size={13} className="text-sky-400" />
                    <span>SSL · 256-bit</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] py-2">
                    <Sparkles size={13} className="text-fuchsia-400" />
                    <span>Ativação imediata</span>
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] text-white/40">
                  Renova automaticamente · Cancela quando quiseres
                </p>
              </>
            ) : stage === "pending" ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <Loader2 size={28} className="mx-auto animate-spin text-fuchsia-400" />
                <p className="mt-3 text-sm font-semibold">Confirma no telemóvel</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Introduz o teu PIN {METHOD_LABEL[method]} para concluir.
                </p>
                {reference && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Referência: <span className="font-mono text-white">{reference}</span>
                  </p>
                )}
                <button onClick={handleClose} className="mt-4 text-xs text-muted-foreground underline">
                  Fechar
                </button>
              </div>
            ) : stage === "success" ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                <p className="mt-3 text-sm font-semibold">Pagamento confirmado!</p>
                <button
                  onClick={handleClose}
                  className="mt-4 h-11 w-full rounded-xl bg-emerald-500 text-sm font-bold text-white"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
                <p className="text-sm font-semibold text-red-300">{errMsg ?? "Erro"}</p>
                <button
                  onClick={() => setStage("form")}
                  className="mt-3 h-11 w-full rounded-xl bg-white/[0.08] text-sm font-bold"
                >
                  Tentar de novo
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MethodTile({
  m,
  active,
  onClick,
  icon,
}: {
  m: PaymentMethod;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-[11px] font-semibold ${
        active
          ? "border-fuchsia-500/60 bg-fuchsia-500/15 text-white"
          : "border-white/10 bg-white/[0.04] text-white/70"
      }`}
    >
      <span className={active ? "text-fuchsia-300" : "text-white/60"}>{icon}</span>
      <span>{METHOD_LABEL[m]}</span>
    </button>
  );
}
