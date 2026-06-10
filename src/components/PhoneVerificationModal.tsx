import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/lib/country/context";

export function PhoneVerificationModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, updateProfile } = useProfile();
  const { config } = useCountry();
  const { toast } = useToast();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ phone });
      toast({ title: "Telefone guardado" });
      onOpenChange(false);
    } catch {
      toast({ title: "Erro", description: "Não foi possível guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar telefone</DialogTitle>
          <DialogDescription>
            Um telefone verificado ajuda a recuperar a tua conta.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="tel"
          placeholder={`${config.phonePrefix} ${config.phoneExample}`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button onClick={save} disabled={saving || !phone} className="w-full">
          {saving ? "A guardar…" : "Guardar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
