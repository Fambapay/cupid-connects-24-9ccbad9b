import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Settings, Pencil, BadgeCheck, Camera, FileText, Tag, ShieldCheck,
  Star, Zap, Heart, ChevronRight, Sparkles, Check, Eye, Flame,
} from 'lucide-react';
import { computeProfileCompletion } from '@/lib/profileCompletion';
import { hapticTap } from '@/hooks/useNativePlatform';

export interface ProfileViewData {
  name: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  photos: string[];
  isVerified: boolean;
  isPremium: boolean;
}

interface Props {
  profile: ProfileViewData;
  onPhotosChange: (photos: string[]) => void;
  onEditProfile: () => void;
  onOpenSettings?: () => void;
  onVerify?: () => void;
}

const PINK = '#FF4FA3';

export function ProfileView({ profile, onPhotosChange, onEditProfile, onOpenSettings, onVerify }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { name, age, city, bio, interests, photos, isVerified, isPremium } = profile;

  const completion = computeProfileCompletion({
    photosCount: photos.length, bio, interests, city, isVerified,
  });

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
      const urls = await Promise.all(arr.map(file => new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      })));
      onPhotosChange([...photos, ...urls]);
    } finally { setBusy(false); }
  };

  return (
    <div
      className="relative min-h-full pb-32"
      style={{
        background: 'var(--background)',
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
      }}
    >
      {/* Soft gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[280px]"
        style={{
          background:
            'radial-gradient(70% 60% at 50% 0%, rgba(255,79,163,0.22) 0%, rgba(255,79,163,0) 70%)',
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
      <div className="relative flex items-center justify-between px-5 pb-5">
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

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[22px] font-semibold tracking-tight text-foreground truncate">
                {name}
              </span>
              {age > 0 && (
                <span className="text-[15px] font-medium text-muted-foreground">
                  {age}
                </span>
              )}
              {isVerified && <BadgeCheck size={20} color="#5BB8FF" fill="#5BB8FF" stroke="#000" />}
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

        <button
          onClick={onOpenSettings}
          className="h-10 w-10 rounded-full border border-border bg-card grid place-items-center shrink-0 active:scale-95 transition-transform"
          aria-label="Definições"
        >
          <Settings size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* STATS ROW — social validation */}
      <div className="relative mx-5 mb-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-card">
        <StatCell Icon={Heart} color={PINK} value="—" label="Likes" />
        <div className="border-x border-border">
          <StatCell Icon={Eye} color="#5BB8FF" value="—" label="Visitas" />
        </div>
        <StatCell Icon={Flame} color="#FFA94D" value="—" label="Matches" />
      </div>

      {/* PROGRESS */}
      <div className="relative px-5 pb-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: PINK }} />
              <span className="text-[13px] font-semibold text-foreground tracking-tight">
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
      </div>

      {/* SUGGESTIONS */}
      {suggestions.length > 0 && (
        <div className="relative px-5 flex flex-col gap-2">
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
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="relative grid grid-cols-3 gap-2.5 px-5 pt-4 pb-5">
        {[
          { Icon: Star, color: '#5BB8FF', label: '5 Super Likes', sub: 'Ver mais', to: '/shop', search: { tab: 'super_like' as const } },
          { Icon: Zap, color: '#B13CFF', label: 'Os meus Boosts', sub: 'Ver mais', to: '/shop', search: { tab: 'boost' as const } },
          { Icon: Heart, color: PINK, label: 'Membership', sub: 'Gerir', to: '/membership' },
        ].map((a, i) => (
          <Link
            key={i}
            to={a.to}
            {...('search' in a && a.search ? { search: a.search } : {})}
            onClick={() => hapticTap()}
            className="relative overflow-hidden bg-card border border-border rounded-2xl p-3 flex flex-col items-start gap-2.5 text-left min-h-[108px] active:scale-[0.98] transition-transform"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-30 blur-2xl"
              style={{ background: a.color }}
            />
            <div
              className="relative h-9 w-9 rounded-[10px] grid place-items-center"
              style={{ background: `${a.color}1F` }}
            >
              <a.Icon size={18} color={a.color} fill={a.color} strokeWidth={0} />
            </div>
            <div className="relative">
              <p className="text-[12.5px] font-semibold text-foreground tracking-tight leading-tight">{a.label}</p>
              <p className="text-[11px] font-bold mt-1 uppercase tracking-wider" style={{ color: a.color }}>{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* MEMBERSHIP CARD */}
      {!isPremium && (
        <div className="relative mx-5 mb-6">
          <div
            aria-hidden
            className="absolute -inset-px rounded-[22px] opacity-70 blur-md"
            style={{ background: `linear-gradient(135deg, ${PINK}, #B13CFF, #FFD66B)` }}
          />
          <div className="relative bg-card border border-border rounded-[20px] p-5 overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
              style={{ background: PINK }}
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
    </div>
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
