import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listUsers, exportUsersCsv } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

const PAGE = 25;

function AdminUsers() {
  const list = useServerFn(listUsers);
  const exportCsv = useServerFn(exportUsersCsv);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "premium" | "paused">("all");
  const [page, setPage] = useState(0);

  const q = useQuery({
    queryKey: ["admin-users", search, filter, page],
    queryFn: () => list({ data: { search, filter, limit: PAGE, offset: page * PAGE } }),
  });

  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  const handleExport = async () => {
    const res = await exportCsv();
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Utilizadores</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString("pt-PT")} no total</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Pesquisar por nome…"
              className="pl-9"
            />
          </div>
          {(["all", "verified", "premium", "paused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === f ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70"
              }`}
            >
              {f === "all" ? "Todos" : f === "verified" ? "Verificados" : f === "premium" ? "Premium" : "Pausados"}
            </button>
          ))}
        </div>
      </Card>

      {q.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {q.error && <p className="text-sm text-red-500">{(q.error as Error).message}</p>}

      <div className="space-y-2">
        {(q.data?.rows ?? []).map((u) => (
          <Link
            key={u.id}
            to="/admin/users/$id"
            params={{ id: u.id }}
            className="block"
          >
            <Card className="flex flex-wrap items-center gap-3 p-3 transition hover:bg-muted/40">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-flame text-flame-foreground text-sm font-bold">
                {(u.name?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{u.name ?? "Sem nome"}</p>
                  {u.is_verified && <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">verified</Badge>}
                  {u.membership_status === "active" && <Badge className="bg-gradient-flame text-flame-foreground">{u.membership_tier}</Badge>}
                  {u.is_paused && <Badge variant="destructive">pausado</Badge>}
                  {!u.onboarding_completed && <Badge variant="outline">onboarding</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email ?? "—"} · {u.age ?? "?"} · {u.city ?? "?"}
                </p>
              </div>
              <div className="hidden text-right text-xs text-muted-foreground md:block">
                {u.last_active_at
                  ? `Ativo ${formatDistanceToNow(new Date(u.last_active_at), { locale: pt, addSuffix: true })}`
                  : "Nunca ativo"}
              </div>
            </Card>
          </Link>
        ))}
        {q.data?.rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum utilizador encontrado.</p>}
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
