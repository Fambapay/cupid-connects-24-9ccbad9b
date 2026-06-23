import { useState, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Flag, HeartCrack } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/hooks/use-toast";
import { unmatchUser, reportUser, type ReportReason } from "@/lib/moderation.functions";
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

const SWIPE_THRESHOLD = -90;
const ACTION_WIDTH = 180;

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "fake_profile", label: "Perfil falso" },
  { value: "inappropriate_photos", label: "Fotos inapropriadas" },
  { value: "harassment", label: "Assédio ou ameaças" },
  { value: "spam_scam", label: "Spam ou burla" },
  { value: "minor", label: "Suspeita de menor de idade" },
  { value: "offensive_behavior", label: "Comportamento ofensivo" },
  { value: "other", label: "Outro" },
];

interface Props {
  matchId: string;
  otherId: string;
  name: string;
  photo: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unread?: number;
  onActionTaken?: () => void;
}

export function SwipeableConversationItem({
  matchId,
  otherId,
  name,
  photo,
  lastMessage,
  lastMessageAt,
  unread = 0,
  onActionTaken,
}: Props) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-ACTION_WIDTH, 0], [1, 0]);
  const [open, setOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"unmatch" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("fake_profile");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLLIElement>(null);
  const unmatchFn = useServerFn(unmatchUser);
  const reportFn = useServerFn(reportUser);

  const snapOpen = useCallback(() => {
    animate(x, -ACTION_WIDTH, { type: "spring", stiffness: 300, damping: 30 });
    setOpen(true);
  }, [x]);

  const snapClose = useCallback(() => {
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    setOpen(false);
  }, [x]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      if (offset < SWIPE_THRESHOLD || velocity < -500) {
        snapOpen();
      } else {
        snapClose();
      }
    },
    [snapOpen, snapClose],
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (open) {
        e.preventDefault();
        snapClose();
      }
    },
    [open, snapClose],
  );

  const handleUnmatch = async () => {
    setBusy(true);
    try {
      await unmatchFn({ data: { matchId } });
      toast.success("Match desfeito");
      onActionTaken?.();
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
          userId: otherId,
          matchId,
          reason,
          details: details.trim() || undefined,
          alsoBlock: true,
        },
      });
      toast.success("Denúncia enviada", { description: "Obrigado. A nossa equipa vai rever." });
      setReportOpen(false);
      onActionTaken?.();
    } catch (e) {
      toast.error("Erro", { description: String((e as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Actions layer (behind) */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-y-0 right-0 flex w-[180px] items-stretch"
      >
        <button
          onClick={() => {
            snapClose();
            setReportOpen(true);
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-amber-500 text-white"
        >
          <Flag className="h-5 w-5" />
          <span className="text-[11px] font-semibold tracking-wide">Reportar</span>
        </button>
        <button
          onClick={() => {
            snapClose();
            setConfirmKind("unmatch");
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-red-500 text-white"
        >
          <HeartCrack className="h-5 w-5" />
          <span className="text-[11px] font-semibold tracking-wide">Unmatch</span>
        </button>
      </motion.div>

      {/* Content layer (front) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 touch-pan-y"
      >
        <Link
          to="/chat/$matchId"
          params={{ matchId }}
          onClick={handleRowClick}
          className="flex items-center gap-3.5 border-b border-border bg-background px-1 py-3 active:bg-muted"
        >
          <div className="relative h-[62px] w-[62px] shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full">
              {photo ? (
                <img src={photo} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-flame" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className="truncate text-[19px] leading-none tracking-tight text-foreground"
                style={{ fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif", fontWeight: 600 }}
              >
                {name}
              </span>
              {unread > 0 && (
                <span
                  aria-label={`${unread} novas mensagens`}
                  className="ml-2 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.55)]"
                />
              )}
            </div>
            <p
              className={`mt-0.5 truncate text-[14px] ${unread > 0 ? "text-foreground/90" : "text-muted-foreground"}`}
            >
              {lastMessage ?? "Diz olá 👋"}
            </p>
          </div>
        </Link>


      </motion.div>

      <AlertDialog open={confirmKind !== null} onOpenChange={(o) => !o && setConfirmKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer match com {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa será apagada e não voltam a ser sugeridos um ao outro num like.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                handleUnmatch();
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
            <DialogTitle>Denunciar {name}</DialogTitle>
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
    </li>
  );
}
