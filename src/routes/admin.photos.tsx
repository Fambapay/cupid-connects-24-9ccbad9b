import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getPhotoModerationQueue,
  moderatePhotoDelete,
  moderatePhotoDismiss,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trash2, Check, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/photos")({
  ssr: false,
  component: PhotoModerationPage,
});

function PhotoModerationPage() {
  const listFn = useServerFn(getPhotoModerationQueue);
  const delFn = useServerFn(moderatePhotoDelete);
  const dismissFn = useServerFn(moderatePhotoDismiss);
  const qc = useQueryClient();
  const [zoom, setZoom] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "photos-queue"],
    queryFn: () => listFn(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "photos-queue"] });

  const delMut = useMutation({
    mutationFn: (input: { photoId: string; reportIds: string[] }) => delFn({ data: input }),
    onSuccess: () => {
      toast.success("Foto eliminada");
      refresh();
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const dismissMut = useMutation({
    mutationFn: (reportIds: string[]) => dismissFn({ data: { reportIds } }),
    onSuccess: () => {
      toast.success("Reports descartados");
      refresh();
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Moderação de fotos</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "perfil pendente" : "perfis pendentes"} de revisão
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          Sem fotos para moderar 🎉
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const reportIds = item.reports.map((r: any) => r.id);
            return (
              <li key={item.profile.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/admin/users/$id"
                        params={{ id: item.profile.id }}
                        className="font-medium underline decoration-dotted"
                      >
                        {item.profile.name ?? item.profile.id.slice(0, 8)}
                        {item.profile.age ? `, ${item.profile.age}` : ""}
                      </Link>
                      {item.profile.is_paused && <Badge variant="destructive">Pausado</Badge>}
                      {item.profile.is_verified && <Badge variant="secondary">Verificado</Badge>}
                      <Badge variant="outline">{item.reports.length} report{item.reports.length === 1 ? "" : "s"}</Badge>
                    </div>
                    {item.profile.city && (
                      <p className="text-xs text-muted-foreground">{item.profile.city}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={dismissMut.isPending}
                      onClick={() => dismissMut.mutate(reportIds)}
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Aprovar todas
                    </Button>
                  </div>
                </div>

                {item.reports.some((r: any) => r.details) && (
                  <div className="mb-3 rounded-md bg-muted/50 p-3 text-xs">
                    {item.reports.filter((r: any) => r.details).map((r: any) => (
                      <p key={r.id} className="whitespace-pre-wrap">
                        <span className="text-muted-foreground">Detalhe: </span>{r.details}
                      </p>
                    ))}
                  </div>
                )}

                {item.photos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem fotos para mostrar.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {item.photos.map((p: any) => (
                      <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                        <button
                          type="button"
                          onClick={() => p.url && setZoom(p.url)}
                          className="block aspect-[3/4] w-full"
                        >
                          {p.url ? (
                            <img
                              src={p.url}
                              alt={`Foto ${p.position}`}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                              Sem preview
                            </div>
                          )}
                        </button>
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <span className="text-[11px] font-medium text-white">#{p.position}</span>
                          <div className="flex gap-1">
                            {p.url && (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md bg-white/20 p-1 text-white backdrop-blur hover:bg-white/30"
                                aria-label="Abrir"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={delMut.isPending}
                              onClick={() => {
                                if (confirm("Eliminar esta foto?")) {
                                  delMut.mutate({ photoId: p.id, reportIds });
                                }
                              }}
                              className="rounded-md bg-red-500/90 p-1 text-white hover:bg-red-500 disabled:opacity-50"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="Preview" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
