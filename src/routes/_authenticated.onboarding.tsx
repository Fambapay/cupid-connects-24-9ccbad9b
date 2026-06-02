import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, MapPin, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Bem-vindo — Hunie" }],
  }),
  component: OnboardingPage,
});

type Gender = "woman" | "man" | "nonbinary" | "other";
type Step =
  | "name"
  | "birthdate"
  | "gender"
  | "interests"
  | "location"
  | "photos"
  | "bio"
  | "done";

const STEPS: Step[] = [
  "name",
  "birthdate",
  "gender",
  "interests",
  "location",
  "photos",
  "bio",
  "done",
];

const PROMPTS = [
  "Um domingo perfeito é…",
  "O meu vício mais inofensivo é…",
  "Não me convidem para…",
  "Aposto que sou melhor que tu a…",
  "A melhor viagem que fiz foi…",
];

function OnboardingPage() {
  const { user } = useAuth();
  const { profile, reload } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const step = STEPS[stepIdx];

  // form state
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);

  const { photos, upload, remove, loading: uploading } = usePhotoUpload();
  const { requestPermission, loading: geoLoading, permissionState } =
    useGeolocation();

  // hydrate from profile
  useEffect(() => {
    if (!profile) return;
    setName((n) => n || profile.name || "");
    setCity((c) => c || profile.city || "");
    setBio((b) => b || profile.bio || "");
  }, [profile]);

  const age = useMemo(() => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (!y || !m || !d) return null;
    const dob = new Date(y, m - 1, d);
    if (Number.isNaN(dob.getTime())) return null;
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }, [day, month, year]);

  const canNext = (() => {
    switch (step) {
      case "name":
        return name.trim().length >= 2;
      case "birthdate":
        return age !== null && age >= 18 && age <= 120;
      case "gender":
        return !!gender;
      case "interests":
        return interestedIn.length > 0;
      case "location":
        return city.trim().length >= 2;
      case "photos":
        return photos.length >= 2;
      case "bio":
        return true;
      case "done":
        return true;
    }
  })();

  const persistStep = async () => {
    if (!user) return;
    const patch: Record<string, unknown> = {};
    switch (step) {
      case "name":
        patch.name = name.trim();
        break;
      case "birthdate":
        if (age != null) {
          patch.age = age;
          const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          patch.birthdate = iso;
        }
        break;
      case "gender":
        patch.gender = gender;
        break;
      case "interests":
        patch.interested_in = interestedIn;
        break;
      case "location":
        patch.city = city.trim();
        break;
      case "bio":
        patch.bio = [bio.trim(), prompt ? `\n\n✨ ${prompt}` : ""]
          .filter(Boolean)
          .join("");
        break;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("profiles").update(patch).eq("id", user.id);
    }
  };

  const handleNext = async () => {
    if (!canNext) return;
    try {
      await persistStep();
      if (stepIdx < STEPS.length - 1) {
        setDir(1);
        setStepIdx((i) => i + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tenta de novo";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const handleBack = () => {
    if (stepIdx === 0) return;
    setDir(-1);
    setStepIdx((i) => i - 1);
  };

  const finish = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    await reload();
    navigate({ to: "/" });
  };

  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-90" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "var(--brand-pink)" }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0], opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        animate={{ x: [0, -25, 0], y: [0, -15, 0], opacity: [0.16, 0.26, 0.16] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex min-h-[100dvh] flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 pt-5">
          <button
            onClick={handleBack}
            disabled={stepIdx === 0 || step === "done"}
            aria-label="Voltar"
            className="grid h-9 w-9 place-items-center rounded-full glass disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-sunset"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {stepIdx + 1}/{STEPS.length}
          </span>
        </div>

        {/* Steps */}
        <div className="relative flex-1 px-5 pt-8 pb-32">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 40 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="mx-auto w-full max-w-md"
            >
              {step === "name" && (
                <StepShell
                  title="Como te chamas?"
                  hint="Este é o nome que vai aparecer no teu perfil."
                >
                  <Input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="O teu nome"
                    className="h-14 rounded-2xl bg-white/5 text-lg"
                    maxLength={40}
                  />
                </StepShell>
              )}

              {step === "birthdate" && (
                <StepShell
                  title="Quando fazes anos?"
                  hint="Tens de ter pelo menos 18."
                >
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      placeholder="DD"
                      maxLength={2}
                      value={day}
                      onChange={(e) =>
                        setDay(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-14 rounded-2xl bg-white/5 text-center text-lg"
                    />
                    <Input
                      inputMode="numeric"
                      placeholder="MM"
                      maxLength={2}
                      value={month}
                      onChange={(e) =>
                        setMonth(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-14 rounded-2xl bg-white/5 text-center text-lg"
                    />
                    <Input
                      inputMode="numeric"
                      placeholder="AAAA"
                      maxLength={4}
                      value={year}
                      onChange={(e) =>
                        setYear(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-14 rounded-2xl bg-white/5 text-center text-lg"
                    />
                  </div>
                  {age !== null && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {age >= 18
                        ? `Tens ${age} anos.`
                        : "Tens de ter pelo menos 18 anos."}
                    </p>
                  )}
                </StepShell>
              )}

              {step === "gender" && (
                <StepShell title="Como te identificas?">
                  <ChipGrid
                    options={GENDER_OPTIONS}
                    value={gender ? [gender] : []}
                    onChange={(v) => setGender((v[0] as Gender) ?? null)}
                  />
                </StepShell>
              )}

              {step === "interests" && (
                <StepShell
                  title="Quem queres conhecer?"
                  hint="Podes escolher mais que um."
                >
                  <ChipGrid
                    multi
                    options={GENDER_OPTIONS}
                    value={interestedIn}
                    onChange={(v) => setInterestedIn(v as Gender[])}
                  />
                </StepShell>
              )}

              {step === "location" && (
                <StepShell
                  title="Onde estás?"
                  hint="Vamos mostrar pessoas perto de ti."
                >
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className="h-14 rounded-2xl bg-white/5 text-lg"
                  />
                  <button
                    type="button"
                    onClick={requestPermission}
                    disabled={geoLoading}
                    className="mt-3 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm hover:bg-white/10"
                  >
                    <MapPin className="h-4 w-4" />
                    {permissionState === "granted"
                      ? "Localização ativa"
                      : geoLoading
                        ? "A obter…"
                        : "Usar a minha localização"}
                  </button>
                </StepShell>
              )}

              {step === "photos" && (
                <StepShell
                  title="Adiciona fotos"
                  hint="Mínimo 2. A primeira é a principal."
                >
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const p = photos[i];
                      return (
                        <div
                          key={i}
                          className={cn(
                            "relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10",
                            p ? "bg-white/5" : "bg-white/[0.03]",
                          )}
                        >
                          {p ? (
                            <>
                              <img
                                src={p.url}
                                alt={`Foto ${i + 1}`}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                aria-label="Remover foto"
                                onClick={() => remove(p.id)}
                                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              {i === 0 && (
                                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-gradient-sunset px-2 py-0.5 text-[10px] font-semibold text-white">
                                  Principal
                                </span>
                              )}
                            </>
                          ) : (
                            <label className="absolute inset-0 grid cursor-pointer place-items-center text-muted-foreground hover:bg-white/5">
                              <Plus className="h-6 w-6" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploading}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    await upload(file);
                                  } catch (err: unknown) {
                                    const msg =
                                      err instanceof Error
                                        ? err.message
                                        : "Falha no upload";
                                    toast({
                                      title: "Erro",
                                      description: msg,
                                      variant: "destructive",
                                    });
                                  }
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Camera className="h-3.5 w-3.5" /> {photos.length}/6 fotos
                  </p>
                </StepShell>
              )}

              {step === "bio" && (
                <StepShell
                  title="Conta um pouco sobre ti"
                  hint="Opcional — mas torna o teu perfil 3x mais atrativo."
                >
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 300))}
                    placeholder="Sou apaixonado por…"
                    rows={4}
                    className="rounded-2xl bg-white/5 text-base"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {bio.length}/300
                  </p>
                  <p className="mt-5 mb-2 text-sm font-medium">
                    Escolhe um prompt (opcional)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setPrompt((cur) => (cur === p ? null : p))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-all active:scale-95",
                          prompt === p
                            ? "border-transparent bg-gradient-sunset text-white"
                            : "border-white/15 bg-white/5 text-muted-foreground hover:bg-white/10",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </StepShell>
              )}

              {step === "done" && <DoneStep onFinish={finish} name={name} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky CTA */}
        {step !== "done" && (
          <div className="fixed inset-x-0 bottom-0 z-10 px-5 pb-6 pt-3">
            <div className="mx-auto max-w-md">
              <Button
                onClick={handleNext}
                disabled={!canNext}
                className={cn(
                  "h-14 w-full rounded-full text-base font-semibold transition-all",
                  "bg-gradient-sunset text-white shadow-glow",
                  "disabled:bg-white/10 disabled:bg-none disabled:text-muted-foreground disabled:shadow-none",
                )}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {hint && (
        <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
      )}
      <div className="mt-8">{children}</div>
    </div>
  );
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "woman", label: "Mulher" },
  { value: "man", label: "Homem" },
  { value: "nonbinary", label: "Não-binário" },
  { value: "other", label: "Outro" },
];

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  multi?: boolean;
}) {
  const toggle = (v: T) => {
    if (multi) {
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    } else {
      onChange([v]);
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <motion.button
            key={o.value}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => toggle(o.value)}
            className={cn(
              "rounded-2xl border px-4 py-4 text-left font-medium transition-all",
              active
                ? "border-transparent bg-gradient-sunset text-white shadow-rose"
                : "border-white/12 bg-white/5 text-foreground hover:bg-white/10",
            )}
          >
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function DoneStep({ onFinish, name }: { onFinish: () => void; name: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
  }, []);
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="grid h-24 w-24 place-items-center rounded-full bg-gradient-sunset shadow-glow"
      >
        <Sparkles className="h-12 w-12 text-white" />
      </motion.div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        Tudo pronto{name ? `, ${name}` : ""}!
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        O teu perfil está vivo. Vamos encontrar as tuas pessoas.
      </p>
      <Button
        onClick={onFinish}
        className="mt-10 h-14 w-full max-w-xs rounded-full bg-gradient-sunset text-base font-semibold text-white shadow-glow"
      >
        Começar a explorar
      </Button>
    </div>
  );
}
