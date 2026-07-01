import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock, X, BadgeCheck, FileText } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { hapticTap } from '@/hooks/useNativePlatform';

export interface DiscoveryFilters {
  gender: 'todos' | 'feminino' | 'masculino' | 'nao_binario';
  ageMin: number;
  ageMax: number;
  distance: number;
  verifiedOnly: boolean;
  hasBio: boolean;
  withPhotos: boolean;
  heightMin: number;
  heightMax: number;
  interests: string[];
  lifestyle: {
    smoke?: 'sim' | 'nao' | 'as_vezes';
    drink?: 'sim' | 'nao' | 'as_vezes';
    workout?: 'sim' | 'nao' | 'as_vezes';
  };
  zodiac: string[];
  education: string[];
}

export const DEFAULT_FILTERS: DiscoveryFilters = {
  gender: 'todos',
  ageMin: 18,
  ageMax: 55,
  distance: 50,
  verifiedOnly: false,
  hasBio: false,
  withPhotos: true,
  heightMin: 150,
  heightMax: 200,
  interests: [],
  lifestyle: {},
  zodiac: [],
  education: [],
};

interface Props {
  open: boolean;
  onClose: () => void;
  value: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

const INTERESTS = [
  '🎨 Arte', '✈️ Viagens', '🏋️ Fitness', '🎵 Música', '📚 Livros',
  '🍷 Vinho', '🎬 Cinema', '🌱 Natureza', '🐶 Animais', '🍳 Cozinhar',
  '🎮 Gaming', '📸 Fotografia', '⚽ Desporto', '☕ Café', '🧘 Yoga',
];
const ZODIAC = ['♈ Carneiro', '♉ Touro', '♊ Gémeos', '♋ Caranguejo', '♌ Leão', '♍ Virgem', '♎ Balança', '♏ Escorpião', '♐ Sagitário', '♑ Capricórnio', '♒ Aquário', '♓ Peixes'];
const EDUCATION = ['Secundário', 'Licenciatura', 'Mestrado', 'Doutoramento'];

export const FiltersSheet = ({ open, onClose, value, onChange, isPremium = false, onUpgrade }: Props) => {
  const [local, setLocal] = useState<DiscoveryFilters>(value);

  useEffect(() => { if (open) setLocal(value); }, [open, value]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('sheet-open');
    return () => document.body.classList.remove('sheet-open');
  }, [open]);

  const update = <K extends keyof DiscoveryFilters>(k: K, v: DiscoveryFilters[K]) => {
    hapticTap();
    setLocal((p) => ({ ...p, [k]: v }));
  };

  const apply = () => { hapticTap(); onChange(local); onClose(); };
  const reset = () => { hapticTap(); setLocal(DEFAULT_FILTERS); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(12px) saturate(140%)',
              WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[61] flex flex-col overflow-hidden rounded-t-[32px] text-white will-change-transform"
            style={{
              maxHeight: '92vh',
              background: 'rgba(14,12,20,0.98)',
              boxShadow: '0 -32px 80px -16px rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderBottom: 'none',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340, mass: 0.85 }}
          >
            {/* Header */}
            <div className="grid grid-cols-3 items-center px-6 pb-2 pt-2">
              <button
                onClick={onClose}
                className="text-left text-[15px] font-medium tracking-tight active:opacity-60"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Cancelar
              </button>
              <h2 className="text-center text-[17px] font-semibold tracking-tight">
                Filtros
              </h2>
              <button
                onClick={reset}
                className="text-right text-[15px] font-medium active:opacity-60"
                style={{ color: 'var(--brand-pink)' }}
              >
                Repor
              </button>
            </div>

            {/* Scroll content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Gender */}
              <Section title="Mostrar-me">
                <SegmentedControl
                  options={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'feminino', label: 'Mulheres' },
                    { value: 'masculino', label: 'Homens' },
                  ]}
                  value={local.gender}
                  onChange={(v) => update('gender', v as DiscoveryFilters['gender'])}
                />
              </Section>

              {/* Age */}
              <Section title="Idade" trailing={`${local.ageMin} – ${local.ageMax}`}>
                <RangeSlider
                  min={18} max={80}
                  valueMin={local.ageMin} valueMax={local.ageMax}
                  onChange={(a, b) => setLocal((p) => ({ ...p, ageMin: a, ageMax: b }))}
                />
              </Section>

              {/* Distance */}
              <Section title="Distância máxima" trailing={`${local.distance} km`}>
                <SingleSlider
                  min={1} max={200} value={local.distance}
                  onChange={(v) => setLocal((p) => ({ ...p, distance: v }))}
                />
              </Section>

              {/* Toggles list */}
              <div className="mt-6">
                <GroupedList>
                  <ToggleRow
                    icon={<BadgeCheck size={16} strokeWidth={2.2} />}
                    tint="var(--brand-pink)"
                    label="Apenas verificados"
                    value={isPremium && local.verifiedOnly}
                    onChange={(v) => { if (!isPremium) { onUpgrade?.(); return; } update('verifiedOnly', v); }}
                    locked={!isPremium}
                  />
                  <ToggleRow
                    icon={<Circle size={10} strokeWidth={0} fill="#30E37C" />}
                    tint="#30E37C"
                    label="Online agora"
                    value={local.onlineNow}
                    onChange={(v) => update('onlineNow', v)}
                  />
                  <ToggleRow
                    icon={<FileText size={16} strokeWidth={2.2} />}
                    tint="var(--brand-purple)"
                    label="Tem bio"
                    value={isPremium && local.hasBio}
                    onChange={(v) => { if (!isPremium) { onUpgrade?.(); return; } update('hasBio', v); }}
                    locked={!isPremium}
                    last
                  />
                </GroupedList>
              </div>

              {/* Premium banner */}
              <PremiumBanner isPremium={isPremium} onUpgrade={onUpgrade} />

              <PremiumSection title="Altura" locked={!isPremium} trailing={`${local.heightMin} – ${local.heightMax} cm`}>
                <RangeSlider
                  min={140} max={210}
                  valueMin={local.heightMin} valueMax={local.heightMax}
                  onChange={(a, b) => setLocal((p) => ({ ...p, heightMin: a, heightMax: b }))}
                  disabled={!isPremium}
                />
              </PremiumSection>

              <PremiumSection title="Interesses" locked={!isPremium}>
                <ChipGrid
                  options={INTERESTS}
                  selected={local.interests}
                  onToggle={(o) => {
                    if (!isPremium) return;
                    hapticTap();
                    setLocal((p) => ({
                      ...p,
                      interests: p.interests.includes(o) ? p.interests.filter((x) => x !== o) : [...p.interests, o],
                    }));
                  }}
                  disabled={!isPremium}
                />
              </PremiumSection>

              <PremiumSection title="Estilo de vida" locked={!isPremium}>
                <LifestyleRow label="Fuma" value={local.lifestyle.smoke} onChange={(v) => update('lifestyle', { ...local.lifestyle, smoke: v })} disabled={!isPremium} />
                <LifestyleRow label="Bebe" value={local.lifestyle.drink} onChange={(v) => update('lifestyle', { ...local.lifestyle, drink: v })} disabled={!isPremium} />
                <LifestyleRow label="Treina" value={local.lifestyle.workout} onChange={(v) => update('lifestyle', { ...local.lifestyle, workout: v })} disabled={!isPremium} last />
              </PremiumSection>

              <PremiumSection title="Signo" locked={!isPremium}>
                <ChipGrid
                  options={ZODIAC}
                  selected={local.zodiac}
                  onToggle={(o) => {
                    if (!isPremium) return;
                    hapticTap();
                    setLocal((p) => ({
                      ...p,
                      zodiac: p.zodiac.includes(o) ? p.zodiac.filter((x) => x !== o) : [...p.zodiac, o],
                    }));
                  }}
                  disabled={!isPremium}
                />
              </PremiumSection>

              <PremiumSection title="Educação" locked={!isPremium}>
                <ChipGrid
                  options={EDUCATION}
                  selected={local.education}
                  onToggle={(o) => {
                    if (!isPremium) return;
                    hapticTap();
                    setLocal((p) => ({
                      ...p,
                      education: p.education.includes(o) ? p.education.filter((x) => x !== o) : [...p.education, o],
                    }));
                  }}
                  disabled={!isPremium}
                />
              </PremiumSection>

              <div className="h-6" />
            </div>

            {/* Footer */}
            <div
              className="px-5 pt-3"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
                background: 'linear-gradient(180deg, rgba(14,12,20,0) 0%, rgba(14,12,20,0.95) 40%)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={apply}
                className="w-full rounded-full py-3.5 text-[16px] font-semibold text-white"
                style={{
                  background: 'var(--gradient-brand)',
                  boxShadow: '0 12px 32px -10px color-mix(in oklab, var(--brand-pink) 60%, transparent), inset 0 1px 0 rgba(255,255,255,0.25)',
                  letterSpacing: '0.01em',
                }}
              >
                Aplicar filtros
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ── Subcomponents ── */

const Section = ({ title, trailing, children }: { title: string; trailing?: string; children: React.ReactNode }) => (
  <div className="mt-6">
    <div className="mb-2 flex items-end justify-between px-0.5">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'rgba(255,255,255,0.38)' }}>{title}</h3>
      {trailing && <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{trailing}</span>}
    </div>
    {children}
  </div>
);

const PremiumSection = ({ title, trailing, locked, children }: { title: string; trailing?: string; locked: boolean; children: React.ReactNode }) => (
  <div className="mt-6">
    <div className="mb-2 flex items-end justify-between px-0.5">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'rgba(255,255,255,0.38)' }}>{title}</h3>
        {locked && <Lock size={11} style={{ color: 'var(--brand-pink)' }} />}
      </div>
      {trailing && <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{trailing}</span>}
    </div>
    <div style={{ opacity: locked ? 0.4 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
      {children}
    </div>
  </div>
);

const GroupedList = ({ children }: { children: React.ReactNode }) => (
  <div
    className="overflow-hidden rounded-2xl"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    {children}
  </div>
);

const ToggleRow = ({ icon, tint = 'var(--brand-pink)', label, value, onChange, last, locked }: { icon: ReactNode; tint?: string; label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean; locked?: boolean }) => (
  <button
    onClick={() => onChange(!value)}
    className="flex w-full items-center justify-between px-3.5 py-3.5 active:bg-white/[0.04] transition-colors"
    style={{ borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
  >
    <span className="flex items-center gap-3 text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.92)' }}>
      <span
        className="grid h-8 w-8 place-items-center rounded-[10px]"
        style={{
          background: `color-mix(in oklab, ${tint} 18%, rgba(255,255,255,0.03))`,
          border: `1px solid color-mix(in oklab, ${tint} 28%, transparent)`,
          color: tint,
        }}
      >
        {icon}
      </span>
      <span className="flex items-center gap-1.5">
        {label}
        {locked && <Lock size={11} style={{ color: 'var(--brand-pink)', opacity: 0.8 }} />}
      </span>
    </span>
    {locked ? (
      <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--brand-pink)' }}>Premium</span>
    ) : (
      <IOSSwitch checked={value} />
    )}
  </button>
);

const IOSSwitch = ({ checked }: { checked: boolean }) => (
  <span
    className="relative inline-flex h-[28px] w-[50px] flex-shrink-0 rounded-full transition-colors"
    style={{
      background: checked ? 'var(--brand-pink)' : 'rgba(120,120,128,0.28)',
    }}
  >
    <motion.span
      className="absolute top-[2px] h-[24px] w-[24px] rounded-full"
      style={{
        background: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.30), 0 0 0 0.5px rgba(0,0,0,0.04)',
      }}
      animate={{ left: checked ? 24 : 2 }}
      transition={{ type: 'spring', stiffness: 700, damping: 32 }}
    />
  </span>
);

const SegmentedControl = <T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) => (
  <div
    className="relative flex rounded-xl p-[3px]"
    style={{ background: 'rgba(118,118,128,0.22)' }}
  >
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="relative flex-1 rounded-[10px] py-[7px] text-[13px] font-semibold transition-colors"
          style={{ color: active ? '#fff' : 'rgba(255,255,255,0.60)' }}
        >
          {active && (
            <motion.span
              layoutId="seg-active-filter"
              className="absolute inset-0 rounded-[10px]"
              style={{
                background: 'rgba(80,80,84,0.92)',
                boxShadow: '0 3px 10px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
              }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

/* ── Sliders ── */

const thumbShadow = '0 1px 1px rgba(0,0,0,0.2), 0 3px 10px rgba(0,0,0,0.35), 0 0 0 4px color-mix(in oklab, var(--brand-pink) 25%, transparent)';

const SingleSlider = ({ min, max, value, onChange, disabled }: { min: number; max: number; value: number; onChange: (v: number) => void; disabled?: boolean }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="px-1 pt-2">
      <div className="relative h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: 'var(--brand-pink)',
            boxShadow: '0 0 10px color-mix(in oklab, var(--brand-pink) 50%, transparent)',
          }}
        />
        <input
          type="range" min={min} max={max} value={value} disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full appearance-none bg-transparent slider-ios"
        />
      </div>
    </div>
  );
};

const RangeSlider = ({ min, max, valueMin, valueMax, onChange, disabled }: {
  min: number; max: number; valueMin: number; valueMax: number; onChange: (a: number, b: number) => void; disabled?: boolean;
}) => {
  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;
  return (
    <div className="px-1 pt-2">
      <div className="relative h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${pctMin}%`,
            right: `${100 - pctMax}%`,
            background: 'var(--brand-pink)',
            boxShadow: '0 0 10px color-mix(in oklab, var(--brand-pink) 50%, transparent)',
          }}
        />
        <input
          type="range" min={min} max={max} value={valueMin} disabled={disabled}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax - 1), valueMax)}
          className="absolute inset-0 w-full appearance-none bg-transparent slider-ios pointer-events-auto"
          style={{ zIndex: 2 }}
        />
        <input
          type="range" min={min} max={max} value={valueMax} disabled={disabled}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin + 1))}
          className="absolute inset-0 w-full appearance-none bg-transparent slider-ios pointer-events-auto"
          style={{ zIndex: 3 }}
        />
      </div>
    </div>
  );
};

/* ── Chips ── */

const ChipGrid = ({ options, selected, onToggle, disabled }: { options: string[]; selected: string[]; onToggle: (v: string) => void; disabled?: boolean }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = selected.includes(o);
      return (
        <button
          key={o}
          onClick={() => onToggle(o)}
          disabled={disabled}
          className="rounded-full px-3.5 py-[7px] text-[13px] font-medium transition-all active:scale-[0.96]"
          style={{
            background: on ? 'var(--brand-pink)' : 'rgba(255,255,255,0.05)',
            color: on ? '#fff' : 'rgba(255,255,255,0.72)',
            border: `1px solid ${on ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: on ? '0 6px 16px -6px color-mix(in oklab, var(--brand-pink) 50%, transparent)' : 'none',
          }}
        >
          {o}
        </button>
      );
    })}
  </div>
);

/* ── Lifestyle ── */

const LifestyleRow = ({ label, value, onChange, disabled, last }: { label: string; value?: 'sim' | 'nao' | 'as_vezes'; onChange: (v: 'sim' | 'nao' | 'as_vezes') => void; disabled?: boolean; last?: boolean }) => (
  <div
    className="flex items-center justify-between px-3.5 py-3"
    style={{ borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
  >
    <span className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.92)' }}>{label}</span>
    <div className="flex gap-1.5">
      {(['sim', 'nao', 'as_vezes'] as const).map((v) => (
        <button
          key={v}
          onClick={() => !disabled && onChange(v)}
          disabled={disabled}
          className="rounded-lg px-3 py-[5px] text-[13px] font-medium transition-all active:scale-[0.96]"
          style={{
            background: value === v ? 'var(--brand-pink)' : 'rgba(255,255,255,0.05)',
            color: value === v ? '#fff' : 'rgba(255,255,255,0.55)',
            boxShadow: value === v ? '0 4px 10px -4px color-mix(in oklab, var(--brand-pink) 45%, transparent)' : 'none',
          }}
        >
          {v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : 'Às vezes'}
        </button>
      ))}
    </div>
  </div>
);

/* ── Premium Banner ── */

const PremiumBanner = ({ isPremium, onUpgrade }: { isPremium: boolean; onUpgrade?: () => void }) => {
  if (isPremium) return null;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onUpgrade}
      className="mt-6 flex w-full items-center gap-4 rounded-2xl p-4 text-left"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
        style={{
          background: 'linear-gradient(135deg, var(--brand-pink), var(--brand-purple))',
          boxShadow: '0 8px 20px -6px color-mix(in oklab, var(--brand-pink) 45%, transparent)',
        }}
      >
        <SparkleIcon />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold" style={{ color: '#fff' }}>Desbloquear filtros Premium</p>
        <p className="mt-0.5 text-[13px] font-medium leading-snug" style={{ color: 'rgba(255,255,255,0.50)' }}>
          Altura, interesses, signo e mais
        </p>
      </div>
      <div className="shrink-0 text-[20px]" style={{ color: 'var(--brand-pink)' }}>+</div>
    </motion.button>
  );
};

const SparkleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" /><path d="M9 5H5" /><path d="M19 15v4" /><path d="M15 17h4" />
  </svg>
);
