import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, X, Lock, ShieldCheck, Sparkles, CreditCard } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createDebitoPayment } from "@/lib/debito.functions";
import {
  MOBILE_MONEY_METHODS,
  type PaymentMethod,
  type BillingPeriod,
} from "@/lib/pricing";
import {
  formatCountryPrice,
  paymentLabel,
  type PaymentMethodCode,
} from "@/lib/country/config";
import { useCountry } from "@/lib/country/context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Stage = "form" | "submitting" | "pending" | "success" | "error";

export interface DebitoCheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  /** Amount in the active country's currency (kept as amountMzn for backwards compat) */
  amountMzn: number;
  packId?: string;
  planTier?: "select" | "plus" | "elite";
  billingPeriod?: BillingPeriod;
  onSuccess?: () => void;
}

const TIMEOUT_MS = 10 * 60 * 1000;

/** Visual brand for known payment method tiles. */
const METHOD_BRAND: Record<string, { color: string; glow: string; initials: string; sub?: string }> = {
  mpesa:              { color: "#E30613", glow: "rgba(227,6,19,0.35)",  initials: "M", sub: "84 / 85" },
  emola:              { color: "#F58220", glow: "rgba(245,130,32,0.35)", initials: "e", sub: "86 / 87" },
  multicaixa_express: { color: "#0067B2", glow: "rgba(0,103,178,0.35)",  initials: "MC", sub: "Multicaixa" },
  referencia_mc:      { color: "#1E40AF", glow: "rgba(30,64,175,0.30)",  initials: "Ref", sub: "Multicaixa" },
  unitel_money:       { color: "#E11D48", glow: "rgba(225,29,72,0.30)",  initials: "U", sub: "Unitel" },
  mbway:              { color: "#E5097F", glow: "rgba(229,9,127,0.30)",  initials: "MB", sub: "MB WAY" },
  multibanco:         { color: "#003876", glow: "rgba(0,56,118,0.30)",   initials: "MB", sub: "Multibanco" },
  ozow:               { color: "#0EA5E9", glow: "rgba(14,165,233,0.30)", initials: "O",  sub: "Instant EFT" },
  eft:                { color: "#64748B", glow: "rgba(100,116,139,0.3)", initials: "E",  sub: "EFT" },
  visa:               { color: "#1A1F71", glow: "rgba(26,31,113,0.30)",  initials: "V",  sub: "Visa" },
  mastercard:         { color: "#EB001B", glow: "rgba(235,0,27,0.30)",   initials: "Mc", sub: "Mastercard" },
};

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
  const { country, config } = useCountry();
  const [stage, setStage] = useState<Stage>("form");
  const availableMethods = useMemo(
    () => config.payments as PaymentMethod[],
    [config.payments],
  );
  const [method, setMethod] = useState<PaymentMethod>(() => availableMethods[0] ?? "mpesa");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [mcReference, setMcReference] = useState<{
    entity: string;
    number: string;
    instructions?: string;
    expiresAt?: string;
    expiresIn?: string;
  } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Re-seed method when country (or its payments list) changes.
    if (!availableMethods.includes(method)) {
      setMethod(availableMethods[0] ?? "mpesa");
    }
  }, [availableMethods, method]);

  const isMobile = MOBILE_MONEY_METHODS.includes(method);
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = !isMobile || config.phoneLocalRegex.test(phoneDigits);
  const amountFormatted = formatCountryPrice(amountMzn, country);

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
    setMcReference(null);
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
          country,
          return_url: isMobile
            ? undefined
            : `https://${config.defaultReturnHost}/app?subscription=success`,
        },
      });
      if (!res.success) {
        setErrMsg(res.message ?? "Não foi possível processar.");
        setStage("error");
        return;
      }
      setReference(res.reference ?? null);
      setMcReference(
        "mc_reference" in res && res.mc_reference
          ? (res.mc_reference as typeof mcReference)
          : null,
      );
      setPaymentId(res.payment_id ?? null);
      if (res.status === "success") {
        setStage("success");
        window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
        onSuccess?.();
        toast.success("Pagamento confirmado");
      } else if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else if (res.awaiting_provider) {
        // Country/method not live yet — show friendly message instead of pending spinner
        setStage("error");
        setErrMsg(
          res.message ??
            `${paymentLabel(method as PaymentMethodCode)} estará disponível em breve em ${config.name}. Estamos a finalizar a integração.`,
        );
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
            className="fixed inset-0 backdrop-blur-sm bg-[color:var(--checkout-sheet-backdrop)] touch-none"
            style={{ zIndex: 10010 }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            className="checkout-sheet-panel fixed inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-[var(--surface-border)] bg-[image:var(--checkout-sheet-bg)] p-5 pb-[max(env(safe-area-inset-bottom),24px)] text-foreground shadow-[0_-20px_60px_-10px_rgba(240,70,140,0.3)]"
            style={{ zIndex: 10011 }}
          >
            
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300">
                  <Lock size={9} /> Checkout {config.flag} {config.name}
                </div>
                <h3 className="text-lg font-extrabold leading-tight">{title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <button
                onClick={handleClose}
                disabled={stage === "submitting"}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-3)] disabled:opacity-40"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold">Total hoje</span>
                <span className="text-xl font-extrabold">{amountFormatted}</span>
              </div>
            </div>

            {(stage === "form" || stage === "submitting") && (
              <>
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Método de pagamento
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {availableMethods.map((m) => (
                      <MethodTile
                        key={m}
                        m={m}
                        active={method === m}
                        onClick={() => setMethod(m)}
                      />
                    ))}
                  </div>
                </div>

                {isMobile && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Número {paymentLabel(method as PaymentMethodCode)}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-3">
                      <span className="text-sm text-muted-foreground">{config.phonePrefix}</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder={config.phoneExample}
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
                      <Lock size={14} /> Pagar {amountFormatted}
                    </span>
                  )}
                </motion.button>

                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[color:var(--fg-dim)]">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  Pagamento encriptado · {config.currency}
                </div>
              </>
            )}

            {stage === "pending" && mcReference && (
              <div className="mt-5 rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] p-5">
                <div className="text-center">
                  <p className="text-base font-bold">Pague em qualquer ATM ou Internet Banking</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use os dados abaixo para finalizar o pagamento.
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-[var(--surface-3)] px-3 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Entidade</span>
                    <span className="font-mono text-base font-bold text-foreground">{mcReference.entity}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--surface-3)] px-3 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Referência</span>
                    <span className="font-mono text-base font-bold text-foreground">{mcReference.number}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--surface-3)] px-3 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Montante</span>
                    <span className="font-mono text-base font-bold text-foreground">{amountFormatted}</span>
                  </div>
                </div>
                {mcReference.instructions && (
                  <p className="mt-3 whitespace-pre-line text-[11px] text-muted-foreground">
                    {mcReference.instructions}
                  </p>
                )}
                <p className="mt-3 text-center text-xs font-mono tabular-nums text-[color:var(--fg-soft)]">
                  A aguardar confirmação · {countdown}
                </p>
              </div>
            )}

            {stage === "pending" && !mcReference && (
              <div className="mt-5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-5 text-center">
                <div className="relative mx-auto h-16 w-16">
                  <Loader2 size={64} className="animate-spin text-fuchsia-400" />
                </div>
                <p className="mt-3 text-base font-bold">⏳ A aguardar confirmação…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirme o pagamento no seu telemóvel
                </p>
                {reference && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Referência: <span className="font-mono text-foreground">{reference}</span>
                  </p>
                )}
                <p className="mt-3 text-xs font-mono tabular-nums text-[color:var(--fg-soft)]">
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
                <div className="mt-4">
                  <button
                    onClick={() => setStage("form")}
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-sm font-bold text-white"
                  >
                    Tentar novamente
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
  active,
  onClick,
}: {
  m: PaymentMethod;
  active: boolean;
  onClick: () => void;
}) {
  const brand = METHOD_BRAND[m] ?? {
    color: "#64748B",
    glow: "rgba(100,116,139,0.3)",
    initials: m.slice(0, 2).toUpperCase(),
    sub: m,
  };
  const isCard = m === "visa" || m === "mastercard";

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors ${
        active
          ? "border-[var(--surface-border)] bg-[var(--surface-3)]"
          : "border-[var(--surface-border-soft)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
      }`}
      style={
        active
          ? { boxShadow: `0 0 0 1px ${brand.color}55, 0 10px 24px -14px ${brand.glow}` }
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
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-black text-white"
        style={{ background: brand.color }}
      >
        {isCard ? <CreditCard size={14} /> : brand.initials}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-bold text-foreground">
          {paymentLabel(m as PaymentMethodCode)}
        </span>
        {brand.sub && (
          <span className="block truncate text-[10px] font-medium text-[color:var(--fg-dim)]">
            {brand.sub}
          </span>
        )}
      </span>
      {active && (
        <CheckCircle2 size={16} className="relative shrink-0" style={{ color: brand.color }} />
      )}
    </motion.button>
  );
}
