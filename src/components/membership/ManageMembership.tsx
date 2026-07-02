import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Check, Sparkles, Calendar, AlertCircle, Receipt, RefreshCcw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import { getPlanCards } from "@/lib/plans";
import { useCountry } from "@/lib/country/context";
import { cancelMyMembership } from "@/lib/membership.functions";
import { getMyPaymentHistory, restoreMyPurchases, type PaymentHistoryEntry } from "@/lib/payments.functions";
import { PaywallFlow } from "@/components/paywall/PaywallFlow";

import { hapticTap } from "@/hooks/useNativePlatform";
import { requiresExternalCheckout, getExternalCheckoutUrl, getBillingMode } from "@/lib/billing/platform";
import { openInAppBrowser } from "@/lib/native/inAppBrowser";
import { ExternalLink, Info } from "lucide-react";

function formatDate(d: Date | null | string): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

function formatAmount(minor: number, currency: string): string {
  const value = minor / 100;
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function providerLabel(provider: string): string {
  if (provider.startsWith("debito_")) {
    const m = provider.replace("debito_", "");
    const map: Record<string, string> = {
      mpesa: "M-Pesa", emola: "e-Mola", mkesh: "mKesh",
      card: "Cartão", visa_mastercard: "Cartão", payfast: "PayFast",
    };
    return map[m] ?? m;
  }
  if (provider === "google_play") return "Google Play";
  if (provider === "apple_iap") return "Apple";
  return provider;
}

function describeEntry(e: PaymentHistoryEntry): string {
  if (e.kind === "subscription" && e.plan_tier) {
    const label = e.plan_tier === "elite" ? "Elite" : e.plan_tier === "plus" ? "Plus" : "Select";
    return `Hunie ${label}`;
  }
  if (e.kind === "credit_pack") {
    const k = e.pack_kind === "boost" ? "Boost" : e.pack_kind === "super_like" ? "Super Like" : "Pack";
    return `${e.pack_quantity ?? ""}× ${k}`.trim();
  }
  return "Compra";
}

function StatusIcon({ status }: { status: PaymentHistoryEntry["status"] }) {
  if (status === "paid") return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === "pending") return <Clock size={14} className="text-amber-400" />;
  return <XCircle size={14} className="text-white/40" />;
}

export function ManageMembership() {
  const navigate = useNavigate();
  const { subscription, isTrialing, isInGracePeriod, trialDaysLeft, graceDaysLeft, hasPremiumAccess } = useSubscription();
  const { reload } = useProfile();
  const { country } = useCountry();
  const cancel = useServerFn(cancelMyMembership);
  const fetchHistory = useServerFn(getMyPaymentHistory);
  const restore = useServerFn(restoreMyPurchases);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const externalOnly = requiresExternalCheckout();
  const billingMode = getBillingMode();

  const { data: history = [] } = useQuery({
    queryKey: ["payment-history"],
    queryFn: () => fetchHistory(),
    staleTime: 30_000,
  });

  const tier = subscription.membershipTier;
  const status = subscription.membershipStatus;
  const expiresAt = subscription.expiresAt;
  const isCancelled = status === "cancelled";
  const isActive = subscription.isActive;

  const planCards = getPlanCards(country);
  const currentPlan = planCards.find((p) => p.tier === tier);
  const accent = currentPlan?.accent ?? "#F0468C";
  const label = currentPlan?.label ?? "Free";

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancel();
      await reload();
      toast.success("Subscrição cancelada. Manténs acesso até " + formatDate(expiresAt));
      setConfirmCancel(false);
    } catch {
      toast.error("Não foi possível cancelar. Tenta novamente.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const r = await restore();
      if (r.hasActiveMembership) {
        await reload();
        toast.success(r.message);
      } else {
        toast(r.message);
      }
    } catch {
      toast.error("Não foi possível restaurar. Tenta novamente.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.04] bg-background/85 px-4 pb-3 pt-[max(env(safe-area-inset-top),14px)] backdrop-blur-xl">
        <button
          onClick={() => {
            hapticTap();
            navigate({ to: "/profile" });
          }}
          aria-label="Voltar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="min-w-0 truncate text-[17px] font-black tracking-tight">Gerir conta</h1>
      </header>

      <div className="px-4 pb-[max(env(safe-area-inset-bottom),120px)] pt-4 sm:px-5">
        {/* Current plan card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="relative overflow-hidden rounded-3xl border border-white/10 p-5 backdrop-blur-2xl"
          style={{
            background: isActive
              ? `linear-gradient(160deg, ${accent}26, rgba(20,20,30,0.6))`
              : "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(20,20,30,0.6))",
          }}
        >
          {isActive && (
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
              style={{ background: accent }}
            />
          )}
          <div className="relative">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                Plano actual
              </span>
              {isCancelled && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                  Cancelado
                </span>
              )}
              {isTrialing && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                  Trial · {trialDaysLeft}d
                </span>
              )}
              {isInGracePeriod && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                  Tolerância · {graceDaysLeft}d
                </span>
              )}
              {!hasPremiumAccess && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white/60">
                  Sem subscrição
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <h2
                className="text-[28px] uppercase leading-none text-white sm:text-3xl"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}
              >
                HUNIE
              </h2>
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] uppercase"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  backgroundColor: hasPremiumAccess ? accent : "rgba(255,255,255,0.12)",
                  color: hasPremiumAccess ? "#0a0a0a" : "rgba(255,255,255,0.7)",
                }}
              >
                {hasPremiumAccess ? label : "Free"}
              </span>
              {tier === "elite" && hasPremiumAccess && <Crown size={18} className="text-amber-300" />}
            </div>

            {hasPremiumAccess && (
              <div className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-white/70">
                <Calendar size={14} className="mt-0.5 shrink-0" />
                <span>
                  {isTrialing
                    ? <>Trial termina a <strong className="text-white">{formatDate(expiresAt)}</strong></>
                    : isInGracePeriod
                      ? <>Renova antes de <strong className="text-white">{formatDate(expiresAt)}</strong></>
                      : isCancelled
                        ? <>Acesso até <strong className="text-white">{formatDate(expiresAt)}</strong></>
                        : <>Renova a <strong className="text-white">{formatDate(expiresAt)}</strong></>}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Benefits */}
        {currentPlan && hasPremiumAccess && (
          <section className="mt-6">
            <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-white/50">
              O que tens incluído
            </h3>

            <ul className="space-y-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-xl">
              {currentPlan.highlights.map((h) => (
                <li key={h.label} className="flex items-start gap-3 text-sm">
                  <div
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                    style={{ background: `${accent}30` }}
                  >
                    <Check size={12} style={{ color: accent }} strokeWidth={3} />
                  </div>
                  <span className={h.bold ? "font-semibold text-white" : "text-white/80"}>
                    {h.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions */}
        <section className="mt-6 space-y-2.5">
          {externalOnly && (
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/70 backdrop-blur-xl">
              <Info size={14} className="mt-0.5 shrink-0 text-white/60" />
              <p>
                {billingMode === "ios-appstore"
                  ? "A subscrição é gerida em hunie.app no browser. Para cancelar, abre Definições → Apple ID → Subscrições."
                  : "Para pagar com M-Pesa, e-Mola ou mKesh, abrimos o site no teu browser. Cancelamentos: Play Store → Subscrições."}
              </p>
            </div>
          )}

          {tier !== "elite" && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                hapticTap();
                if (externalOnly) {
                  await openInAppBrowser(getExternalCheckoutUrl("/membership?required=1"));
                  return;
                }
                setShowUpgrade(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 px-5 py-4 text-left text-white shadow-[0_12px_40px_-12px_rgba(240,70,140,0.6)]"
            >
              <div>
                <div className="flex items-center gap-2 text-base font-extrabold">
                  <Sparkles size={16} /> {externalOnly ? "Fazer upgrade no browser" : "Fazer upgrade"}
                  {externalOnly && <ExternalLink size={13} className="opacity-80" />}
                </div>
                <p className="mt-0.5 text-xs text-white/80">
                  {isActive ? "Desbloqueia mais benefícios" : "Activa Hunie Premium"}
                </p>
              </div>
              <span className="text-xl">→</span>
            </motion.button>
          )}

          {isCancelled && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                hapticTap();
                if (externalOnly) {
                  await openInAppBrowser(getExternalCheckoutUrl("/membership"));
                  return;
                }
                setShowUpgrade(true);
              }}
              className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-left backdrop-blur-xl"
            >
              <div className="text-base font-extrabold text-emerald-300">
                Reactivar subscrição {externalOnly && <ExternalLink size={13} className="inline opacity-80" />}
              </div>
              <p className="mt-0.5 text-xs text-emerald-200/70">Volta a ter renovação automática</p>
            </motion.button>
          )}

          {isActive && !isCancelled && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                hapticTap();
                if (billingMode === "android-play") {
                  await openInAppBrowser("https://play.google.com/store/account/subscriptions");
                  return;
                }
                if (billingMode === "ios-appstore") {
                  await openInAppBrowser(getExternalCheckoutUrl("/membership"));
                  return;
                }
                setConfirmCancel(true);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left text-white/70 backdrop-blur-xl active:bg-white/[0.06]"
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                Cancelar subscrição
                {externalOnly && <ExternalLink size={13} className="opacity-70" />}
              </div>
              <p className="mt-0.5 text-xs text-white/50">
                {billingMode === "android-play"
                  ? "Geres na Play Store → Subscrições"
                  : billingMode === "ios-appstore"
                    ? "Geres em hunie.app no browser"
                    : "Manténs acesso até ao fim do período actual"}
              </p>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              hapticTap();
              handleRestore();
            }}
            disabled={restoring}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left text-white/80 backdrop-blur-xl active:bg-white/[0.06] disabled:opacity-60"
          >
            <div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <RefreshCcw size={15} className={restoring ? "animate-spin" : ""} /> Restaurar compra
              </div>
              <p className="mt-0.5 text-xs text-white/50">
                Recupera uma subscrição comprada noutro dispositivo
              </p>
            </div>
          </motion.button>
        </section>

        {/* Referrals moved to /profile for visibility */}


        {/* Payment history */}
        <section className="mt-7">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-white/50">
            <Receipt size={13} className="shrink-0" /> <span className="truncate">Histórico de pagamentos</span>
          </h3>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center text-sm text-white/50 backdrop-blur-xl">
              Ainda não tens pagamentos.
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-xl"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <StatusIcon status={e.status} />
                      <span className="truncate">{describeEntry(e)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/50">
                      {providerLabel(e.provider)} · {formatDate(e.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold tabular-nums text-white">
                      {formatAmount(e.amount_minor, e.currency)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">
                      {e.status === "paid" ? "Pago" : e.status === "pending" ? "Pendente" : e.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-center text-[11px] text-white/40">
          Precisas de ajuda? Contacta suporte@hunie.app
        </p>
      </div>

      {/* Upgrade flow */}
      {showUpgrade && (
        <PaywallFlow
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          onSuccess={() => setShowUpgrade(false)}
        />
      )}

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="w-full max-w-md rounded-t-3xl border-t border-white/10 bg-background p-6 sm:rounded-3xl sm:border"
          >
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-amber-500/15">
              <AlertCircle size={22} className="text-amber-400" />
            </div>
            <h3 className="text-center text-xl font-black">Cancelar subscrição?</h3>
            <p className="mt-2 text-center text-sm text-white/70">
              Vais perder os benefícios {label} a {formatDate(expiresAt)}. Sem mais
              renovações automáticas.
            </p>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full rounded-2xl bg-white/10 px-5 py-3.5 text-sm font-bold text-white/90 active:scale-[0.98] disabled:opacity-60"
              >
                {cancelling ? "A cancelar..." : "Sim, cancelar"}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={cancelling}
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.98]"
              >
                Manter membership
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
