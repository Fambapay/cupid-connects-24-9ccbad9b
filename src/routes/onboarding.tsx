import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  X,
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
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();
    if (p?.onboarding_completed) throw redirect({ to: "/discover" });
  },
  component: OnboardingPage,
});

// ─────────────────────────────────────────────────────────────
// Types & constants

type Gender = "man" | "woman" | "nonbinary";
type ExtendedGender = Gender | "transwoman" | "transman" | "genderfluid" | "agender" | "other";
type InterestedIn = "men" | "women" | "everyone";

const STEP_COUNT = 8;
type StepId =
  | "welcome"
  | "name"
  | "birthdate"
  | "gender"
  | "interested"
  | "photos"
  | "bio"
  | "location"
  | "done";
const STEPS: StepId[] = [
  "welcome",
  "name",
  "birthdate",
  "gender",
  "interested",
  "photos",
  "bio",
  "location",
];

const STORAGE_KEY = "hunie:onboarding:v1";

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

  // Hydrate from localStorage + profile
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftState>;
        setDraft((d) => ({ ...d, ...parsed }));
      }
    } catch { /* noop */ }
    setHydrated(true);
  }, []);

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
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* noop */ }
  }, [draft, hydrated]);

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
    const { day, month, year, name, bio, city, gender, interested } = draft;
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
        birthdate,
        age,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro a guardar", description: error.message, variant: "destructive" });
      return;
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    await reload();
    navigate({ to: "/discover" });
  }, [draft, user, navigate, reload, toast]);

  // Auto-navigate after completion celebration
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => { finish(); }, 1500);
    return () => clearTimeout(t);
  }, [done, finish]);

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
              <CompletionScreen key="done" onContinue={finish} />
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
                {stepId === "location" && (
                  <LocationStep
                    value={draft.city}
                    onChange={(v) => set("city", v)}
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
    <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-6">
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
      className="px-6 pt-3 pb-5"
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
    <div className="flex flex-1 flex-col">
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
    <div className="flex flex-1 flex-col">
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
    <div className="flex flex-1 flex-col">
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
    <div className="flex flex-1 flex-col">
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
    <div className="flex flex-1 flex-col">
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
    <div className="flex flex-1 flex-col">
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
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
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
    <div className="flex flex-1 flex-col">
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

// Completion ─────
function CompletionScreen({ onContinue }: { onContinue: () => void }) {
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
        <PrimaryButton onClick={onContinue}>Ver o meu perfil</PrimaryButton>
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
