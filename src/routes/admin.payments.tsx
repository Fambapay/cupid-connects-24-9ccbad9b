import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPayments } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

const PAGE = 30;
const STATUSES = ["all", "pending", "paid", "failed", "expired"];

function AdminPayments() {
  const list = useServerFn(listPayments);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["admin-payments", status, page],
    queryFn: () => list({ data: { status, limit: PAGE, offset: page * PAGE } }),
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE));
  const totalAmount = (q.data?.rows ?? [])
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          {(q.data?.total ?? 0).toLocaleString("pt-PT")} no total · página atual: {totalAmount.toLocaleString("pt-PT")} MZN
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(0); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === s ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {q.error && <p className="text-sm text-red-500">{(q.error as Error).message}</p>}

      <div className="space-y-2">
        {(q.data?.rows ?? []).map((p) => (
          <Card key={p.id} className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {Number(p.amount).toLocaleString("pt-PT")} {p.currency}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p.kind === "plan" ? `· plano ${p.plan_tier ?? ""}` : `· pack ${p.pack_kind} ×${p.pack_quantity}`}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.payment_method} · {p.phone_last4 ? "***" + p.phone_last4 : "—"} · {format(new Date(p.created_at), "dd/MM HH:mm")}
                </p>
                {p.debito_reference && <p className="truncate text-[11px] text-muted-foreground">ref: {p.debito_reference}</p>}
              </div>
              <Badge variant={p.status === "paid" ? "default" : p.status === "pending" ? "secondary" : "destructive"}>
                {p.status}
              </Badge>
            </div>
          </Card>
        ))}
        {q.data?.rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Sem pagamentos.</p>}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Anterior
        </Button>
        <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
