// Card discreto sempre presente em /membership com a oferta trimestral
// (always_on). Fetch via RPC get_eligible_offer — o servidor decide se é
// elegível; se não, nada aparece.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { getEligibleOffer, type OfferDTO } from "@/lib/offers.functions";
import { OfferSheet } from "@/components/offers/OfferSheet";

export function AlwaysOnQuarterlyCard() {
  const fetchOffer = useServerFn(getEligibleOffer);
  const [offer, setOffer] = useState<OfferDTO | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const o = await fetchOffer({ data: { trigger: "always_on" } });
        if (!cancelled) setOffer(o);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOffer]);

  if (!offer) return null;

  const priceMonthly = Math.round(offer.first_period_price_minor / (offer.period_months || 1) / 100);
  const regularMonthly = Math.round(offer.regular_price_minor / 100);
  const totalStr = `${Math.round(offer.first_period_price_minor / 100)} ${offer.currency}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/12 via-pink-500/10 to-rose-500/12 px-5 py-4 text-left backdrop-blur-xl active:scale-[0.985]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-pink-300">
            <Sparkles size={11} /> Melhor valor
          </div>
          <div className="mt-1 text-[15px] font-bold text-white">
            {offer.period_months} meses por {totalStr}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-white/60">
            Equivale a {priceMonthly} {offer.currency}/mês · poupa vs. {regularMonthly} {offer.currency}/mês
          </p>
        </div>
        <span className="shrink-0 text-lg text-white/70">→</span>
      </button>

      {sheetOpen && (
        <OfferSheet
          offer={offer}
          onDismiss={() => setSheetOpen(false)}
          onClaim={() => { /* impressão logada pelo motor no auto-flow; aqui é entry manual */ }}
          onSuccess={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
