import { useState } from "react";
import { motion } from "framer-motion";
import { Plane, X, MapPin, Loader2, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useServerFn } from "@tanstack/react-start";
import { setPassport, clearPassport } from "@/lib/passport.functions";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

type City = { name: string; country: string; lat: number; lng: number };

const CITIES: City[] = [
  { name: "Maputo", country: "Moçambique", lat: -25.9692, lng: 32.5732 },
  { name: "Luanda", country: "Angola", lat: -8.8390, lng: 13.2894 },
  { name: "Beira", country: "Moçambique", lat: -19.8437, lng: 34.8389 },
  { name: "Nampula", country: "Moçambique", lat: -15.1165, lng: 39.2666 },
  { name: "Lisboa", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  { name: "Porto", country: "Portugal", lat: 41.1579, lng: -8.6291 },
  { name: "Joanesburgo", country: "África do Sul", lat: -26.2041, lng: 28.0473 },
  { name: "Cape Town", country: "África do Sul", lat: -33.9249, lng: 18.4241 },
  { name: "Londres", country: "Reino Unido", lat: 51.5074, lng: -0.1278 },
  { name: "Paris", country: "França", lat: 48.8566, lng: 2.3522 },
  { name: "Nova Iorque", country: "EUA", lat: 40.7128, lng: -74.0060 },
  { name: "Dubai", country: "EAU", lat: 25.2048, lng: 55.2708 },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PassportSheet({ open, onClose }: Props) {
  const { toast } = useToast();
  const { profile, refresh } = useProfile();
  const doSet = useServerFn(setPassport);
  const doClear = useServerFn(clearPassport);
  const [saving, setSaving] = useState<string | null>(null);

  const activeCity = (profile as { passport_city?: string | null } | null)?.passport_city ?? null;
  const passportExp = (profile as { passport_expires_at?: string | null } | null)?.passport_expires_at ?? null;
  const isActive = !!activeCity && !!passportExp && new Date(passportExp).getTime() > Date.now();

  async function pick(city: City) {
    setSaving(city.name);
    try {
      const res = await doSet({ data: { city: city.name, lat: city.lat, lng: city.lng } });
      if (!res?.success) {
        toast({
          title: res?.reason === "tier_required" ? "Só Plus ou Elite" : "Não foi possível",
          description: res?.reason === "tier_required"
            ? "Faz upgrade para viajar para outra cidade."
            : "Tenta de novo daqui a pouco.",
          variant: "destructive",
        });
        return;
      }
      await refresh?.();
      toast({ title: `Passport ativo em ${city.name}`, description: "Válido por 24 horas." });
      onClose();
    } catch {
      toast({ title: "Erro", description: "Não foi possível ativar o Passport.", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function clear() {
    setSaving("__clear__");
    try {
      await doClear();
      await refresh?.();
      toast({ title: "Passport desativado", description: "Voltas a ver perfis à tua volta." });
      onClose();
    } finally {
      setSaving(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-border bg-background p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-purple/15">
                <Plane className="h-4 w-4 text-brand-purple" />
              </div>
              <div>
                <SheetTitle className="text-left text-[18px] font-extrabold">Passport</SheetTitle>
                <SheetDescription className="text-left text-[12px] text-muted-foreground">
                  Vê perfis noutra cidade por 24 horas.
                </SheetDescription>
              </div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {isActive && (
          <div className="mx-5 mb-3 flex items-center justify-between rounded-2xl border border-brand-purple/30 bg-brand-purple/10 px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-purple">Ativo</div>
              <div className="text-[15px] font-bold text-foreground">{activeCity}</div>
              <div className="text-[11px] text-muted-foreground">
                Até {new Date(passportExp!).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <button
              disabled={saving === "__clear__"}
              onClick={clear}
              className="rounded-full bg-background px-4 py-2 text-[13px] font-semibold text-foreground disabled:opacity-60"
            >
              {saving === "__clear__" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Voltar"}
            </button>
          </div>
        )}

        <div className="max-h-[calc(85vh-160px)] overflow-y-auto px-5 pb-8">
          <div className="grid grid-cols-1 gap-2">
            {CITIES.map((c) => {
              const busy = saving === c.name;
              const selected = activeCity === c.name && isActive;
              return (
                <motion.button
                  key={`${c.name}-${c.country}`}
                  whileTap={{ scale: 0.98 }}
                  disabled={busy}
                  onClick={() => pick(c)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected ? "border-brand-purple/60 bg-brand-purple/10" : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-foreground">{c.name}</div>
                      <div className="text-[12px] text-muted-foreground">{c.country}</div>
                    </div>
                  </div>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
                  ) : selected ? (
                    <Check className="h-4 w-4 text-brand-purple" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            O Passport dura 24 horas. Podes trocar de cidade sempre que quiseres.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
