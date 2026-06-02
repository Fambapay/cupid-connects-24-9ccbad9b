import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Camera, CheckCircle2, Loader2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  submitVerification,
  VERIFICATION_POSES,
  pickRandomPose,
  type PoseCode,
} from "@/lib/verification.functions";

type Stage = "intro" | "capture" | "uploading" | "analyzing" | "result";
type Result = {
  approved: boolean;
  score: number;
  reason: string;
  checks: { same_person: boolean; pose_correct: boolean; live_selfie: boolean };
};

export function VerificationModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}) {
  const { user } = useAuth();
  const submit = useServerFn(submitVerification);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("intro");
  const [pose, setPose] = useState<PoseCode>(() => pickRandomPose());
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poseLabel = useMemo(() => VERIFICATION_POSES[pose], [pose]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStage("intro");
        setPreview(null);
        setFile(null);
        setResult(null);
        setError(null);
        setPose(pickRandomPose());
      }, 200);
    }
  }, [open]);

  const handleSelectFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Ficheiro inválido", description: "Tem de ser uma imagem.", variant: "destructive" });
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 8 MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStage("capture");
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setError(null);
    setStage("uploading");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("verification-selfies")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      setStage("analyzing");
      const res = (await submit({ data: { selfie_path: path, pose_code: pose } })) as Result;
      setResult(res);
      setStage("result");

      if (res.approved) {
        onConfirm?.();
        toast({ title: "Perfil verificado ✓", description: "Já tens o emblema azul." });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      setError(msg);
      setStage("capture");
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const retake = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStage("intro");
    setPose(pickRandomPose());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-brand-purple" />
            Verificar perfil
          </DialogTitle>
          <DialogDescription>
            Confirmamos que és tu na foto comparando uma selfie com as fotos do teu perfil.
          </DialogDescription>
        </DialogHeader>

        {stage === "intro" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
              <p className="font-medium">Para começar, tira uma selfie com esta pose:</p>
              <p className="text-base font-semibold text-brand-purple">{poseLabel}</p>
              <ul className="text-xs text-muted-foreground space-y-1 pt-2">
                <li>• Cara bem iluminada e visível</li>
                <li>• Sem óculos escuros nem chapéu</li>
                <li>• Foto tirada agora (não da galeria)</li>
              </ul>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
            />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
              <Camera className="w-4 h-4" />
              Tirar selfie
            </Button>
          </div>
        )}

        {stage === "capture" && preview && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-black aspect-square">
              <img src={preview} alt="selfie" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Pose pedida: <span className="font-medium text-foreground">{poseLabel}</span>
            </p>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={retake} className="flex-1 gap-2">
                <RefreshCw className="w-4 h-4" /> Repetir
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                Enviar
              </Button>
            </div>
          </div>
        )}

        {(stage === "uploading" || stage === "analyzing") && (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
            <p className="text-sm text-muted-foreground">
              {stage === "uploading" ? "A enviar selfie…" : "A analisar com IA…"}
            </p>
          </div>
        )}

        {stage === "result" && result && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 flex items-start gap-3 ${result.approved ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
              {result.approved ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">
                  {result.approved ? "Verificado ✓" : "Não aprovado"}
                </p>
                <p className="text-xs text-muted-foreground">{result.reason}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Check label="Mesma pessoa" ok={result.checks.same_person} />
              <Check label="Pose correta" ok={result.checks.pose_correct} />
              <Check label="Selfie real" ok={result.checks.live_selfie} />
            </div>

            {result.approved ? (
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Fechar
              </Button>
            ) : (
              <Button onClick={retake} className="w-full gap-2">
                <RefreshCw className="w-4 h-4" /> Tentar de novo
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${ok ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
      {ok ? <CheckCircle2 className="w-4 h-4 mx-auto mb-1" /> : <XCircle className="w-4 h-4 mx-auto mb-1" />}
      <p className="text-[10px] leading-tight">{label}</p>
    </div>
  );
}
