import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BlockedRow { id: string; blocked_id: string; created_at: string }

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
    setLoading(true);
    supabase
      .from("blocked_users")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as BlockedRow[]);
        setLoading(false);
      });
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
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <span className="text-sm text-foreground font-mono truncate">{r.blocked_id.slice(0, 8)}…</span>
                <Button size="sm" variant="ghost" onClick={() => unblock(r.id)}>Desbloquear</Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
