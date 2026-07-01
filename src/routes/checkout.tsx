import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";
import { CheckoutContent } from "@/components/checkout/CheckoutContent";

const checkoutSearchSchema = z.object({
  title: z.string().default("Checkout"),
  subtitle: z.string().default("Confirma o teu pagamento"),
  amount: z.coerce.number().default(0),
  packId: z.string().optional(),
  planTier: z.enum(["select", "plus", "elite"]).optional(),
  billingPeriod: z.enum(["monthly", "annual"]).optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: checkoutSearchSchema,
  head: () => ({
    meta: [
      { title: "Checkout — Hunie" },
      { name: "description", content: "Finaliza a tua compra em segurança." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate();

  const goBack = () => {
    if (search.returnTo) {
      navigate({ to: search.returnTo });
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/profile" });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[image:var(--checkout-sheet-bg,var(--surface-1))] text-foreground">
      <div
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--surface-border)] bg-[var(--surface-1)]/85 px-4 backdrop-blur-md"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)", paddingBottom: 12 }}
      >
        <button
          onClick={goBack}
          className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-3)] text-foreground active:scale-95 transition-transform"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Checkout seguro</p>
          <p className="truncate text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck size={11} className="text-emerald-400" /> Pagamento encriptado
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="mx-auto w-full max-w-lg px-5 pt-5"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <CheckoutContent
          title={search.title}
          subtitle={search.subtitle}
          amountMzn={search.amount}
          packId={search.packId}
          planTier={search.planTier}
          billingPeriod={search.billingPeriod}
          onClose={goBack}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
          }}
          hideClose
        />
      </motion.div>
    </div>
  );
}
