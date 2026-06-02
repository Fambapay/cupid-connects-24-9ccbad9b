import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BadgeCheck } from "lucide-react";

export function VerificationModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-brand-purple" />
            Verificar perfil
          </DialogTitle>
          <DialogDescription>
            A verificação confirma que és tu na foto. Tira uma selfie a seguir as poses pedidas.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => { onConfirm?.(); onOpenChange(false); }} className="w-full">
          Começar verificação
        </Button>
      </DialogContent>
    </Dialog>
  );
}
