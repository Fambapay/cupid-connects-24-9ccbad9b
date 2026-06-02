import { useRef, useState } from 'react';
import {
  Settings, Pencil, BadgeCheck, Camera, FileText, Tag, ShieldCheck,
  Star, Zap, Heart, ChevronRight, Sparkles, Check,
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
}

const PINK = '#FF4FA3';

export function ProfileView({ profile, onPhotosChange, onEditProfile, onOpenSettings }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { name, city, bio, interests, photos, isVerified, isPremium } = profile;

  const completion = computeProfileCompletion({
    photosCount: photos.length, bio, interests, city, isVerified,
  });

  const suggestions = [
    { key: 'photo', Icon: Camera, title: 'Adiciona pelo menos 1 foto', desc: 'Até 2× mais Likes com 6 fotos.', boost: '+7%', done: photos.length >= 1, action: () => fileRef.current?.click() },
    { key: 'bio', Icon: FileText, title: 'Adiciona uma bio', desc: 'Mostra a tua personalidade.', boost: '+10%', done: !!bio, action: onEditProfile },
    { key: 'interests', Icon: Tag, title: 'Adiciona interesses', desc: 'Pessoas com gostos em comum.', boost: '+5%', done: interests.length >= 3, action: onEditProfile },
    { key: 'verify', Icon: ShieldCheck, title: 'Verifica o teu perfil', desc: 'Ganha o badge azul e mais confiança.', boost: '+10%', done: isVerified, action: () => {} },
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
      className="min-h-full pb-32"
      style={{
        background: 'var(--background)',
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
      }}
    >
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
      <div className="flex items-center justify-between px-5 pb-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative shrink-0"
            aria-label="Trocar foto"
          >
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
            {isPremium && (
              <div
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full grid place-items-center"
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
              {isVerified && <BadgeCheck size={20} color="#5BB8FF" fill="#5BB8FF" stroke="#000" />}
            </div>
            <button
              onClick={() => { hapticTap(); onEditProfile(); }}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}
            >
              <Pencil size={13} strokeWidth={2.5} />
              <span className="text-[13px] font-bold tracking-tight">Editar perfil</span>
            </button>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="h-10 w-10 rounded-full border border-border bg-card grid place-items-center shrink-0"
          aria-label="Definições"
        >
          <Settings size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* PROGRESS */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-semibold text-muted-foreground tracking-tight">
            Perfil completo
          </span>
          <span className="text-[13px] font-extrabold tracking-tight" style={{ color: PINK }}>
            {completion}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${completion}%`, background: PINK }}
          />
        </div>
        {suggestions.length > 0 && (
          <p className="text-[13px] text-muted-foreground mt-3 tracking-tight">
            Completa o teu perfil para seres visto por mais pessoas.
          </p>
        )}
      </div>

      {/* SUGGESTIONS */}
      {suggestions.length > 0 && (
        <div className="px-5 flex flex-col gap-2">
          {suggestions.map((s) => (
            <button
              key={s.key}
              onClick={s.action}
              className="flex items-center gap-3.5 bg-card border border-border rounded-2xl p-3.5 text-left w-full"
            >
              <div className="relative shrink-0">
                <div
                  className="h-11 w-11 rounded-xl grid place-items-center"
                  style={{ background: 'rgba(255,79,163,0.12)' }}
                >
                  <s.Icon size={20} color={PINK} strokeWidth={2} />
                </div>
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-md px-1.5 py-px text-[9px] font-extrabold text-white tracking-wider"
                  style={{ background: PINK }}
                >
                  {s.boost}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground tracking-tight mb-0.5">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{s.desc}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground opacity-50 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-3 gap-2.5 px-5 pt-4 pb-5">
        {[
          { Icon: Star, color: '#5BB8FF', label: '5 Super Likes', sub: 'Ver mais' },
          { Icon: Zap, color: '#B13CFF', label: 'Os meus Boosts', sub: 'Ver mais' },
          { Icon: Heart, color: PINK, label: 'Membership', sub: 'Gerir' },
        ].map((a, i) => (
          <button
            key={i}
            className="bg-card border border-border rounded-2xl p-3 flex flex-col items-start gap-2.5 text-left min-h-[108px]"
          >
            <div
              className="h-9 w-9 rounded-[10px] grid place-items-center"
              style={{ background: `${a.color}1F` }}
            >
              <a.Icon size={18} color={a.color} fill={a.color} strokeWidth={0} />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-foreground tracking-tight leading-tight">{a.label}</p>
              <p className="text-[11px] font-bold mt-1 uppercase tracking-wider" style={{ color: a.color }}>{a.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* MEMBERSHIP CARD */}
      {!isPremium && (
        <div className="mx-5 mb-6 bg-card border border-border rounded-[20px] p-5">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
              style={{ background: 'color-mix(in oklab, var(--primary) 14%, transparent)' }}
            >
              <Sparkles size={20} className="text-primary" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-extrabold text-foreground tracking-tight">Hunie Membership</p>
              <p className="text-xs text-muted-foreground tracking-tight mt-0.5">
                Subscreve para aceder à comunidade
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 my-4">
            {[
              'Comunidade verificada, sem fakes',
              '3 níveis: Select, Plus e Elite',
              'Vê quem gostou de ti (Plus+)',
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

          <button
            className="w-full h-12 rounded-2xl text-sm font-extrabold tracking-tight"
            style={{ background: PINK, color: '#fff' }}
          >
            Ver planos
          </button>
        </div>
      )}
    </div>
  );
}
