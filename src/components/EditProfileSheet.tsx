import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Camera, Star } from 'lucide-react';
import type { ProfileViewData } from './ProfileView';
import {
  LOOKING_FOR_LABELS,
  PETS_LABELS,
  SMOKING_LABELS,
  DRINKING_LABELS,
  WORKOUT_LABELS,
} from '@/lib/lifestyleLabels';

const SUGGESTED_INTERESTS = [
  'Surf', 'Viagens', 'Design', 'Música', 'Fotografia', 'Café', 'Vinho',
  'Yoga', 'Cinema', 'Livros', 'Cozinhar', 'Ginásio', 'Padel', 'Praia',
  'Trekking', 'Arte', 'Dança', 'Concertos', 'Animais', 'Tecnologia',
];

interface Props {
  open: boolean;
  profile: ProfileViewData;
  onClose: () => void;
  onSave: (next: ProfileViewData) => void;
  /** When provided, photo add/remove persist immediately via parent. */
  onAddFiles?: (files: File[]) => Promise<void> | void;
  onRemovePhoto?: (index: number) => Promise<void> | void;
  photoBusy?: boolean;
}

export function EditProfileSheet({
  open,
  profile,
  onClose,
  onSave,
  onAddFiles,
  onRemovePhoto,
  photoBusy = false,
}: Props) {
  const [draft, setDraft] = useState(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setDraft(profile); }, [open, profile]);

  // Keep photos in sync with parent (uploads happen immediately).
  useEffect(() => {
    setDraft((d) => ({ ...d, photos: profile.photos }));
  }, [profile.photos]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('sheet-open');
    return () => document.body.classList.remove('sheet-open');
  }, [open]);

  const toggleInterest = (i: string) => {
    setDraft(d => ({
      ...d,
      interests: d.interests.includes(i)
        ? d.interests.filter(x => x !== i)
        : d.interests.length >= 5 ? d.interests : [...d.interests, i],
    }));
  };

  const addPhotos = async (files: FileList) => {
    const slots = Math.max(0, 6 - draft.photos.length);
    const arr = Array.from(files).slice(0, slots);
    if (arr.length === 0) return;
    if (onAddFiles) {
      await onAddFiles(arr);
      return;
    }
    // Fallback (no parent handler): data URL preview only.
    const urls = await Promise.all(arr.map(f => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    })));
    setDraft(d => ({ ...d, photos: [...d.photos, ...urls] }));
  };

  const removePhoto = async (i: number) => {
    if (onRemovePhoto) {
      await onRemovePhoto(i);
      return;
    }
    setDraft(d => ({ ...d, photos: d.photos.filter((_, j) => j !== i) }));
  };

  const photoCount = draft.photos.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            style={{
              background: 'var(--edit-sheet-backdrop)',
              backdropFilter: 'blur(8px)',
            }}
          />
          <motion.section
            className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col overflow-hidden rounded-t-[32px] will-change-transform"
            style={{
              height: 'min(92dvh, 92vh)',
              background: 'var(--edit-sheet-bg)',
              borderTop: '1px solid var(--edit-sheet-border)',
              boxShadow:
                '0 -24px 70px -12px rgba(0,0,0,0.28), 0 -2px 0 rgba(255,255,255,0.04) inset',
              backdropFilter: 'blur(30px) saturate(140%)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 0.9 }}
          >

            {/* Header */}
            <div className="relative shrink-0 grid grid-cols-[auto_1fr_auto] items-center px-5 pb-3 pt-2">
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="grid h-9 w-9 place-items-center rounded-full transition-colors active:scale-95"
                style={{
                  background: 'var(--edit-sheet-btn-bg)',
                  border: '1px solid var(--edit-sheet-btn-border)',
                }}
              >
                <X size={18} style={{ color: 'var(--edit-sheet-fg)', opacity: 0.85 }} />
              </button>
              <h2
                className="text-[15px] font-bold tracking-tight text-center"
                style={{ color: 'var(--edit-sheet-fg)' }}
              >
                Editar perfil
              </h2>
              <button
                onClick={() => { onSave(draft); onClose(); }}
                className="rounded-full px-4 py-2 text-[13px] font-semibold transition-transform active:scale-[0.97]"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)',
                  color: '#fff',
                  boxShadow:
                    '0 10px 24px -10px color-mix(in oklab, var(--brand-pink) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)',
                }}
              >
                Guardar
              </button>
            </div>

            <div className="relative flex-1 min-h-0 space-y-7 overflow-y-auto overscroll-contain px-5 pb-10 pt-2">

              {/* Photos */}
              <section>
                <SectionHeader
                  title="Fotos"
                  hint={`${photoCount}/6`}
                />
                <div className="grid grid-cols-3 gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const url = draft.photos[i];
                    const isPrimary = i === 0;
                    return (
                      <div
                        key={i}
                        className="group relative aspect-[3/4] overflow-hidden rounded-2xl transition-all"
                        style={{
                          background: url
                            ? 'var(--edit-sheet-photo-bg-filled)'
                            : 'var(--edit-sheet-photo-bg-empty)',
                          border: url
                            ? '1px solid var(--edit-sheet-photo-border-filled)'
                            : 'var(--edit-sheet-photo-border-empty)',
                          boxShadow: url ? '0 6px 16px -10px rgba(0,0,0,0.6)' : 'none',
                        }}
                      >
                        {url ? (
                          <>
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <div
                              className="pointer-events-none absolute inset-x-0 top-0 h-12"
                              style={{
                                background: 'var(--edit-sheet-overlay-top)',
                              }}
                            />
                            {isPrimary && (
                              <div
                                className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)',
                                  boxShadow: '0 4px 10px -3px rgba(255,79,163,0.5)',
                                }}
                              >
                                <Star size={9} fill="currentColor" strokeWidth={0} />
                                Principal
                              </div>
                            )}
                            <button
                              onClick={() => removePhoto(i)}
                              disabled={photoBusy}
                              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full backdrop-blur-md disabled:opacity-60"
                              style={{
                                background: 'var(--edit-sheet-remove-bg)',
                                border: '1px solid var(--edit-sheet-btn-border)',
                              }}
                              aria-label="Remover"
                            >
                              <Trash2 size={12} className="text-white" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="absolute inset-0 grid place-items-center transition-transform active:scale-95"
                            aria-label="Adicionar foto"
                          >
                            <div
                              className="grid h-9 w-9 place-items-center rounded-full transition-transform group-hover:scale-105"
                              style={{
                                background: 'var(--edit-sheet-btn-bg)',
                                border: '1px solid var(--edit-sheet-btn-border)',
                                backdropFilter: 'blur(8px)',
                              }}
                            >
                              <Plus size={16} style={{ color: 'var(--edit-sheet-fg)', opacity: 0.8 }} strokeWidth={2.4} />
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-3.5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors active:scale-[0.98]"
                  style={{
                    background: 'var(--edit-sheet-btn-bg)',
                    border: '1px solid var(--edit-sheet-btn-border)',
                    color: 'var(--edit-sheet-fg)',
                    opacity: 0.9,
                  }}
                >
                  <Camera size={14} className="text-flame" /> Carregar fotos
                </button>
              </section>

              {/* Basics */}
              <section className="space-y-3.5">
                <Field
                  label="Nome"
                  value={draft.name}
                  onChange={(v) => setDraft(d => ({ ...d, name: v }))}
                />
                <Field
                  label="Cidade"
                  value={draft.city}
                  onChange={(v) => setDraft(d => ({ ...d, city: v }))}
                />
              </section>

              {/* Bio */}
              <section>
                <SectionHeader title="Sobre mim" hint={`${draft.bio.length}/500`} />
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft(d => ({ ...d, bio: e.target.value.slice(0, 500) }))}
                  rows={4}
                  placeholder="Diz-nos quem és, em poucas linhas."
                  className="hunie-input w-full resize-none p-4 text-[14px] leading-relaxed outline-none"
                  style={{
                    color: 'var(--edit-sheet-fg)',
                  }}
                />
              </section>

              {/* Interests */}
              <section>
                <SectionHeader title="Interesses" hint={`${draft.interests.length}/5`} />
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_INTERESTS.map((i) => {
                    const active = draft.interests.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleInterest(i)}
                        className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold tracking-tight transition-all active:scale-[0.96]"
                        style={
                          active
                            ? {
                                backgroundImage:
                                  'linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)',
                                color: '#fff',
                                border: '1px solid transparent',
                                boxShadow:
                                  '0 8px 18px -8px color-mix(in oklab, var(--brand-pink) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)',
                              }
                            : {
                                background: 'var(--edit-sheet-btn-bg)',
                                color: 'var(--edit-sheet-fg)',
                                border: '1px solid var(--edit-sheet-btn-border)',
                                opacity: 0.85,
                              }
                        }
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Altura */}
              <section>
                <SectionHeader title="Altura" hint={draft.heightCm ? `${draft.heightCm} cm` : 'Opcional'} />
                <input
                  type="range"
                  min={140}
                  max={210}
                  step={1}
                  value={draft.heightCm ?? 170}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, heightCm: Number(e.target.value) }))
                  }
                  className="w-full accent-[color:var(--brand-pink)]"
                />
                {draft.heightCm != null && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, heightCm: null }))}
                    className="mt-2 text-[12px] font-medium"
                    style={{ color: 'var(--edit-sheet-fg-dim)' }}
                  >
                    Não indicar
                  </button>
                )}
              </section>

              {/* À procura de */}
              <section>
                <SectionHeader title="À procura de" />
                <OptionGrid
                  value={draft.lookingFor ?? null}
                  options={LOOKING_FOR_LABELS}
                  onChange={(v) => setDraft((d) => ({ ...d, lookingFor: v }))}
                />
              </section>

              {/* Estilo de vida */}
              <section className="space-y-5">
                <SectionHeader title="Estilo de vida" />
                <LifestyleRow
                  label="Animais"
                  value={draft.pets ?? null}
                  options={PETS_LABELS}
                  onChange={(v) => setDraft((d) => ({ ...d, pets: v }))}
                />
                <LifestyleRow
                  label="Fumo"
                  value={draft.smoking ?? null}
                  options={SMOKING_LABELS}
                  onChange={(v) => setDraft((d) => ({ ...d, smoking: v }))}
                />
                <LifestyleRow
                  label="Bebida"
                  value={draft.drinking ?? null}
                  options={DRINKING_LABELS}
                  onChange={(v) => setDraft((d) => ({ ...d, drinking: v }))}
                />
                <LifestyleRow
                  label="Treino"
                  value={draft.workout ?? null}
                  options={WORKOUT_LABELS}
                  onChange={(v) => setDraft((d) => ({ ...d, workout: v }))}
                />
              </section>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3
        className="text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--edit-sheet-fg-muted)', opacity: 0.75 }}
      >
        {title}
      </h3>
      {hint && (
        <span className="text-[11px] font-medium" style={{ color: 'var(--edit-sheet-fg-dim)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span
        className="text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--edit-sheet-fg-muted)', opacity: 0.75 }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hunie-input mt-2 w-full px-4 py-3 text-[14px] outline-none"
        style={{ color: 'var(--edit-sheet-fg)' }}
      />
    </label>
  );
}

function OptionGrid({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: Record<string, string>;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(options).map(([key, label]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(active ? null : key)}
            className="rounded-2xl px-3 py-2.5 text-[13px] font-semibold tracking-tight transition-all active:scale-[0.97]"
            style={
              active
                ? {
                    backgroundImage:
                      'linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)',
                    color: '#fff',
                    border: '1px solid transparent',
                    boxShadow:
                      '0 8px 18px -8px color-mix(in oklab, var(--brand-pink) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)',
                  }
                : {
                    background: 'var(--edit-sheet-btn-bg)',
                    color: 'var(--edit-sheet-fg)',
                    border: '1px solid var(--edit-sheet-btn-border)',
                    opacity: 0.9,
                  }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function LifestyleRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Record<string, string>;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <div
        className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--edit-sheet-fg-muted)', opacity: 0.75 }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([key, l]) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(active ? null : key)}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold tracking-tight transition-all active:scale-[0.96]"
              style={
                active
                  ? {
                      backgroundImage:
                        'linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)',
                      color: '#fff',
                      border: '1px solid transparent',
                    }
                  : {
                      background: 'var(--edit-sheet-btn-bg)',
                      color: 'var(--edit-sheet-fg)',
                      border: '1px solid var(--edit-sheet-btn-border)',
                      opacity: 0.85,
                    }
              }
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

