import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Flag, Ban, HeartCrack } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/hooks/use-toast";
import { unmatchUser, blockUser } from "@/lib/moderation.functions";
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
import { ReportDialog } from "./ReportDialog";

const SWIPE_THRESHOLD = -80;
const ACTION_WIDTH = 160;

interface Props {
  matchId: string;
  otherId: string;
  name: string;
  photo: string;
  lastMessage: string | null;
  lastMessageAt: string;
  onActionTaken?: () => void;
}

export function SwipeableConversationItem({
  matchId,
  otherId,
  name,
  photo,
  lastMessage,
  lastMessageAt,
  onActionTaken,
}: Props) {
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-ACTION_WIDTH, 0], [1, 0]);
  const [open, setOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"unmatch" | "block" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLLIElement>(null);
  const unmatchFn = useServerFn(unmatchUser);
  const blockFn = useServerFn(blockUser);

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

  const handleBlock = async () => {
    setBusy(true);
    try {
      await blockFn({ data: { userId: otherId, matchId } });
      toast.success(`${name} foi bloqueado`);
      onActionTaken?.();
    } catch (e) {
      toast.error("Erro", { description: String((e as Error).message) });
    } finally {
      setBusy(false);
      setConfirmKind(null);
    }
  };

  const handleReportDone = () => {
    setReportOpen(false);
    onActionTaken?.();
  };

  return (
    <li ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Actions layer (behind) */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-y-0 right-0 flex w-[160px] items-stretch"
      >
        <button
          onClick={() => {
            snapClose();
            setReportOpen(true);
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-amber-500 text-white"
        >
          <Flag className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Denunciar</span>
        </button>
        <button
          onClick={() => {
            snapClose();
            setConfirmKind("block");
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-red-500 text-white"
        >
          <Ban className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Bloquear</span>
        </button>
        <button
          onClick={() => {
            snapClose();
            setConfirmKind("unmatch");
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-muted-foreground text-white"
        >
          <HeartCrack className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Unmatch</span>
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
          className="flex items-center gap-3 rounded-2xl bg-background px-2 py-2.5 hover:bg-muted/60 active:bg-muted"
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-flame/40">
            {photo ? (
              <img src={photo} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-flame" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{name}</span>
              <span className="text-xs text-muted-foreground">{lastMessageAt}</span>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {lastMessage ?? "Diz olá 👋"}
            </p>
          </div>
        </Link>
      </motion.div>

      <AlertDialog open={confirmKind !== null} onOpenChange={(o) => !o && setConfirmKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmKind === "block" ? `Bloquear ${name}?` : `Desfazer match com ${name}?`}
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

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        matchId={matchId}
        userId={otherId}
        userName={name}
        onReported={handleReportDone}
      />
    </li>
  );
}
