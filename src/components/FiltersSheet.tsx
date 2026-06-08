import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock, X, BadgeCheck, Circle, FileText, Camera, Sparkles } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { hapticTap } from '@/hooks/useNativePlatform';

export interface DiscoveryFilters {
  gender: 'todos' | 'feminino' | 'masculino' | 'nao_binario';
  ageMin: number;
  ageMax: number;
  distance: number;
  verifiedOnly: boolean;
  onlineNow: boolean;
  hasBio: boolean;
  withPhotos: boolean;
  // Premium
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
  onlineNow: false,
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
            className="fixed inset-0 z-[60] bg-black/60"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[61] flex flex-col overflow-hidden rounded-t-[32px] text-white"
            style={{
              maxHeight: '92vh',
              background:
                'radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--brand-pink) 14%, transparent) 0%, transparent 55%), linear-gradient(180deg, rgba(22,20,28,0.96) 0%, rgba(14,12,18,0.985) 100%)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow:
                '0 -20px 60px -10px rgba(0,0,0,0.6), 0 -1px 0 0 color-mix(in oklab, var(--brand-pink) 18%, transparent) inset',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* Grabber */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-[5px] w-10 rounded-full bg-white/25" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <button
                onClick={onClose}
                className="text-[15px] font-medium text-white/65 active:opacity-60"
                style={{ minWidth: 56 }}
              >
                Cancelar
              </button>
              <h2
                className="text-[17px] font-semibold tracking-tight"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--brand-pink) 0%, var(--brand-purple) 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Filtros
              </h2>
              <button
                onClick={reset}
                className="text-[15px] font-medium active:opacity-60"
                style={{ minWidth: 56, textAlign: 'right', color: 'color-mix(in oklab, var(--brand-pink) 75%, white)' }}
              >
                Repor
              </button>
            </div>


            {/* Scroll content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Gender */}
              <Section title="Mostrar-me">
                <SegmentedControl
                  options={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'feminino', label: 'Mulheres' },
                    { value: 'masculino', label: 'Homens' },
                    { value: 'nao_binario', label: 'Não-binário' },
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

              {/* Toggles list (iOS-style grouped) */}
              <GroupedList>
                <ToggleRow icon={<BadgeCheck size={17} strokeWidth={2.2} />} tint="var(--brand-pink)" label="Apenas verificados" value={local.verifiedOnly} onChange={(v) => update('verifiedOnly', v)} />
                <ToggleRow icon={<Circle size={11} strokeWidth={0} fill="#22c55e" />} tint="#22c55e" label="Online agora" value={local.onlineNow} onChange={(v) => update('onlineNow', v)} />
                <ToggleRow icon={<FileText size={17} strokeWidth={2.2} />} tint="var(--brand-purple)" label="Tem bio" value={local.hasBio} onChange={(v) => update('hasBio', v)} />
                <ToggleRow icon={<Camera size={17} strokeWidth={2.2} />} tint="var(--brand-magenta)" label="Com fotos" value={local.withPhotos} onChange={(v) => update('withPhotos', v)} last />
              </GroupedList>


              {/* Premium block */}
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

              <div className="h-4" />
            </div>

            {/* Footer */}
            <div
              className="px-4 pt-3"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)',
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={apply}
                className="w-full rounded-2xl py-4 text-[17px] font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg,#ec4899 0%,#a855f7 100%)',
                  boxShadow: '0 10px 30px -8px rgba(236,72,153,0.55)',
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

/* ----------------------------- Subcomponents ----------------------------- */

const Section = ({ title, trailing, children }: { title: string; trailing?: string; children: React.ReactNode }) => (
  <div className="mt-5">
    <div className="mb-2 flex items-end justify-between px-1">
      <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white/50">{title}</h3>
      {trailing && <span className="text-[13px] font-medium text-white/80">{trailing}</span>}
    </div>
    {children}
  </div>
);

const PremiumSection = ({ title, trailing, locked, children }: { title: string; trailing?: string; locked: boolean; children: React.ReactNode }) => (
  <div className="mt-5">
    <div className="mb-2 flex items-end justify-between px-1">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white/50">{title}</h3>
        {locked && <Lock size={11} className="text-amber-400" />}
      </div>
      {trailing && <span className="text-[13px] font-medium text-white/80">{trailing}</span>}
    </div>
    <div style={{ opacity: locked ? 0.45 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
      {children}
    </div>
  </div>
);

const GroupedList = ({ children }: { children: React.ReactNode }) => (
  <div
    className="mt-5 overflow-hidden rounded-2xl"
    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
  >
    {children}
  </div>
);

const ToggleRow = ({ icon, tint = 'var(--brand-pink)', label, value, onChange, last }: { icon: ReactNode; tint?: string; label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) => (
  <button
    onClick={() => onChange(!value)}
    className="flex w-full items-center justify-between px-3.5 py-3 active:bg-white/5 transition-colors"
    style={{ borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
  >
    <span className="flex items-center gap-3 text-[15.5px]">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg text-white"
        style={{
          background: `color-mix(in oklab, ${tint} 22%, rgba(255,255,255,0.04))`,
          border: `1px solid color-mix(in oklab, ${tint} 35%, transparent)`,
          color: tint,
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </span>
    <IOSSwitch checked={value} />
  </button>
);


const IOSSwitch = ({ checked }: { checked: boolean }) => (
  <span
    className="relative inline-flex h-[30px] w-[50px] flex-shrink-0 rounded-full transition-colors"
    style={{
      background: checked
        ? 'linear-gradient(135deg, var(--brand-pink) 0%, var(--brand-purple) 100%)'
        : 'rgba(120,120,128,0.32)',
      boxShadow: checked
        ? '0 0 0 1px color-mix(in oklab, var(--brand-pink) 35%, transparent), 0 6px 16px -6px color-mix(in oklab, var(--brand-pink) 60%, transparent)'
        : 'inset 0 0 0 1px rgba(255,255,255,0.04)',
    }}
  >
    <motion.span
      className="absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white"
      style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(0,0,0,0.04)' }}
      animate={{ left: checked ? 22 : 2 }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
    />
  </span>
);


const SegmentedControl = <T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) => (
  <div className="relative flex rounded-xl p-[3px]" style={{ background: 'rgba(118,118,128,0.24)' }}>
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="relative flex-1 rounded-[9px] py-1.5 text-[13px] font-medium transition-colors"
          style={{ color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}
        >
          {active && (
            <motion.span
              layoutId="seg-active"
              className="absolute inset-0 rounded-[9px]"
              style={{ background: 'rgba(99,99,102,0.95)', boxShadow: '0 3px 8px rgba(0,0,0,0.35)' }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

const SingleSlider = ({ min, max, value, onChange, disabled }: { min: number; max: number; value: number; onChange: (v: number) => void; disabled?: boolean }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="px-1 pt-1.5">
      <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ec4899,#a855f7)' }} />
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
    <div className="px-1 pt-1.5">
      <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div className="absolute inset-y-0 rounded-full" style={{ left: `${pctMin}%`, right: `${100 - pctMax}%`, background: 'linear-gradient(90deg,#ec4899,#a855f7)' }} />
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

const ChipGrid = ({ options, selected, onToggle, disabled }: { options: string[]; selected: string[]; onToggle: (v: string) => void; disabled?: boolean }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = selected.includes(o);
      return (
        <button
          key={o}
          onClick={() => onToggle(o)}
          disabled={disabled}
          className="rounded-full px-3.5 py-2 text-[13px] font-medium transition-all"
          style={{
            background: on ? 'linear-gradient(135deg,#ec4899,#a855f7)' : 'rgba(255,255,255,0.08)',
            border: on ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          }}
        >
          {o}
          {on && <Check size={12} className="ml-1.5 inline" />}
        </button>
      );
    })}
  </div>
);

const LifestyleRow = ({ label, value, onChange, disabled, last }: {
  label: string; value?: 'sim' | 'nao' | 'as_vezes'; onChange: (v: 'sim' | 'nao' | 'as_vezes' | undefined) => void; disabled?: boolean; last?: boolean;
}) => {
  const opts: { v: 'sim' | 'nao' | 'as_vezes'; l: string }[] = [
    { v: 'sim', l: 'Sim' }, { v: 'nao', l: 'Não' }, { v: 'as_vezes', l: 'Às vezes' },
  ];
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)' }}
    >
      <span className="text-[15px]">{label}</span>
      <div className="flex gap-1.5">
        {opts.map((o) => {
          const on = value === o.v;
          return (
            <button
              key={o.v}
              disabled={disabled}
              onClick={() => onChange(on ? undefined : o.v)}
              className="rounded-full px-3 py-1 text-[12px] font-medium"
              style={{
                background: on ? 'rgba(236,72,153,0.85)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PremiumBanner = ({ isPremium, onUpgrade }: { isPremium: boolean; onUpgrade?: () => void }) => {
  if (isPremium) {
    return (
      <div
        className="mt-6 flex items-center gap-2 rounded-2xl px-4 py-3"
        style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.25)' }}
      >
        <span className="text-base">⭐</span>
        <span className="text-[13px] font-semibold text-amber-200">Filtros Premium ativos</span>
      </div>
    );
  }
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onUpgrade}
      className="mt-6 flex w-full items-center gap-3 rounded-2xl p-4 text-left"
      style={{
        background: 'linear-gradient(135deg,rgba(251,191,36,0.18) 0%,rgba(236,72,153,0.18) 100%)',
        border: '1px solid rgba(251,191,36,0.3)',
      }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
      >
        ⭐
      </div>
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-white">Desbloquear filtros Premium</div>
        <div className="text-[12px] text-white/65">Altura, interesses, signo e mais</div>
      </div>
      <X size={18} className="rotate-45 text-white/50" />
    </motion.button>
  );
};
