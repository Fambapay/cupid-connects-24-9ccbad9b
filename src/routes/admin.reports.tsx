import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listReports, updateReportStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  component: ReportsPage,
});

const REASON_LABELS: Record<string, string> = {
  fake_profile: "Perfil falso",
  inappropriate_photos: "Fotos inapropriadas",
  harassment: "Assédio",
  spam_scam: "Spam/Burla",
  minor: "Menor de idade",
  offensive_behavior: "Ofensivo",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  reviewed: "Revista",
  dismissed: "Descartada",
  actioned: "Acionada",
};

function ReportsPage() {
  const [status, setStatus] = useState<"pending" | "reviewed" | "dismissed" | "actioned" | "all">("pending");
  const listFn = useServerFn(listReports);
  const updateFn = useServerFn(updateReportStatus);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", status],
    queryFn: () => listFn({ data: { status, limit: 100 } }),
  });

  const mut = useMutation({
    mutationFn: (input: { id: string; status: "reviewed" | "dismissed" | "actioned" }) =>
      updateFn({ data: input }),
    onSuccess: () => {
      toast.success("Denúncia atualizada");
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const reports = data?.reports ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Denúncias</h1>
          <p className="text-sm text-muted-foreground">{reports.length} resultados</p>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="reviewed">Revistas</SelectItem>
            <SelectItem value="actioned">Acionadas</SelectItem>
            <SelectItem value="dismissed">Descartadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma denúncia.
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r: any) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{REASON_LABELS[r.reason] ?? r.reason}</Badge>
                    <Badge variant={r.status === "pending" ? "default" : "outline"}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-PT")}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Denunciado:</span>{" "}
                    <a
                      href={`/admin/users/${r.reported_id}`}
                      className="font-medium underline decoration-dotted"
                    >
                      {r.reported?.name ?? r.reported_id.slice(0, 8)}
                    </a>
                    {r.reported?.is_paused && (
                      <Badge variant="destructive" className="ml-2">Pausado</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Por:{" "}
                    <a
                      href={`/admin/users/${r.reporter_id}`}
                      className="underline decoration-dotted"
                    >
                      {r.reporter?.name ?? r.reporter_id.slice(0, 8)}
                    </a>
                  </p>
                  {r.details && (
                    <p className="mt-2 max-w-2xl text-sm text-foreground/90 whitespace-pre-wrap">
                      {r.details}
                    </p>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mut.isPending}
                      onClick={() => mut.mutate({ id: r.id, status: "dismissed" })}
                    >
                      Descartar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mut.isPending}
                      onClick={() => mut.mutate({ id: r.id, status: "reviewed" })}
                    >
                      Marcar revista
                    </Button>
                    <Button
                      size="sm"
                      disabled={mut.isPending}
                      onClick={() => mut.mutate({ id: r.id, status: "actioned" })}
                    >
                      Acionar
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
