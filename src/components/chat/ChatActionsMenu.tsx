import { useState } from "react";
import { MoreVertical, Flag, Ban, HeartCrack } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { showActionSheet } from "@/lib/native/actionSheet";
import { isNative } from "@/lib/native/platform";
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

  const openNativeSheet = async () => {
    const idx = await showActionSheet({
      title: otherName,
      options: [
        { title: "Denunciar", style: "destructive" },
        { title: "Bloquear", style: "destructive" },
        { title: "Desfazer match" },
        { title: "Cancelar", style: "cancel" },
      ],
    });
    if (idx === 0) setReportOpen(true);
    else if (idx === 1) setConfirmKind("block");
    else if (idx === 2) setConfirmKind("unmatch");
  };

  return (
    <>
      {isNative() ? (
        <button
          aria-label="Mais opções"
          onClick={() => void openNativeSheet()}
          className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-muted active:scale-95"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      ) : (
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
      )}


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
        <DialogContent
          className="left-1/2 top-auto bottom-0 grid max-h-[92dvh] w-full max-w-[480px] -translate-x-1/2 translate-y-0 gap-0 overflow-hidden rounded-t-[28px] rounded-b-none border border-white/10 border-b-0 bg-[hsl(0_0%_6%/0.92)] p-0 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:rounded-t-[28px]"
        >
          <div className="flex flex-col max-h-[92dvh]">
            <DialogHeader className="relative px-6 pt-5 pb-3 text-center">
              <DialogTitle className="text-center text-[19px] font-semibold tracking-tight text-white">
                Denunciar {otherName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">
              <div className="space-y-2.5">
                <Label className="text-[13px] font-medium uppercase tracking-wider text-white/50">Motivo</Label>
                <div className="grid gap-2">
                  {REASONS.map((r) => {
                    const selected = reason === r.value;
                    return (
                      <label
                        key={r.value}
                        className={`relative flex cursor-pointer items-center gap-3 rounded-full border px-5 py-3.5 text-[15px] font-medium transition-all duration-200 active:scale-[0.98] ${
                          selected
                            ? "border-[#FF4FA3] bg-gradient-to-r from-[#FF4FA3]/15 via-[#E935A0]/10 to-[#B13CFF]/15 text-white shadow-[0_0_0_3px_rgba(255,79,163,0.12)]"
                            : "border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={selected}
                          onChange={() => setReason(r.value)}
                          className="sr-only"
                        />
                        <span>{r.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="details" className="text-[13px] font-medium uppercase tracking-wider text-white/50">
                  Detalhes (opcional)
                </Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Conta-nos mais, se quiseres"
                  maxLength={1000}
                  rows={3}
                  className="rounded-2xl border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/35 focus-visible:border-[#FF4FA3]/40 focus-visible:ring-2 focus-visible:ring-[#FF4FA3]/20"
                />
              </div>
              <p className="text-center text-[12px] text-white/45">
                Após a denúncia, este utilizador será também bloqueado.
              </p>
            </div>
            <div className="flex flex-col gap-1 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <Button
                onClick={handleReport}
                disabled={busy}
                className="h-12 w-full rounded-full bg-gradient-to-r from-[#FF4FA3] via-[#E935A0] to-[#B13CFF] text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,79,163,0.6)] transition-all hover:opacity-95 active:scale-[0.98]"
              >
                Enviar denúncia
              </Button>
              <Button
                variant="ghost"
                onClick={() => setReportOpen(false)}
                disabled={busy}
                className="h-11 w-full rounded-full text-[15px] font-medium text-white/70 hover:bg-white/[0.04] hover:text-white"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
