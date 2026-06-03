import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signPhotos } from "@/lib/photos";

interface BlockedRow {
  id: string;
  blocked_id: string;
  created_at: string;
  name: string;
  photo: string;
}

export function BlockedUsersModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: blocks } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      const list = blocks ?? [];
      if (!list.length) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const ids = list.map((b) => b.blocked_id as string);
      const [{ data: profiles }, { data: photos }] = await Promise.all([
        supabase.from("profiles").select("id,name").in("id", ids),
        supabase
          .from("profile_photos")
          .select("profile_id,storage_path,position")
          .in("profile_id", ids)
          .order("position", { ascending: true }),
      ]);

      const nameById = new Map<string, string>();
      (profiles ?? []).forEach((p) => nameById.set(p.id as string, (p.name as string) ?? "Alguém"));

      const firstPath: Record<string, string> = {};
      (photos ?? []).forEach((p) => {
        const pid = p.profile_id as string;
        if (!firstPath[pid]) firstPath[pid] = p.storage_path as string;
      });
      const paths = ids.map((id) => firstPath[id]).filter(Boolean);
      const signed = await signPhotos(paths, 3600, { width: 80, height: 80, resize: "cover", quality: 60 });
      const urlByPath: Record<string, string> = {};
      paths.forEach((p, i) => (urlByPath[p] = signed[i] ?? ""));

      if (cancelled) return;
      setRows(
        list.map((b) => {
          const id = b.blocked_id as string;
          return {
            id: b.id as string,
            blocked_id: id,
            created_at: b.created_at as string,
            name: nameById.get(id) ?? "Alguém",
            photo: firstPath[id] ? urlByPath[firstPath[id]] : "",
          };
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const unblock = async (id: string) => {
    await supabase.from("blocked_users").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Utilizadores bloqueados</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Não tens ninguém bloqueado.</p>
        ) : (
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {r.photo ? (
                    <img src={r.photo} alt={r.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-flame" />
                  )}
                  <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => unblock(r.id)}>
                  Desbloquear
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
