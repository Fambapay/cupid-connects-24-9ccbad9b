import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import {
  Settings, Pencil, BadgeCheck, Camera, FileText, Tag, ShieldCheck,
  Star, Zap, Heart, ChevronRight, Sparkles, Check, Eye, Flame,
} from 'lucide-react';
import { computeProfileCompletion } from '@/lib/profileCompletion';
import { hapticTap } from '@/hooks/useNativePlatform';
import { ProfileBundles } from '@/components/ProfileBundles';


export interface ProfileViewData {
  name: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  photos: string[];
  isVerified: boolean;
  isPremium: boolean;
  tier?: 'free' | 'select' | 'plus' | 'elite';
  heightCm?: number | null;
  lookingFor?: string | null;
  pets?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  workout?: string | null;
}

interface Props {
  profile: ProfileViewData;
  superLikeBalance?: number;
  boostBalance?: number;
  /** Legacy: receives the full updated photo list (data URLs). Prefer onAddFiles. */
  onPhotosChange?: (photos: string[]) => void;
  /** When provided, header file input uploads via this callback instead of local state. */
  onAddFiles?: (files: File[]) => Promise<void> | void;
  onEditProfile: () => void;
  onOpenSettings?: () => void;
  onVerify?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

const PINK = '#FF4FA3';

export function ProfileView({
  profile,
  superLikeBalance = 0,
  boostBalance = 0,
  onPhotosChange,
  onAddFiles,
  onEditProfile,
  onOpenSettings,
  onVerify,
  isAdmin,
  onOpenAdmin,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { name, age, city, bio, interests, photos, isVerified, isPremium, tier } = profile;
  const isElite = tier === 'elite';

  const completion = computeProfileCompletion({
    photosCount: photos.length, bio, interests, city, isVerified,
  });
  const superLikeCount = Math.max(0, superLikeBalance);
  const boostCount = Math.max(0, boostBalance);

  const suggestions = [
    { key: 'photo', Icon: Camera, title: 'Adiciona pelo menos 1 foto', desc: 'Até 2× mais Likes com 6 fotos.', boost: '+7%', done: photos.length >= 1, action: () => fileRef.current?.click() },
    { key: 'bio', Icon: FileText, title: 'Adiciona uma bio', desc: 'Mostra a tua personalidade.', boost: '+10%', done: !!bio, action: onEditProfile },
    { key: 'interests', Icon: Tag, title: 'Adiciona interesses', desc: 'Pessoas com gostos em comum.', boost: '+5%', done: interests.length >= 3, action: onEditProfile },
    { key: 'verify', Icon: ShieldCheck, title: 'Verifica o teu perfil', desc: 'Ganha o badge azul e mais confiança.', boost: '+10%', done: isVerified, action: () => onVerify?.() },
  ].filter(s => !s.done);

  const handleFiles = async (files: FileList) => {
    const slots = Math.max(0, 6 - photos.length);
    const arr = Array.from(files).slice(0, slots);
    if (arr.length === 0) return;
    setBusy(true);
    try {
      if (onAddFiles) {
        await onAddFiles(arr);
      } else if (onPhotosChange) {
        const urls = await Promise.all(arr.map(file => new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        })));
        onPhotosChange([...photos, ...urls]);
      }
    } finally { setBusy(false); }
  };

  // Single lightweight container fade — no per-item stagger/translate.
  // Per-child translateY on 5+ sections was thrashing layout on entry.
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  // Kept as an identity variant so existing `variants={itemVariants}` usages
  // stay valid without triggering their own animations.
  const itemVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="relative min-h-full pb-32"
      style={{
        background: 'var(--profile-bg)',
        willChange: 'opacity',
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Soft gradient backdrop — extends into the safe area (notch) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -z-0"
        style={{
          top: 'calc(-1 * env(safe-area-inset-top))',
          height: 'calc(280px + env(safe-area-inset-top))',
          opacity: 'var(--profile-glow-opacity, 1)',
          background:
            'radial-gradient(70% 60% at 50% 0%, rgba(255,79,163,0.28) 0%, rgba(255,79,163,0) 70%)',
        }}
      />



      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        style={{ display: 'none' }}
        disabled={busy}
      />

      {/* HEADER */}
      <motion.div variants={itemVariants} className="relative flex items-center justify-between px-5 pt-4 pb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative shrink-0 active:scale-95 transition-transform"
            aria-label="Trocar foto"
          >
            {/* gradient ring */}
            <div
              className="absolute -inset-[3px] rounded-full"
              style={{
                background: isPremium
                  ? 'conic-gradient(from 90deg, #FFD66B, #FF4FA3, #B13CFF, #FFD66B)'
                  : `conic-gradient(from 180deg, ${PINK}, rgba(255,79,163,0.2), ${PINK})`,
              }}
            />
            <div className="relative rounded-full bg-background p-[3px]">
              {photos[0] ? (
                <img
                  src={photos[0]}
                  alt={name}
                  width={68}
                  height={68}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="h-[68px] w-[68px] rounded-full object-cover"
                />
              ) : (
                <div className="h-[68px] w-[68px] rounded-full bg-muted grid place-items-center">
                  <Camera size={22} className="text-muted-foreground" />
                </div>
              )}
            </div>
            {isPremium && (
              <div
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full grid place-items-center ring-2 ring-background"
                style={{ background: 'linear-gradient(135deg,#FFD66B,#C89B0C)' }}
              >
                <Sparkles size={12} className="text-black" strokeWidth={3} />
              </div>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="block text-[22px] font-semibold tracking-tight text-foreground truncate leading-tight m-0">
              {name}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 mb-2">
              {age > 0 && (
                <span className="text-[14px] font-medium text-muted-foreground">
                  {age}
                </span>
              )}
              {isVerified && <BadgeCheck size={16} color="#5BB8FF" fill="#5BB8FF" stroke="#000" />}
              {isElite && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg,#FFD66B,#C9A84C)', color: '#000' }}
                >
                  Elite
                </span>
              )}
            </div>
            <button
              onClick={() => { hapticTap(); onEditProfile(); }}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-sm active:scale-95 transition-transform"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}
            >
              <Pencil size={13} strokeWidth={2.5} />
              <span className="text-[13px] font-bold tracking-tight">Editar perfil</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="h-10 w-10 rounded-full grid place-items-center active:scale-95 transition-transform shadow-rose"
              style={{ background: 'linear-gradient(135deg,#F0468C,#C9A84C)' }}
              aria-label="Painel admin"
            >
              <ShieldCheck size={18} className="text-white" />
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="h-10 w-10 rounded-full border border-border bg-card grid place-items-center active:scale-95 transition-transform"
            aria-label="Definições"
          >
            <Settings size={18} className="text-muted-foreground" />
          </button>
        </div>
      </motion.div>


      {/* PROGRESS */}
      <motion.div variants={itemVariants} className="relative px-5 pb-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: PINK }} />
              <span className="text-[18px] text-foreground tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
                Perfil completo
              </span>
            </div>
            <span className="text-[14px] font-extrabold tracking-tight" style={{ color: PINK }}>
              {completion}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${completion}%`,
                background: `linear-gradient(90deg, ${PINK}, #FF8AC2)`,
                boxShadow: `0 0 12px ${PINK}80`,
              }}
            />
          </div>
          {suggestions.length > 0 ? (
            <p className="text-[12px] text-muted-foreground mt-2.5 tracking-tight">
              Completa o teu perfil para seres visto por mais pessoas.
            </p>
          ) : (
            <p className="text-[12px] mt-2.5 tracking-tight font-semibold" style={{ color: PINK }}>
              ✨ Perfil completo — boa!
            </p>
          )}
        </div>
      </motion.div>

      {/* SUGGESTIONS */}
      {suggestions.length > 0 && (
        <motion.div variants={itemVariants} className="relative px-5 flex flex-col gap-2">
          {suggestions.map((s) => (
            <button
              key={s.key}
              onClick={s.action}
              className="group flex items-center gap-3.5 bg-card border border-border rounded-2xl p-3.5 text-left w-full active:scale-[0.99] transition-transform"
            >
              <div className="relative shrink-0">
                <div
                  className="h-11 w-11 rounded-xl grid place-items-center"
                  style={{ background: 'rgba(255,79,163,0.12)' }}
                >
                  <s.Icon size={20} color={PINK} strokeWidth={2} />
                </div>
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-md px-1.5 py-px text-[9px] font-extrabold text-white tracking-wider shadow-sm"
                  style={{ background: PINK }}
                >
                  {s.boost}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground tracking-tight mb-0.5">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{s.desc}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground opacity-50 shrink-0 group-active:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </motion.div>
      )}

      {/* QUICK ACTIONS */}
      <div className="relative grid grid-cols-3 gap-2.5 px-5 pt-4 pb-5">
        {[
          { Icon: Star, color: '#5BB8FF', label: 'Super Likes', count: String(superLikeCount), sub: superLikeCount > 0 ? 'disponíveis' : 'comprar', to: '/shop', search: { tab: 'super_like' as const } },
          { Icon: Zap, color: '#B13CFF', label: 'Boosts', count: String(boostCount), sub: boostCount > 0 ? 'disponíveis' : 'comprar', to: '/shop', search: { tab: 'boost' as const } },
          { Icon: Heart, color: PINK, label: 'Conta', count: isPremium ? '✓' : '–', sub: isPremium ? 'gerir' : 'upgrade', to: '/membership' },
        ].map((a, i) => (
          <Link
            key={i}
            to={a.to}
            {...('search' in a && a.search ? { search: a.search } : {})}
            onClick={() => hapticTap()}
            className="quick-action-card group relative isolate overflow-hidden rounded-2xl p-3 flex flex-col items-center text-center min-h-[118px] active:scale-[0.97] transition-transform"
            style={{
              ['--tint' as any]: a.color,
              background: `linear-gradient(160deg, ${a.color}1f 0%, ${a.color}0a 60%, rgba(255,255,255,0.02) 100%)`,
              border: `1px solid ${a.color}3d`,
            }}
          >
            <div
              aria-hidden
              className="quick-action-glow pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(60% 45% at 50% 22%, ${a.color}26 0%, transparent 70%)`,
              }}
            />

            <div
              className="relative h-11 w-11 rounded-full grid place-items-center mb-2"
              style={{
                background: `${a.color}1f`,
                border: `1px solid ${a.color}33`,
              }}
            >
              <a.Icon size={20} color={a.color} fill={a.color} strokeWidth={0} />
            </div>
            <p className="relative text-[20px] font-black tracking-tight leading-none" style={{ color: a.color }}>
              {a.count}
            </p>
            <p className="relative text-[12px] font-bold text-foreground tracking-tight mt-1 leading-tight">
              {a.label}
            </p>
            <p className="relative text-[10px] text-muted-foreground tracking-tight mt-0.5">
              {a.sub}
            </p>
          </Link>
        ))}
      </div>

      {/* BUNDLES & PACKS — upsell */}
      <ProfileBundles />

      {/* MEMBERSHIP CARD */}

      {!isPremium && (
        <div className="relative mx-5 mb-6">
          <div
            aria-hidden
            className="absolute -inset-px rounded-[22px] blur-md"
            style={{
              opacity: 'calc(0.7 * var(--profile-glow-opacity, 1))',
              background: `linear-gradient(135deg, ${PINK}, #B13CFF, #FFD66B)`,
            }}
          />
          <div className="relative bg-card border border-border rounded-[20px] p-5 overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
              style={{ opacity: 'calc(0.20 * var(--profile-glow-opacity, 1))', background: PINK }}
            />


            <div className="relative flex items-center gap-3 mb-1">
              <div
                className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${PINK}33, #B13CFF33)` }}
              >
                <Sparkles size={20} className="text-primary" strokeWidth={2.4} style={{ color: PINK }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-extrabold text-foreground tracking-tight">Hunie Membership</p>
                  <span className="rounded-full px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider"
                    style={{ background: `${PINK}22`, color: PINK }}>
                    Popular
                  </span>
                </div>
                <p className="text-xs text-muted-foreground tracking-tight mt-0.5">
                  Desbloqueia tudo a partir de 199 MZN/mês
                </p>
              </div>
            </div>

            <div className="relative flex flex-col gap-2.5 my-4">
              {[
                'Comunidade verificada, sem fakes',
                'Vê quem gostou de ti (Plus+)',
                'Likes ilimitados + Super Likes',
                'Discovery prioritário (Elite)',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="h-[18px] w-[18px] rounded-full grid place-items-center shrink-0" style={{ background: PINK }}>
                    <Check size={11} color="#fff" strokeWidth={3.5} />
                  </div>
                  <span className="text-[13.5px] text-foreground tracking-tight">{f}</span>
                </div>
              ))}
            </div>

            <Link
              to="/membership"
              onClick={() => hapticTap()}
              className="relative overflow-hidden w-full h-12 rounded-2xl text-sm font-extrabold tracking-tight grid place-items-center shadow-[0_10px_30px_-10px_rgba(255,79,163,0.6)]"
              style={{ background: `linear-gradient(135deg, ${PINK}, #B13CFF)`, color: '#fff' }}
            >
              <span className="relative z-10">Ver planos →</span>
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 blur-md animate-[shine_2.6s_linear_infinite]"
                style={{ animation: 'shine 2.6s linear infinite' }}
              />
            </Link>

            <p className="relative mt-2.5 text-center text-[10.5px] text-muted-foreground">
              +1.280 membros activaram esta semana · Cancela quando quiseres
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shine { 0% { transform: translateX(0%);} 100% { transform: translateX(450%);} }
      `}</style>
    </motion.div>
  );
}

function StatCell({
  Icon, color, value, label,
}: { Icon: typeof Heart; color: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <Icon size={16} color={color} fill={color} strokeWidth={0} />
      <span className="text-[15px] font-extrabold tracking-tight text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
    </div>
  );
}
