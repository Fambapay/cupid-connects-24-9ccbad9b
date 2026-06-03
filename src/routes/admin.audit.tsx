import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAudit,
});

const PAGE = 50;

function AdminAudit() {
  const list = useServerFn(listAuditLogs);
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => list({ data: { limit: PAGE, offset: page * PAGE } }),
  });
  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Histórico de ações administrativas</p>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {q.error && <p className="text-sm text-red-500">{(q.error as Error).message}</p>}

      <div className="space-y-2">
        {(q.data?.rows ?? []).map((row) => (
          <Card key={row.id} className="p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-flame">{row.action}</p>
                <p className="text-xs text-muted-foreground">
                  por <span className="font-medium text-foreground">{row.actor_email ?? row.actor_id.slice(0, 8)}</span>
                  {row.target_id && (
                    <>
                      {" "}sobre{" "}
                      <Link to="/admin/users/$id" params={{ id: row.target_id }} className="font-medium text-foreground underline">
                        {row.target_id.slice(0, 8)}…
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{format(new Date(row.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
            </div>
            {row.meta && Object.keys(row.meta as object).length > 0 && (
              <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-[11px]">
                {JSON.stringify(row.meta, null, 2)}
              </pre>
            )}
          </Card>
        ))}
        {q.data?.rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Sem registos.</p>}
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
