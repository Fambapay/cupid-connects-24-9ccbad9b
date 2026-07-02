import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOfferFunnel } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/offers")({
  component: AdminOffers,
});

function fmtMoney(minor: number, currency: string) {
  return `${(minor / 100).toFixed(0)} ${currency}`;
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function AdminOffers() {
  const fn = useServerFn(getOfferFunnel);
  const q = useQuery({
    queryKey: ["admin-offer-funnel"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const rows = q.data ?? [];
  const totals = rows.reduce(
    (acc, r) => {
      acc.shown += r.impressions_shown;
      acc.clicked += r.impressions_clicked_cta;
      acc.started += r.redemptions_started;
      acc.paid += r.redemptions_paid;
      return acc;
    },
    { shown: 0, clicked: 0, started: 0, paid: 0 },
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Funil de ofertas</h1>
        <p className="text-sm text-muted-foreground">
          Impressões, cliques no CTA, resgates iniciados e pagos por oferta.
        </p>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {q.error && <p className="text-sm text-red-500">{(q.error as Error).message}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Impressões</p>
          <p className="text-xl font-semibold">{totals.shown}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Cliques CTA</p>
          <p className="text-xl font-semibold">{totals.clicked}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Resgates iniciados</p>
          <p className="text-xl font-semibold">{totals.started}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Resgates pagos</p>
          <p className="text-xl font-semibold">{totals.paid}</p>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Trigger</th>
              <th className="px-3 py-2 text-right">Preço</th>
              <th className="px-3 py-2 text-right">Shown</th>
              <th className="px-3 py-2 text-right">Dismiss</th>
              <th className="px-3 py-2 text-right">CTA</th>
              <th className="px-3 py-2 text-right">CTR</th>
              <th className="px-3 py-2 text-right">Iniciados</th>
              <th className="px-3 py-2 text-right">Pagos</th>
              <th className="px-3 py-2 text-right">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.offer_id} className="border-t border-border/40">
                <td className="px-3 py-2 font-mono text-xs">{r.slug}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.trigger}</td>
                <td className="px-3 py-2 text-right">
                  {fmtMoney(r.first_period_price_minor, r.currency)}
                  <span className="ml-1 text-xs text-muted-foreground line-through">
                    {fmtMoney(r.regular_price_minor, r.currency)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{r.impressions_shown}</td>
                <td className="px-3 py-2 text-right">{r.impressions_dismissed}</td>
                <td className="px-3 py-2 text-right">{r.impressions_clicked_cta}</td>
                <td className="px-3 py-2 text-right">{fmtPct(r.ctr)}</td>
                <td className="px-3 py-2 text-right">{r.redemptions_started}</td>
                <td className="px-3 py-2 text-right font-semibold">{r.redemptions_paid}</td>
                <td className="px-3 py-2 text-right">{fmtPct(r.conversion_rate)}</td>
              </tr>
            ))}
            {rows.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Sem dados ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
