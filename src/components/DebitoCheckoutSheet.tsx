import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, X, Smartphone, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createDebitoPayment } from "@/lib/debito.functions";
import { MOBILE_MONEY_METHODS, type PaymentMethod, type BillingPeriod } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Stage = "form" | "submitting" | "pending" | "success" | "error";

export interface DebitoCheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  amountMzn: number;
  packId?: string;
  planTier?: "select" | "plus" | "elite";
  billingPeriod?: BillingPeriod;
  onSuccess?: () => void;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
};

const TIMEOUT_MS = 10 * 60 * 1000;

export function DebitoCheckoutSheet({
  open,
  onClose,
  title,
  subtitle,
  amountMzn,
  packId,
  planTier,
  billingPeriod,
  onSuccess,
}: DebitoCheckoutSheetProps) {
  const create = useServerFn(createDebitoPayment);
  const [stage, setStage] = useState<Stage>("form");
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMobile = MOBILE_MONEY_METHODS.includes(method);
  const phoneOk = !isMobile || /^8[2-7]\d{7}$/.test(phone.replace(/\D/g, ""));

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = body.style.cssText;
    body.style.cssText = `position:fixed;top:-${scrollY}px;left:0;right:0;width:100%;overflow:hidden`;
    body.classList.add("sheet-open");
    return () => {
      body.style.cssText = prev;
      body.classList.remove("sheet-open");
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Realtime subscription on pending payment
  useEffect(() => {
    if (stage !== "pending" || !paymentId) return;
    const channel = supabase
      .channel(`payment-${paymentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "debito_payments", filter: `id=eq.${paymentId}` },
        (payload) => {
          const status = (payload.new as { status?: string }).status;
          if (status === "success") {
            setStage("success");
            window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
            onSuccess?.();
            toast.success("Pagamento confirmado");
          } else if (status === "failed") {
            setStage("error");
            setErrMsg("O pedido foi cancelado ou expirou.");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [stage, paymentId, onSuccess]);

  // Countdown + timeout
  useEffect(() => {
    if (stage !== "pending") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setSecondsLeft(TIMEOUT_MS / 1000);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.floor((TIMEOUT_MS - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStage("error");
        setErrMsg("O pedido expirou. Tenta de novo.");
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  const reset = () => {
    setStage("form");
    setReference(null);
    setPaymentId(null);
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
          billing_period: billingPeriod,
          return_url: isMobile ? undefined : "https://hunie.lovable.app/app?subscription=success",
        },
      });
      if (!res.success) {
        setErrMsg(res.message ?? "Não foi possível processar.");
        setStage("error");
        return;
      }
      setReference(res.reference ?? null);
      setPaymentId(res.payment_id ?? null);
      if (res.status === "success") {
        setStage("success");
        window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
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

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const countdown = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm touch-none"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/10 bg-gradient-to-b from-[#1a0a14] to-background p-5 pb-[max(env(safe-area-inset-bottom),24px)] text-foreground shadow-[0_-20px_60px_-10px_rgba(240,70,140,0.3)]"
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

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold">Total hoje</span>
                <span className="text-xl font-extrabold">
                  {amountMzn.toLocaleString("pt-PT")} <span className="text-xs font-bold text-white/60">MZN</span>
                </span>
              </div>
            </div>

            {(stage === "form" || stage === "submitting") && (
              <>
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Método de pagamento
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MethodTile m="mpesa" sub="84 / 85" active={method === "mpesa"} onClick={() => setMethod("mpesa")} />
                    <MethodTile m="emola" sub="86 / 87" active={method === "emola"} onClick={() => setMethod("emola")} />
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

                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/60">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  Pagamento encriptado
                </div>
              </>
            )}

            {stage === "pending" && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
                <div className="relative mx-auto h-16 w-16">
                  <Loader2 size={64} className="animate-spin text-fuchsia-400" />
                </div>
                <p className="mt-3 text-base font-bold">⏳ A aguardar confirmação…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirme o pagamento no seu telemóvel
                </p>
                {reference && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Referência: <span className="font-mono text-white">{reference}</span>
                  </p>
                )}
                <p className="mt-3 text-xs font-mono tabular-nums text-white/70">
                  Tempo restante: {countdown}
                </p>
              </div>
            )}

            {stage === "success" && (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <CheckCircle2 size={56} className="mx-auto text-emerald-400" />
                </motion.div>
                <p className="mt-3 text-base font-bold">Pagamento confirmado! 🎉</p>
                <p className="mt-1 text-xs text-muted-foreground">Bem-vindo ao Hunie</p>
                <button
                  onClick={handleClose}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-bold text-white"
                >
                  <Sparkles size={14} /> Começar a dar match
                </button>
              </div>
            )}

            {stage === "error" && (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                <XCircle size={40} className="mx-auto text-red-400" />
                <p className="mt-2 text-sm font-semibold text-red-300">
                  ❌ Pagamento não confirmado
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{errMsg ?? "Tenta novamente."}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStage("form")}
                    className="h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-sm font-bold text-white"
                  >
                    Tentar novamente
                  </button>
                  <button
                    onClick={() => {
                      setStage("form");
                      setMethod(method === "mpesa" ? "emola" : "mpesa");
                    }}
                    className="h-11 rounded-xl bg-white/[0.08] text-sm font-bold"
                  >
                    Outro método
                  </button>
                </div>
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
  sub,
  active,
  onClick,
}: {
  m: PaymentMethod;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  const brand =
    m === "mpesa"
      ? { color: "#E30613", glow: "rgba(227,6,19,0.35)", initials: "M" }
      : { color: "#F58220", glow: "rgba(245,130,32,0.35)", initials: "e" };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors ${
        active
          ? "border-white/20 bg-white/[0.06]"
          : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.04]"
      }`}
      style={
        active
          ? {
              boxShadow: `0 0 0 1px ${brand.color}55, 0 10px 24px -14px ${brand.glow}`,
            }
          : undefined
      }
    >
      {active && (
        <span
          className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-50 blur-2xl"
          style={{ background: brand.color }}
        />
      )}
      <span
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-black text-white"
        style={{ background: brand.color }}
      >
        {brand.initials}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-white">
          {METHOD_LABEL[m]}
        </span>
        <span className="block truncate text-[10px] font-medium text-white/55">
          começa por {sub.replace(/\s/g, "")}
        </span>
      </span>
      {active && (
        <CheckCircle2
          size={16}
          className="relative shrink-0"
          style={{ color: brand.color }}
        />
      )}
    </motion.button>
  );
}
