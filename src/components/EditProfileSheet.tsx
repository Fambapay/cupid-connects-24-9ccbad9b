import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Camera } from 'lucide-react';
import type { ProfileViewData } from './ProfileView';

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
}

export function EditProfileSheet({ open, profile, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setDraft(profile); }, [open, profile]);

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
    const urls = await Promise.all(arr.map(f => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    })));
    setDraft(d => ({ ...d, photos: [...d.photos, ...urls] }));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[9999] rounded-t-[28px] bg-background border-t border-border overflow-hidden flex flex-col"
            style={{ maxHeight: '92vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            {/* Handle + header */}
            <div className="pt-3 pb-2 flex flex-col items-center">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <button onClick={onClose} aria-label="Fechar" className="h-9 w-9 grid place-items-center rounded-full border border-border">
                <X size={18} />
              </button>
              <h2 className="text-base font-bold tracking-tight">Editar perfil</h2>
              <button
                onClick={() => { onSave(draft); onClose(); }}
                className="text-sm font-extrabold tracking-tight"
                style={{ color: '#FF4FA3' }}
              >
                Guardar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">
              {/* Photos */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Fotos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const url = draft.photos[i];
                    return (
                      <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border">
                        {url ? (
                          <>
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                              onClick={() => setDraft(d => ({ ...d, photos: d.photos.filter((_, j) => j !== i) }))}
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 grid place-items-center"
                              aria-label="Remover"
                            >
                              <Trash2 size={12} className="text-white" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="absolute inset-0 grid place-items-center text-muted-foreground"
                            aria-label="Adicionar foto"
                          >
                            <div className="h-9 w-9 rounded-full border-2 border-dashed border-current grid place-items-center">
                              <Plus size={16} />
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && addPhotos(e.target.files)}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <Camera size={16} /> Carregar fotos
                </button>
              </section>

              {/* Basics */}
              <section className="space-y-3">
                <Field
                  label="Nome"
                  value={draft.name}
                  onChange={(v) => setDraft(d => ({ ...d, name: v }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Idade"
                    type="number"
                    value={String(draft.age)}
                    onChange={(v) => setDraft(d => ({ ...d, age: Number(v) || 0 }))}
                  />
                  <Field
                    label="Cidade"
                    value={draft.city}
                    onChange={(v) => setDraft(d => ({ ...d, city: v }))}
                  />
                </div>
              </section>

              {/* Bio */}
              <section>
                <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Sobre mim</label>
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft(d => ({ ...d, bio: e.target.value.slice(0, 500) }))}
                  rows={4}
                  placeholder="Conta algo sobre ti..."
                  className="mt-2 w-full rounded-2xl bg-card border border-border p-4 text-sm text-foreground resize-none outline-none focus:border-foreground/30"
                />
                <p className="text-[11px] text-muted-foreground mt-1 text-right">{draft.bio.length}/500</p>
              </section>

              {/* Interests */}
              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Interesses
                  </h3>
                  <span className="text-[11px] text-muted-foreground">{draft.interests.length}/5</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_INTERESTS.map((i) => {
                    const active = draft.interests.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleInterest(i)}
                        className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold tracking-tight border transition-colors"
                        style={{
                          background: active ? '#FF4FA3' : 'transparent',
                          color: active ? '#fff' : 'var(--foreground)',
                          borderColor: active ? '#FF4FA3' : 'var(--border)',
                        }}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl bg-card border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/30"
      />
    </label>
  );
}
