import { useState } from "react";
import { MoreVertical, Flag, Ban, HeartCrack } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  blockUser,
  reportUser,
  unmatchUser,
  type ReportReason,
} from "@/lib/moderation.functions";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "fake_profile", label: "Perfil falso" },
  { value: "inappropriate_photos", label: "Fotos inapropriadas" },
  { value: "harassment", label: "Assédio ou ameaças" },
  { value: "spam_scam", label: "Spam ou burla" },
  { value: "minor", label: "Suspeita de menor de idade" },
  { value: "offensive_behavior", label: "Comportamento ofensivo" },
  { value: "other", label: "Outro" },
];

export function ChatActionsMenu({
  matchId,
  otherUserId,
  otherName,
}: {
  matchId: string;
  otherUserId: string;
  otherName: string;
}) {
  const navigate = useNavigate();
  const unmatchFn = useServerFn(unmatchUser);
  const blockFn = useServerFn(blockUser);
  const reportFn = useServerFn(reportUser);

  const [confirmKind, setConfirmKind] = useState<"unmatch" | "block" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("fake_profile");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const handleUnmatch = async () => {
    setBusy(true);
    try {
      await unmatchFn({ data: { matchId } });
      toast.success("Match desfeito");
      navigate({ to: "/chat" });
    } catch (e) {
      toast.error("Erro", { description: String((e as Error).message) });
    } finally {
      setBusy(false);
      setConfirmKind(null);
    }
  };

  const handleBlock = async () => {
    setBusy(true);
    try {
      await blockFn({ data: { userId: otherUserId, matchId } });
      toast.success(`${otherName} foi bloqueado`);
      navigate({ to: "/chat" });
    } catch (e) {
      toast.error("Erro", { description: String((e as Error).message) });
    } finally {
      setBusy(false);
      setConfirmKind(null);
    }
  };

  const handleReport = async () => {
    setBusy(true);
    try {
      await reportFn({
        data: {
          userId: otherUserId,
          matchId,
          reason,
          details: details.trim() || undefined,
          alsoBlock: true,
        },
      });
      toast.success("Denúncia enviada", { description: "Obrigado. A nossa equipa vai rever." });
      setReportOpen(false);
      navigate({ to: "/chat" });
    } catch (e) {
      toast.error("Erro", { description: String((e as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Mais opções"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-muted active:scale-95"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-60 overflow-hidden rounded-2xl border border-border/60 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          <DropdownMenuItem
            onClick={() => setReportOpen(true)}
            className="gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-500">
              <Flag className="h-4 w-4" />
            </span>
            Denunciar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmKind("block")}
            className="gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive focus:text-destructive"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/15 text-destructive">
              <Ban className="h-4 w-4" />
            </span>
            Bloquear
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-border/60" />
          <DropdownMenuItem
            onClick={() => setConfirmKind("unmatch")}
            className="gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground/70">
              <HeartCrack className="h-4 w-4" />
            </span>
            Desfazer match
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmKind !== null} onOpenChange={(o) => !o && setConfirmKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmKind === "block" ? `Bloquear ${otherName}?` : `Desfazer match com ${otherName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmKind === "block"
                ? "Não vão poder ver-se nem enviar mensagens. O match será removido."
                : "A conversa será apagada e não voltam a ser sugeridos um ao outro num like."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                confirmKind === "block" ? handleBlock() : handleUnmatch();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar {otherName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <div className="grid gap-1.5">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition ${
                      reason === r.value ? "border-flame bg-flame/10" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="sr-only"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Detalhes (opcional)</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Conta-nos mais, se quiseres"
                maxLength={1000}
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Após a denúncia, este utilizador será também bloqueado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleReport} disabled={busy}>
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
