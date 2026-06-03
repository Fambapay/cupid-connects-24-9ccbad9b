import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
  User,
  Users,
  UserSquare2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import tutorialWoman1 from "@/assets/tutorial-woman-1.jpg";
import tutorialWoman2 from "@/assets/tutorial-woman-2.jpg";
import tutorialMan1 from "@/assets/tutorial-man-1.jpg";
import tutorialMan2 from "@/assets/tutorial-man-2.jpg";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Bem-vindo — Hunie" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    step: typeof s.step === "number" ? s.step : undefined,
  }),
  beforeLoad: async () => {
    const { redirect } = await import("@tanstack/react-router");
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    if (!data.user.email_confirmed_at) {
      throw redirect({ to: "/auth/verify-email" });
    }
    const { data: p } = await supabase
      .from("profiles")
      .select("onboarding_completed, membership_status, membership_expires_at")
      .eq("id", data.user.id)
      .maybeSingle();
    if (p?.onboarding_completed) {
      const status = (p as { membership_status?: string }).membership_status ?? "inactive";
      const exp = (p as { membership_expires_at?: string | null }).membership_expires_at;
      const active = status === "active" && (!exp || new Date(exp).getTime() > Date.now());
      throw redirect({
        to: active ? "/discover" : "/membership",
        search: active ? undefined : { required: 1 },
      });
    }
  },

  component: OnboardingPage,
});

// ─────────────────────────────────────────────────────────────
// Types & constants

type Gender = "man" | "woman" | "nonbinary";
type ExtendedGender = Gender | "transwoman" | "transman" | "genderfluid" | "agender" | "other";
type InterestedIn = "men" | "women" | "everyone";

const STEP_COUNT = 10;
type StepId =
  | "welcome"
  | "name"
  | "birthdate"
  | "gender"
  | "interested"
  | "photos"
  | "bio"
  | "interests"
  | "location"
  | "prompts"
  | "done";
const STEPS: StepId[] = [
  "welcome",
  "name",
  "birthdate",
  "gender",
  "interested",
  "photos",
  "bio",
  "interests",
  "location",
  "prompts",
];

const AVAILABLE_INTERESTS = [
  "Viajar", "Música", "Cinema", "Séries", "Cozinhar", "Café",
  "Ginásio", "Yoga", "Correr", "Caminhadas", "Praia", "Surf",
  "Futebol", "Basquete", "Dançar", "Fotografia", "Arte", "Livros",
  "Jogos", "Tecnologia", "Animais", "Natureza", "Vinho", "Brunch",
];

const PROMPT_QUESTIONS = [
  "A minha cena é…",
  "O que me faz rir…",
  "O melhor de mim…",
  "Procuro alguém que…",
  "O meu prato preferido é…",
  "Domingo perfeito é…",
  "Nunca sairei sem…",
  "Confessar: sou viciado em…",
];

const MAX_INTERESTS = 5;
const MIN_PROMPTS = 3;
const PROMPT_SLOTS = 3;

const STORAGE_KEY_PREFIX = "hunie:onboarding:v2:";
const storageKey = (uid?: string | null) => `${STORAGE_KEY_PREFIX}${uid ?? "anon"}`;

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const EXTENDED_GENDERS: { value: ExtendedGender; label: string }[] = [
  { value: "woman", label: "Mulher" },
  { value: "man", label: "Homem" },
  { value: "nonbinary", label: "Não-binário" },
  { value: "transwoman", label: "Mulher trans" },
  { value: "transman", label: "Homem trans" },
  { value: "genderfluid", label: "Género fluido" },
  { value: "agender", label: "Agénero" },
  { value: "other", label: "Outro" },
];

const PROMPTS = [
  "O que me faz rir…",
  "O melhor de mim…",
  "Procuro alguém que…",
];

// ─────────────────────────────────────────────────────────────
// Page

interface PromptDraft {
  question: string;
  answer: string;
}

interface DraftState {
  stepIdx: number;
  name: string;
  day: number | null;
  month: number | null;
  year: number | null;
  gender: ExtendedGender | null;
  interested: InterestedIn | null;
  bio: string;
  city: string;
  interests: string[];
  latitude: number | null;
  longitude: number | null;
  prompts: PromptDraft[];
}

const initialDraft: DraftState = {
  stepIdx: 0,
  name: "",
  day: null,
  month: null,
  year: null,
  gender: null,
  interested: null,
  bio: "",
  city: "",
  interests: [],
  latitude: null,
  longitude: null,
  prompts: [],
};

function OnboardingPage() {
  const { user } = useAuth();
  const { profile, reload } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { photos } = usePhotoUpload();

  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [hydrated, setHydrated] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<"done" | "tutorial">("done");

  // Hydrate from localStorage (scoped per user) + profile
  useEffect(() => {
    if (!user) return;
    try {
      // Clean up any legacy global key from previous versions
      localStorage.removeItem("hunie:onboarding:v1");
      const raw = localStorage.getItem(storageKey(user.id));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftState>;
        setDraft((d) => ({ ...d, ...parsed }));
      }
    } catch { /* noop */ }
    setHydrated(true);
  }, [user]);

  useEffect(() => {
    if (!profile || !hydrated) return;
    setDraft((d) => ({
      ...d,
      stepIdx: d.stepIdx || Math.max(0, (profile.onboarding_step ?? 1) - 1),
      name: d.name || profile.name || "",
      bio: d.bio || profile.bio || "",
      city: d.city || profile.city || "",
    }));
  }, [profile, hydrated]);

  // Persist draft locally
  useEffect(() => {
    if (!hydrated || !user) return;
    try { localStorage.setItem(storageKey(user.id), JSON.stringify(draft)); } catch { /* noop */ }
  }, [draft, hydrated, user]);



  // Persist current step to DB so reopen resumes
  useEffect(() => {
    if (!hydrated || !user) return;
    supabase
      .from("profiles")
      .update({ onboarding_step: draft.stepIdx + 1 })
      .eq("id", user.id)
      .then(() => {});
  }, [draft.stepIdx, hydrated, user]);

  const set = useCallback(<K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const stepId = STEPS[draft.stepIdx];
  const [dir, setDir] = useState<1 | -1>(1);

  const goNext = () => {
    setDir(1);
    setDraft((d) => ({ ...d, stepIdx: Math.min(d.stepIdx + 1, STEPS.length - 1) }));
  };
  const goBack = () => {
    setDir(-1);
    setDraft((d) => ({ ...d, stepIdx: Math.max(d.stepIdx - 1, 0) }));
  };

  const finish = useCallback(async () => {
    if (!user) return;
    const { day, month, year, name, bio, city, gender, interested, interests, latitude, longitude, prompts } = draft;
    const birthdate =
      day && month && year
        ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : null;
    const age = birthdate ? computeAge(birthdate) : null;

    const interestedMap: Record<InterestedIn, string[]> = {
      men: ["man"],
      women: ["woman"],
      everyone: ["man", "woman", "nonbinary"],
    };

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        gender,
        interested_in: interested ? interestedMap[interested] : [],
        interests,
        latitude,
        longitude,
        birthdate,
        age,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro a guardar", description: error.message, variant: "destructive" });
      return;
    }

    // Save prompts (replace previous)
    const validPrompts = prompts.filter((p) => p.question.trim() && p.answer.trim());
    if (validPrompts.length > 0) {
      await supabase.from("profile_prompts").delete().eq("profile_id", user.id);
      await supabase.from("profile_prompts").insert(
        validPrompts.map((p, i) => ({
          profile_id: user.id,
          question: p.question.trim(),
          answer: p.answer.trim(),
          position: i,
        })),
      );
    }

    try { localStorage.removeItem(storageKey(user.id)); } catch { /* noop */ }
    const { invalidateOnboardingCache } = await import("@/lib/authGuard");
    invalidateOnboardingCache();
    await reload();
    navigate({ to: "/membership", search: { required: 1 } });
  }, [draft, user, navigate, reload, toast]);

  const showProgress = stepId !== "welcome" && !done;
  const showBackButton = stepId === "photos";

  const progress = ((draft.stepIdx) / (STEP_COUNT - 1)) * 100;

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background text-foreground">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-80" />

      <div
        className="relative flex min-h-[100svh] flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Top bar */}
        <div className="flex h-12 items-center gap-3 px-5">
          {showBackButton ? (
            <button
              onClick={goBack}
              aria-label="Voltar"
              className="grid h-9 w-9 place-items-center rounded-full glass"
              style={{ touchAction: "manipulation" }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}
          {showProgress && (
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-sunset"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          )}
          <div className="h-9 w-9" />
        </div>

        {/* Step content */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            {done ? (
              phase === "done" ? (
                <CompletionScreen
                  key="done"
                  onContinue={() => setPhase("tutorial")}
                />
              ) : (
                <TutorialCarousel key="tutorial" onFinish={finish} />
              )
            ) : (
              <motion.div
                key={stepId}
                custom={dir}
                initial={{ x: dir * 100 + "%" }}
                animate={{ x: 0 }}
                exit={{ x: -dir * 100 + "%" }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                {stepId === "welcome" && <WelcomeStep onStart={goNext} />}
                {stepId === "name" && (
                  <NameStep
                    value={draft.name}
                    onChange={(v) => set("name", v)}
                    onNext={goNext}
                  />
                )}
                {stepId === "birthdate" && (
                  <BirthdateStep
                    day={draft.day}
                    month={draft.month}
                    year={draft.year}
                    onChange={(d, m, y) => {
                      set("day", d);
                      set("month", m);
                      set("year", y);
                    }}
                    onNext={goNext}
                  />
                )}
                {stepId === "gender" && (
                  <GenderStep
                    value={draft.gender}
                    onSelect={(g) => {
                      set("gender", g);
                      setTimeout(goNext, 300);
                    }}
                  />
                )}
                {stepId === "interested" && (
                  <InterestedStep
                    value={draft.interested}
                    onSelect={(i) => {
                      set("interested", i);
                      setTimeout(goNext, 300);
                    }}
                  />
                )}
                {stepId === "photos" && (
                  <PhotosStep onNext={goNext} count={photos.length} />
                )}
                {stepId === "bio" && (
                  <BioStep
                    value={draft.bio}
                    onChange={(v) => set("bio", v)}
                    onNext={goNext}
                  />
                )}
                {stepId === "interests" && (
                  <InterestsStep
                    value={draft.interests}
                    onChange={(v) => set("interests", v)}
                    onNext={goNext}
                  />
                )}
                {stepId === "location" && (
                  <LocationStep
                    value={draft.city}
                    onChange={(v) => set("city", v)}
                    onCoords={(lat, lng) => {
                      set("latitude", lat);
                      set("longitude", lng);
                    }}
                    onNext={goNext}
                  />
                )}
                {stepId === "prompts" && (
                  <PromptsStep
                    value={draft.prompts}
                    onChange={(v) => set("prompts", v)}
                    onNext={() => setDone(true)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Steps

function StepScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto px-6 pb-6">
      {children}
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-3xl font-bold leading-tight tracking-tight"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="mt-2 text-sm text-muted-foreground"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

function CtaBar({
  children,
  staggerDelay = 0.16,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: staggerDelay }}
      className="shrink-0 px-6 pt-3 pb-5"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      {children}
    </motion.div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ duration: 0 }}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "h-14 w-full rounded-full text-base font-semibold",
        "transition-colors",
        disabled
          ? "bg-white/10 text-muted-foreground"
          : "bg-gradient-sunset text-white shadow-glow",
      )}
    >
      {children}
    </motion.button>
  );
}

// Welcome ─────
function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col px-6 pb-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-gradient-sunset max-w-xs text-4xl font-bold leading-[1.1] tracking-tight"
        >
          O amor está mais perto do que pensas
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mt-5 max-w-xs text-base text-muted-foreground"
        >
          Vamos criar o teu perfil em menos de 2 minutos
        </motion.p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="space-y-4 pb-2"
      >
        <PrimaryButton onClick={onStart}>Começar</PrimaryButton>
        <p className="text-center text-sm text-muted-foreground">
          Já tens conta?{" "}
          <Link to="/auth/login" className="font-semibold text-foreground">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// Name ─────
function NameStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);
  const canNext = value.trim().length >= 2;
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <Heading
          title="Como te chamas?"
          subtitle="O teu primeiro nome aparece no perfil"
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-10"
        >
          <input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="O teu nome"
            autoCapitalize="words"
            autoCorrect="off"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canNext) onNext();
            }}
            className={cn(
              "w-full bg-transparent text-center text-[32px] font-bold outline-none",
              "border-b-2 border-white/15 pb-3",
              "focus:border-[color:var(--brand-pink)]",
              "placeholder:font-normal placeholder:text-muted-foreground",
              "transition-colors",
            )}
          />
        </motion.div>
      </StepScroll>
      <CtaBar>
        <PrimaryButton disabled={!canNext} onClick={onNext}>
          Continuar
        </PrimaryButton>
      </CtaBar>
    </div>
  );
}

// Birthdate ─────
function BirthdateStep({
  day,
  month,
  year,
  onChange,
  onNext,
}: {
  day: number | null;
  month: number | null;
  year: number | null;
  onChange: (d: number | null, m: number | null, y: number | null) => void;
  onNext: () => void;
}) {
  const [open, setOpen] = useState<null | "day" | "month" | "year">(null);
  const thisYear = new Date().getFullYear();

  const iso =
    day && month && year
      ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  const age = iso ? computeAge(iso) : null;
  const complete = day && month && year;
  const underage = age !== null && age < 18;
  const canNext = !!complete && !underage;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <Heading
          title="Quando nasceste?"
          subtitle="A tua idade aparece no perfil. Deves ter 18 ou mais."
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-10 grid grid-cols-3 gap-3"
        >
          <PillSelector
            label="Dia"
            value={day ? String(day).padStart(2, "0") : null}
            onClick={() => setOpen("day")}
          />
          <PillSelector
            label="Mês"
            value={month ? MONTHS_PT[month - 1].slice(0, 3) : null}
            onClick={() => setOpen("month")}
          />
          <PillSelector
            label="Ano"
            value={year ? String(year) : null}
            onClick={() => setOpen("year")}
          />
        </motion.div>
        {complete && underage && (
          <p className="mt-4 text-sm text-[color:var(--destructive)]">
            Tens de ter pelo menos 18 anos
          </p>
        )}
        {complete && !underage && age !== null && (
          <p className="mt-4 text-sm text-muted-foreground">
            Tens {age} anos
          </p>
        )}
      </StepScroll>
      <CtaBar>
        <PrimaryButton disabled={!canNext} onClick={onNext}>
          Continuar
        </PrimaryButton>
      </CtaBar>

      <ScrollPickerSheet
        open={open === "day"}
        onClose={() => setOpen(null)}
        title="Dia"
        items={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
        selected={day}
        onSelect={(v) => { onChange(v, month, year); setOpen(null); }}
      />
      <ScrollPickerSheet
        open={open === "month"}
        onClose={() => setOpen(null)}
        title="Mês"
        items={MONTHS_PT.map((m, i) => ({ value: i + 1, label: m }))}
        selected={month}
        onSelect={(v) => { onChange(day, v, year); setOpen(null); }}
      />
      <ScrollPickerSheet
        open={open === "year"}
        onClose={() => setOpen(null)}
        title="Ano"
        items={Array.from({ length: 80 }, (_, i) => {
          const y = thisYear - 18 - i;
          return { value: y, label: String(y) };
        })}
        selected={year}
        onSelect={(v) => { onChange(day, month, v); setOpen(null); }}
      />
    </div>
  );
}

function PillSelector({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | null;
  onClick: () => void;
}) {
  const filled = !!value;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0 }}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "group relative flex h-20 flex-col items-center justify-center overflow-hidden rounded-2xl border px-2 text-center transition-colors",
        filled
          ? "border-transparent bg-white/[0.06] shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-pink)_55%,transparent),0_10px_30px_-12px_color-mix(in_oklab,var(--brand-pink)_45%,transparent)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20",
      )}
    >
      {/* Soft gradient sheen when filled */}
      {filled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--brand-pink) 28%, transparent), transparent 70%)",
          }}
        />
      )}
      <span
        className={cn(
          "relative text-[10px] font-medium uppercase tracking-[0.18em] transition-colors",
          filled ? "text-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "relative mt-1 leading-none transition-colors",
          filled
            ? "text-2xl font-semibold tracking-tight text-foreground"
            : "text-lg font-light text-muted-foreground/60",
        )}
      >
        {value ?? "—"}
      </span>
    </motion.button>
  );
}

function ScrollPickerSheet<T extends number>({
  open,
  onClose,
  title,
  items,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: { value: T; label: string }[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  const ITEM_H = 44;
  const VISIBLE = 5;
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number>(() => {
    const i = items.findIndex((it) => it.value === selected);
    return i >= 0 ? i : Math.floor(items.length / 2);
  });
  const scrollRaf = useRef<number | null>(null);
  const snapTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const i = items.findIndex((it) => it.value === selected);
    const idx = i >= 0 ? i : Math.floor(items.length / 2);
    setActiveIdx(idx);
    const id = requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = idx * ITEM_H;
    });
    return () => cancelAnimationFrame(id);
  }, [open, items, selected]);

  const handleScroll = () => {
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      if (!listRef.current) return;
      const idx = Math.round(listRef.current.scrollTop / ITEM_H);
      setActiveIdx(Math.max(0, Math.min(items.length - 1, idx)));
    });
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      if (!listRef.current) return;
      const idx = Math.round(listRef.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      listRef.current.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
    }, 120);
  };

  const handleConfirm = () => {
    const it = items[activeIdx];
    if (it) onSelect(it.value);
  };

  const containerH = ITEM_H * VISIBLE;
  const padding = (containerH - ITEM_H) / 2;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="border-t border-white/10 bg-card">
        <DrawerHeader className="pb-1 pt-3">
          <DrawerTitle className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </DrawerTitle>
        </DrawerHeader>

        <div className="relative px-6 pb-2 pt-1">
          <div
            aria-hidden
            className="pointer-events-none absolute left-6 right-6 top-1/2 -translate-y-1/2 rounded-2xl border border-white/10"
            style={{
              height: ITEM_H,
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--brand-pink) 10%, transparent), color-mix(in oklab, var(--brand-purple) 10%, transparent))",
              boxShadow:
                "inset 0 1px 0 color-mix(in oklab, white 6%, transparent), 0 0 24px -8px color-mix(in oklab, var(--brand-pink) 40%, transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-7 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
            style={{ background: "var(--brand-pink)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-7 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
            style={{ background: "var(--brand-purple)" }}
          />

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="relative overflow-y-auto [&::-webkit-scrollbar]:hidden"
            style={{
              height: containerH,
              scrollSnapType: "y mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              maskImage:
                "linear-gradient(to bottom, transparent 0, #000 30%, #000 70%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0, #000 30%, #000 70%, transparent 100%)",
            }}
          >
            <div style={{ paddingTop: padding, paddingBottom: padding }}>
              {items.map((it, i) => {
                const dist = Math.abs(i - activeIdx);
                const active = dist === 0;
                const opacity = active ? 1 : Math.max(0.25, 1 - dist * 0.28);
                const scale = active ? 1 : Math.max(0.82, 1 - dist * 0.06);
                return (
                  <button
                    key={it.value}
                    type="button"
                    onClick={() => {
                      if (listRef.current)
                        listRef.current.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
                    }}
                    className="flex w-full items-center justify-center text-center transition-[transform,opacity,color] duration-150 will-change-transform"
                    style={{
                      height: ITEM_H,
                      scrollSnapAlign: "center",
                      opacity,
                      transform: `scale(${scale})`,
                      color: active ? "var(--foreground)" : "var(--muted-foreground)",
                      fontWeight: active ? 600 : 400,
                      fontSize: active ? "1.375rem" : "1.125rem",
                      letterSpacing: active ? "-0.01em" : "0",
                    }}
                  >
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DrawerFooter className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
          <DrawerClose asChild>
            <Button
              variant="ghost"
              className="h-12 rounded-xl text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              Cancelar
            </Button>
          </DrawerClose>
          <Button
            onClick={handleConfirm}
            className="h-12 rounded-xl text-sm font-semibold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-pink), var(--brand-purple))",
              boxShadow:
                "0 8px 24px -8px color-mix(in oklab, var(--brand-pink) 60%, transparent)",
            }}
          >
            Confirmar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Gender ─────
function GenderStep({
  value,
  onSelect,
}: {
  value: ExtendedGender | null;
  onSelect: (v: ExtendedGender) => void;
}) {
  const [extOpen, setExtOpen] = useState(false);
  const primary: { value: Gender; label: string; Icon: typeof User }[] = [
    { value: "woman", label: "Mulher", Icon: User },
    { value: "man", label: "Homem", Icon: UserSquare2 },
    { value: "nonbinary", label: "Não-binário", Icon: Users },
  ];
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <Heading title="Como te identificas?" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-10 grid grid-cols-1 gap-3"
        >
          {primary.map((o) => (
            <GenderCard
              key={o.value}
              label={o.label}
              Icon={o.Icon}
              selected={value === o.value}
              onClick={() => onSelect(o.value)}
            />
          ))}
        </motion.div>
        <button
          type="button"
          onClick={() => setExtOpen(true)}
          className="mt-6 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Mais opções de género
        </button>
      </StepScroll>

      <Drawer open={extOpen} onOpenChange={setExtOpen}>
        <DrawerContent className="bg-card">
          <DrawerHeader>
            <DrawerTitle className="text-center text-base">Género</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-2">
            {EXTENDED_GENDERS.map((g) => {
              const active = value === g.value;
              return (
                <button
                  key={g.value}
                  onClick={() => { onSelect(g.value); setExtOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left",
                    active ? "bg-white/10" : "active:bg-white/5",
                  )}
                >
                  <span className={cn("text-base", active && "font-semibold")}>
                    {g.label}
                  </span>
                  {active && <Check className="h-4 w-4 text-[color:var(--brand-pink)]" />}
                </button>
              );
            })}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function GenderCard({
  label,
  Icon,
  selected,
  onClick,
}: {
  label: string;
  Icon: typeof User;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0 }}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "relative flex items-center gap-4 rounded-2xl border bg-white/5 px-5 py-5 text-left",
        "transition-colors",
        selected
          ? "border-[color:var(--brand-pink)] shadow-rose"
          : "border-white/12",
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 place-items-center rounded-xl",
          selected ? "bg-gradient-sunset text-white" : "bg-white/10 text-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="flex-1 text-base font-semibold">{label}</span>
      {selected && (
        <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-sunset text-white">
          <Check className="h-4 w-4" />
        </div>
      )}
    </motion.button>
  );
}

// Interested ─────
function InterestedStep({
  value,
  onSelect,
}: {
  value: InterestedIn | null;
  onSelect: (v: InterestedIn) => void;
}) {
  const opts: { value: InterestedIn; label: string; Icon: typeof User }[] = [
    { value: "women", label: "Mulheres", Icon: User },
    { value: "men", label: "Homens", Icon: UserSquare2 },
    { value: "everyone", label: "Todos", Icon: Users },
  ];
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <Heading title="Quem queres conhecer?" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-10 grid grid-cols-1 gap-3"
        >
          {opts.map((o) => (
            <GenderCard
              key={o.value}
              label={o.label}
              Icon={o.Icon}
              selected={value === o.value}
              onClick={() => onSelect(o.value)}
            />
          ))}
        </motion.div>
      </StepScroll>
    </div>
  );
}

// Photos ─────
function PhotosStep({ onNext }: { onNext: () => void; count?: number }) {
  const { photos, upload, remove, loading } = usePhotoUpload();
  const { toast } = useToast();
  const [actionFor, setActionFor] = useState<string | null>(null);

  const count = photos.length;
  const slots = Array.from({ length: 6 }, (_, i) => photos[i] ?? null);

  const handleFile = async (file: File, replaceId?: string) => {
    try {
      if (replaceId) await remove(replaceId);
      await upload(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha no upload";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <Heading
          title="Adiciona as tuas melhores fotos"
          subtitle="Perfis com fotos recebem 10x mais matches"
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-8 grid grid-cols-3 grid-rows-[auto_auto] gap-2.5"
        >
          {slots.map((p, i) => (
            <PhotoSlot
              key={i}
              large={i === 0}
              photo={p}
              onAdd={(file) => handleFile(file)}
              onOpenActions={() => p && setActionFor(p.id)}
              disabled={loading}
              isMain={i === 0}
            />
          ))}
        </motion.div>
        <p className="mt-4 text-sm text-muted-foreground">
          <Camera className="mr-1.5 inline h-3.5 w-3.5" />
          {count} de 6 fotos adicionadas
        </p>
      </StepScroll>
      <CtaBar>
        <PrimaryButton disabled={count < 1} onClick={onNext}>
          Continuar
        </PrimaryButton>
      </CtaBar>


      <Drawer open={!!actionFor} onOpenChange={(o) => !o && setActionFor(null)}>
        <DrawerContent className="bg-card">
          <DrawerHeader>
            <DrawerTitle className="text-center text-base">Foto</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-2 px-4 pb-2">
            <label className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-4 py-3 active:bg-white/10">
              <Camera className="h-5 w-5" />
              <span className="text-base">Substituir foto</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f && actionFor) await handleFile(f, actionFor);
                  setActionFor(null);
                }}
              />
            </label>
            <button
              onClick={async () => {
                if (actionFor) await remove(actionFor);
                setActionFor(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-[color:var(--destructive)] active:bg-white/10"
            >
              <Trash2 className="h-5 w-5" />
              <span className="text-base">Apagar foto</span>
            </button>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function PhotoSlot({
  large,
  photo,
  onAdd,
  onOpenActions,
  disabled,
  isMain,
}: {
  large: boolean;
  photo: { id: string; url?: string } | null;
  onAdd: (file: File) => void;
  onOpenActions: () => void;
  disabled: boolean;
  isMain: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]",
        large ? "col-span-2 row-span-2 aspect-square" : "aspect-[3/4]",
      )}
    >
      {photo ? (
        <button
          type="button"
          onClick={onOpenActions}
          className="absolute inset-0 active:scale-[0.98]"
          style={{ touchAction: "manipulation" }}
        >
          <img
            src={photo.url}
            alt="Foto do perfil"
            className="h-full w-full object-cover"
          />
          {isMain && (
            <span className="absolute bottom-2 left-2 rounded-full bg-gradient-sunset px-2 py-0.5 text-[10px] font-semibold text-white">
              Foto principal
            </span>
          )}
        </button>
      ) : (
        <label
          className="absolute inset-0 grid cursor-pointer place-items-center text-muted-foreground active:bg-white/5"
          style={{ touchAction: "manipulation" }}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-sunset/20">
            <Plus className="h-5 w-5 text-[color:var(--brand-pink)]" />
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAdd(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

// Bio ─────
function BioStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const counterAccent = value.length > 200;
  const appendPrompt = (p: string) => {
    const sep = value && !value.endsWith("\n") ? "\n\n" : "";
    onChange((value + sep + p + " ").slice(0, 300));
  };
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <Heading
          title="Fala um pouco de ti"
          subtitle="Uma boa bio aumenta muito as tuas hipóteses"
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-8"
        >
          <div className="relative">
            <span
              className={cn(
                "absolute right-0 top-0 text-xs",
                counterAccent
                  ? "text-[color:var(--brand-pink)]"
                  : "text-muted-foreground",
              )}
            >
              {value.length}/300
            </span>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, 300))}
              placeholder="Sou alguém que…"
              rows={5}
              className={cn(
                "mt-6 w-full resize-none bg-transparent text-lg outline-none",
                "border-b-2 border-white/15 pb-3",
                "focus:border-[color:var(--brand-pink)]",
                "placeholder:text-muted-foreground transition-colors",
              )}
            />
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              Inspirações
            </p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <motion.button
                  key={p}
                  type="button"
                  onClick={() => appendPrompt(p)}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0 }}
                  style={{ touchAction: "manipulation" }}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-foreground active:bg-white/10"
                >
                  {p}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </StepScroll>
      <CtaBar>
        <PrimaryButton onClick={onNext}>Continuar</PrimaryButton>
        <button
          type="button"
          onClick={onNext}
          className="mt-3 block w-full text-center text-sm text-muted-foreground"
        >
          Adicionar depois
        </button>
      </CtaBar>
    </div>
  );
}

// Location ─────
function LocationStep({
  value,
  onChange,
  onCoords,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onCoords: (lat: number | null, lng: number | null) => void;
  onNext: () => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "granted" | "denied">(
    value ? "granted" : "idle",
  );
  const [manual, setManual] = useState(!!value);
  const [detected, setDetected] = useState(value);

  const ask = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("denied");
      setManual(true);
      return;
    }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        onCoords(pos.coords.latitude, pos.coords.longitude);
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=pt`,
          );
          const d = await r.json();
          const city =
            d.address?.city ||
            d.address?.town ||
            d.address?.village ||
            d.address?.county ||
            "";
          const country = d.address?.country || "";
          const full = [city, country].filter(Boolean).join(", ");
          setDetected(full || "Localização ativa");
          onChange(city || full);
          setState("granted");
        } catch {
          setDetected("Localização ativa");
          setState("granted");
        }
      },
      () => {
        setState("denied");
        setManual(true);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const canNext = state === "granted" || value.trim().length >= 2;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <Heading
          title="Onde estás?"
          subtitle="Usamos a tua localização para mostrar pessoas perto de ti"
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-10 space-y-4"
        >
          <motion.button
            type="button"
            onClick={ask}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0 }}
            disabled={state === "loading"}
            style={{ touchAction: "manipulation" }}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border bg-white/5 px-5 py-5 text-left",
              state === "granted"
                ? "border-[color:var(--brand-pink)] shadow-rose"
                : "border-white/12",
            )}
          >
            <div
              className={cn(
                "grid h-12 w-12 place-items-center rounded-xl",
                state === "granted"
                  ? "bg-gradient-sunset text-white"
                  : "bg-white/10",
              )}
            >
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold">
                {state === "granted" ? detected : "Ativar localização"}
              </p>
              <p className="text-xs text-muted-foreground">
                {state === "loading"
                  ? "A obter…"
                  : state === "granted"
                    ? "Localização ativa"
                    : "Recomendado para melhores matches"}
              </p>
            </div>
            {state === "granted" && (
              <Check className="h-5 w-5 text-[color:var(--brand-pink)]" />
            )}
          </motion.button>

          <button
            type="button"
            onClick={() => setManual((m) => !m)}
            className="block w-full text-center text-sm text-muted-foreground"
          >
            Introduzir cidade manualmente
          </button>

          {manual && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="A tua cidade"
                className={cn(
                  "w-full bg-transparent text-lg outline-none",
                  "border-b-2 border-white/15 pb-2",
                  "focus:border-[color:var(--brand-pink)]",
                  "placeholder:text-muted-foreground transition-colors",
                )}
              />
            </motion.div>
          )}
        </motion.div>
      </StepScroll>
      <CtaBar>
        <PrimaryButton disabled={!canNext} onClick={onNext}>
          Continuar
        </PrimaryButton>
      </CtaBar>
    </div>
  );
}

// Interests ─────
function InterestsStep({
  value,
  onChange,
  onNext,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
}) {
  const toggle = (item: string) => {
    if (value.includes(item)) onChange(value.filter((x) => x !== item));
    else if (value.length < MAX_INTERESTS) onChange([...value, item]);
  };
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <StepScroll>
        <div className="flex items-start justify-between gap-3 pt-2">
          <Heading
            title="O que gostas de fazer?"
            subtitle={`Escolhe até ${MAX_INTERESTS} interesses`}
          />
          <span className="mt-2 shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-foreground">
            {value.length}/{MAX_INTERESTS}
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-8 flex flex-wrap gap-2"
        >
          {AVAILABLE_INTERESTS.map((it) => {
            const active = value.includes(it);
            const disabled = !active && value.length >= MAX_INTERESTS;
            return (
              <motion.button
                key={it}
                type="button"
                onClick={() => toggle(it)}
                disabled={disabled}
                whileTap={!disabled ? { scale: 0.96 } : undefined}
                transition={{ duration: 0 }}
                style={{ touchAction: "manipulation" }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-transparent bg-gradient-sunset text-white shadow-rose"
                    : disabled
                      ? "border-white/8 bg-white/[0.02] text-muted-foreground/50"
                      : "border-white/12 bg-white/[0.04] text-foreground active:bg-white/10",
                )}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                {it}
              </motion.button>
            );
          })}
        </motion.div>
      </StepScroll>
      <CtaBar>
        <PrimaryButton onClick={onNext}>Continuar</PrimaryButton>
        <button
          type="button"
          onClick={onNext}
          className="mt-3 block w-full text-center text-sm text-muted-foreground"
        >
          Saltar por agora
        </button>
      </CtaBar>
    </div>
  );
}

// Prompts ─────
function PromptsStep({
  value,
  onChange,
  onNext,
}: {
  value: PromptDraft[];
  onChange: (v: PromptDraft[]) => void;
  onNext: () => void;
}) {
  const slots: PromptDraft[] = Array.from(
    { length: PROMPT_SLOTS },
    (_, i) => value[i] ?? { question: "", answer: "" },
  );
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const updateSlot = (i: number, patch: Partial<PromptDraft>) => {
    const next = slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange(next);
  };

  const validCount = slots.filter(
    (s) => s.question.trim() && s.answer.trim(),
  ).length;
  const canNext = validCount >= MIN_PROMPTS;

  return (
    <div className="flex flex-1 min-h-0 flex-col">

      <StepScroll>
        <Heading
          title="Mostra a tua personalidade"
          subtitle={`Escolhe ${MIN_PROMPTS} perguntas e responde`}
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-6 space-y-3"
        >
          {slots.map((slot, i) => {
            const filled = !!slot.question;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-2xl border bg-white/[0.04] p-4 transition-colors",
                  filled ? "border-white/15" : "border-dashed border-white/15",
                )}
              >
                <button
                  type="button"
                  onClick={() => setPickerFor(i)}
                  className="flex w-full items-center justify-between text-left"
                  style={{ touchAction: "manipulation" }}
                >
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      filled ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {slot.question || `Escolher pergunta ${i + 1}`}
                  </span>
                  <span className="ml-3 text-xs text-muted-foreground">Mudar</span>
                </button>
                {filled && (
                  <textarea
                    value={slot.answer}
                    onChange={(e) =>
                      updateSlot(i, { answer: e.target.value.slice(0, 150) })
                    }
                    placeholder="A tua resposta…"
                    rows={2}
                    maxLength={150}
                    className={cn(
                      "mt-3 w-full resize-none bg-transparent text-base outline-none",
                      "border-b border-white/10 pb-2 focus:border-[color:var(--brand-pink)]",
                      "placeholder:text-muted-foreground transition-colors",
                    )}
                  />
                )}
              </div>
            );
          })}
        </motion.div>
        <p className="mt-4 text-xs text-muted-foreground">
          {validCount}/{MIN_PROMPTS} prompts completos
        </p>
      </StepScroll>
      <CtaBar>
        <PrimaryButton disabled={!canNext} onClick={onNext}>
          Continuar
        </PrimaryButton>
      </CtaBar>

      <Drawer open={pickerFor !== null} onOpenChange={(o) => !o && setPickerFor(null)}>
        <DrawerContent className="bg-card">
          <DrawerHeader>
            <DrawerTitle className="text-center text-base">Escolhe uma pergunta</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-2">
            {PROMPT_QUESTIONS.filter(
              (q) => !slots.some((s, i) => i !== pickerFor && s.question === q),
            ).map((q) => {
              const active = pickerFor !== null && slots[pickerFor]?.question === q;
              return (
                <button
                  key={q}
                  onClick={() => {
                    if (pickerFor !== null) updateSlot(pickerFor, { question: q });
                    setPickerFor(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left",
                    active ? "bg-white/10" : "active:bg-white/5",
                  )}
                >
                  <span className={cn("text-base", active && "font-semibold")}>{q}</span>
                  {active && <Check className="h-4 w-4 text-[color:var(--brand-pink)]" />}
                </button>
              );
            })}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// Completion ─────
function CompletionScreen({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    const fire = (origin: { x: number; y: number }) =>
      confetti({
        particleCount: 80,
        spread: 70,
        startVelocity: 45,
        ticks: 200,
        origin,
        colors: ["#ff4d8d", "#a855f7", "#f43f5e", "#ec4899", "#c084fc"],
      });
    fire({ x: 0.3, y: 0.4 });
    setTimeout(() => fire({ x: 0.7, y: 0.4 }), 200);
    setTimeout(() => fire({ x: 0.5, y: 0.35 }), 400);
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: -Math.random() * 60 - 40,
        rot: Math.random() * 360,
        delay: Math.random() * 0.4,
        color:
          i % 3 === 0
            ? "var(--brand-pink)"
            : i % 3 === 1
              ? "var(--brand-purple)"
              : "var(--brand-magenta)",
      })),
    [],
  );

  return (
    <motion.div
      key="completion"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
    >
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-0 overflow-visible">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
            animate={{
              x: p.x * 4,
              y: [p.y, p.y + 220],
              opacity: [0, 1, 0],
              rotate: p.rot,
            }}
            transition={{
              duration: 1.8,
              delay: p.delay,
              ease: "easeOut",
              opacity: { times: [0, 0.2, 1] },
            }}
            className="absolute left-1/2 top-0 h-2 w-2 rounded-sm"
            style={{ background: p.color }}
          />
        ))}
      </div>

      {/* Animated check */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid h-24 w-24 place-items-center rounded-full bg-gradient-sunset shadow-glow"
      >
        <svg viewBox="0 0 52 52" className="h-12 w-12">
          <motion.path
            d="M14 27 l8 8 l16 -18"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.4 }}
        className="mt-8 text-3xl font-bold tracking-tight"
      >
        O teu perfil está pronto 🔥
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.5 }}
        className="mt-3 max-w-xs text-sm text-muted-foreground"
      >
        Já podes começar a descobrir pessoas perto de ti
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.6 }}
        className="mt-10 w-full max-w-xs"
      >
        <PrimaryButton onClick={onContinue}>Como funciona a app</PrimaryButton>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Utils

function computeAge(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

// ─────────────────────────────────────────────────────────────
// Tutorial — premium 4-step "how to use the app" carousel

type TutorialSlide = {
  icon: typeof Heart;
  iconBg: string;
  kicker: string;
  title: string;
  body: string;
  visual: "swipe" | "match" | "chat" | "profile";
};

const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    icon: Flame,
    iconBg: "linear-gradient(135deg, var(--brand-pink), var(--brand-magenta))",
    kicker: "Descobrir",
    title: "Desliza para encontrar pessoas",
    body: "Direita se gostares, esquerda para passar. Toca no perfil para veres mais.",
    visual: "swipe",
  },
  {
    icon: Heart,
    iconBg: "linear-gradient(135deg, var(--brand-magenta), var(--brand-purple))",
    kicker: "Match",
    title: "Quando há interesse mútuo, é match",
    body: "Recebes uma notificação assim que alguém te dá like de volta.",
    visual: "match",
  },
  {
    icon: MessageCircle,
    iconBg: "linear-gradient(135deg, var(--brand-purple), var(--brand-pink))",
    kicker: "Conversar",
    title: "Inicia uma conversa autêntica",
    body: "Sê tu próprio. Mensagens reais funcionam melhor que copy-paste.",
    visual: "chat",
  },
  {
    icon: Sparkles,
    iconBg: "linear-gradient(135deg, var(--brand-pink), var(--brand-purple))",
    kicker: "Perfil",
    title: "Mantém o teu perfil fresco",
    body: "Actualiza fotos e bio para apareceres mais e atrair melhores matches.",
    visual: "profile",
  },
];

function TutorialCarousel({ onFinish }: { onFinish: () => void }) {
  const [idx, setIdx] = useState(0);
  const last = TUTORIAL_SLIDES.length - 1;
  const slide = TUTORIAL_SLIDES[idx];
  const Icon = slide.icon;

  const next = () => (idx < last ? setIdx(idx + 1) : onFinish());

  return (
    <motion.div
      key="tutorial"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 flex flex-col"
    >
      {/* Skip */}
      <div className="flex items-center justify-between px-5 pt-2">
        <div className="flex gap-1.5">
          {TUTORIAL_SLIDES.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 22 : 8,
                background:
                  i === idx
                    ? "linear-gradient(90deg, var(--brand-pink), var(--brand-purple))"
                    : "color-mix(in oklab, white 14%, transparent)",
              }}
            />
          ))}
        </div>
        <button
          onClick={onFinish}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Saltar
        </button>
      </div>

      {/* Visual */}
      <div className="relative flex flex-1 items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="flex w-full max-w-sm flex-col items-center text-center"
          >
            <TutorialVisual variant={slide.visual} />

            <div
              className="mt-8 grid h-14 w-14 place-items-center rounded-2xl shadow-glow"
              style={{ background: slide.iconBg }}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {slide.kicker}
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight">
              {slide.title}
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div
        className="px-5 pb-6 pt-2"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <PrimaryButton onClick={next}>
          <span className="inline-flex items-center gap-2">
            {idx === last ? "Começar a explorar" : "Próximo"}
            <ArrowRight className="h-4 w-4" />
          </span>
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

function TutorialVisual({ variant }: { variant: TutorialSlide["visual"] }) {
  if (variant === "swipe") {
    return (
      <div className="relative mx-auto h-72 w-full max-w-[260px]">
        {/* Back card */}
        <div
          className="absolute inset-x-8 inset-y-4 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]"
          style={{ transform: "rotate(-7deg)" }}
        >
          <img
            src={tutorialMan2}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-60"
          />
        </div>
        {/* Front card */}
        <motion.div
          animate={{ x: [0, 70, 0, -70, 0], rotate: [0, 9, 0, -9, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/15 shadow-[0_20px_60px_-15px_rgba(236,72,153,0.5)]"
        >
          <img
            src={tutorialWoman1}
            alt="Perfil exemplo"
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {/* Profile info */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-white drop-shadow-lg">Amara</span>
              <span className="text-base text-white/90">24</span>
              <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-white/80">
              <MapPin className="h-3 w-3" />
              <span>2 km de distância</span>
            </div>
          </div>

          {/* Like / Nope chips */}
          <motion.div
            animate={{ opacity: [0, 0, 1, 0, 0], scale: [0.8, 0.8, 1, 0.8, 0.8] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute right-4 top-4 rounded-lg border-2 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.18em] backdrop-blur-sm"
            style={{
              borderColor: "var(--brand-pink)",
              color: "var(--brand-pink)",
              background: "rgba(236,72,153,0.12)",
            }}
          >
            LIKE
          </motion.div>
          <motion.div
            animate={{ opacity: [0, 0, 0, 0, 1, 0], scale: [0.8, 0.8, 0.8, 0.8, 1, 0.8] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute left-4 top-4 rounded-lg border-2 border-white/70 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.18em] text-white/90 backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            NOPE
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (variant === "match") {
    return (
      <div className="relative flex h-72 items-center justify-center">
        <div className="relative flex items-center">
          {/* Left avatar */}
          <motion.div
            animate={{ x: [-50, -14, -14], opacity: [0, 1, 1] }}
            transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity, repeatDelay: 1.6 }}
            className="relative z-10 h-28 w-28 overflow-hidden rounded-full border-2 border-white/30 shadow-[0_10px_40px_-10px_rgba(236,72,153,0.7)]"
          >
            <img
              src={tutorialMan1}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </motion.div>
          {/* Heart burst */}
          <motion.div
            animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 0.7, delay: 0.7, repeat: Infinity, repeatDelay: 2.3 }}
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="grid h-14 w-14 place-items-center rounded-full shadow-[0_0_30px_rgba(236,72,153,0.8)]"
              style={{
                background: "linear-gradient(135deg, var(--brand-pink), var(--brand-magenta))",
              }}
            >
              <Heart className="h-7 w-7 fill-white text-white" />
            </div>
          </motion.div>
          {/* Right avatar */}
          <motion.div
            animate={{ x: [50, 14, 14], opacity: [0, 1, 1] }}
            transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity, repeatDelay: 1.6 }}
            className="relative z-10 h-28 w-28 overflow-hidden rounded-full border-2 border-white/30 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.7)]"
          >
            <img
              src={tutorialWoman2}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </div>
        {/* MATCH label */}
        <motion.div
          animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white"
          style={{
            background: "linear-gradient(90deg, var(--brand-pink), var(--brand-purple))",
            boxShadow: "0 8px 24px -8px rgba(236,72,153,0.6)",
          }}
        >
          It's a Match
        </motion.div>
      </div>
    );
  }

  if (variant === "chat") {
    // Premium iMessage-style chat with avatars and real text
    const messages: Array<{ side: "l" | "r"; text: string; delay: number; tail?: boolean }> = [
      { side: "l", text: "Olá! Adorei o teu perfil 😊", delay: 0.1, tail: true },
      { side: "r", text: "Olá Amara! Obrigado 💫", delay: 0.7, tail: true },
      { side: "l", text: "Café este sábado?", delay: 1.3, tail: true },
      { side: "r", text: "Combinado!", delay: 1.9, tail: true },
    ];
    return (
      <div className="mx-auto flex h-72 w-full max-w-[280px] flex-col">
        {/* Header bar */}
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-2">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/15">
            <img src={tutorialWoman1} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-foreground">Amara</div>
            <div className="text-[10px] text-emerald-400">online agora</div>
          </div>
        </div>
        {/* Messages */}
        <div className="flex flex-1 flex-col justify-end gap-1.5 pt-3">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.35,
                delay: m.delay,
                repeat: Infinity,
                repeatDelay: 2.6,
                ease: [0.4, 0, 0.2, 1],
              }}
              className={cn("flex", m.side === "r" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[78%] px-3 py-1.5 text-[12px] leading-snug",
                  m.side === "r" ? "text-white" : "text-foreground/95",
                )}
                style={{
                  background:
                    m.side === "r"
                      ? "linear-gradient(135deg, var(--brand-pink), var(--brand-purple))"
                      : "color-mix(in oklab, white 10%, transparent)",
                  borderRadius: 18,
                  borderBottomRightRadius: m.side === "r" ? 4 : 18,
                  borderBottomLeftRadius: m.side === "l" ? 4 : 18,
                  boxShadow:
                    m.side === "r"
                      ? "0 4px 14px -4px rgba(236,72,153,0.5)"
                      : "0 2px 8px -2px rgba(0,0,0,0.3)",
                }}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
          {/* Typing indicator */}
          <motion.div
            animate={{ opacity: [0, 0, 0, 0, 1, 1, 0] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 1 }}
            className="flex justify-start"
          >
            <div
              className="flex items-center gap-1 px-3 py-2"
              style={{
                background: "color-mix(in oklab, white 10%, transparent)",
                borderRadius: 18,
                borderBottomLeftRadius: 4,
              }}
            >
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                  className="h-1.5 w-1.5 rounded-full bg-white/70"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // profile — premium mockup with real photo
  return (
    <div className="relative mx-auto h-72 w-full max-w-[240px]">
      <div className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.03] shadow-[0_20px_60px_-15px_rgba(168,85,247,0.45)]">
        {/* Cover photo */}
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={tutorialWoman1}

            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90" />
        </div>
        {/* Avatar */}
        <div className="relative -mt-10 px-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-background shadow-lg">
            <img
              src={tutorialWoman1}

              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-foreground">Zuri</span>
              <span className="text-xs text-muted-foreground">26</span>
            </div>
            <div className="text-[10px] leading-relaxed text-muted-foreground">
              Fotógrafa · Luanda
              <br />
              Café, livros e viagens 📷
            </div>
            <div className="flex gap-1.5 pt-1">
              {["Arte", "Viagens", "Música"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[9px] font-medium text-foreground/80"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* Sparkle badge */}
        <motion.div
          animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full shadow-[0_0_20px_rgba(236,72,153,0.6)]"
          style={{
            background: "linear-gradient(135deg, var(--brand-pink), var(--brand-magenta))",
          }}
        >
          <Sparkles className="h-4 w-4 text-white" />
        </motion.div>
      </div>
    </div>
  );
}
