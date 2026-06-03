import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileView, type ProfileViewData } from '@/components/ProfileView';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { VerificationModal } from '@/components/VerificationModal';
import { BottomNav } from '@/components/BottomNav';
import { useProfile } from '@/hooks/useProfile';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useSubscription } from '@/hooks/useSubscription';

import { requireAuthAndOnboarding } from '@/lib/authGuard';

export const Route = createFileRoute('/profile')({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: 'Meu perfil — Hunie' },
      { name: 'description', content: 'Gere o teu perfil.' },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, updateProfile, reload } = useProfile();
  const { photos, upload, remove } = usePhotoUpload();
  const { isPremium } = useSubscription();
  const [editing, setEditing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const view: ProfileViewData = useMemo(
    () => ({
      name: profile?.name ?? '',
      age: profile?.age ?? 0,
      city: profile?.city ?? '',
      bio: profile?.bio ?? '',
      interests: profile?.interests ?? [],
      photos: photos.map((p) => p.url ?? '').filter(Boolean),
      isVerified: !!profile?.is_verified,
      isPremium,
    }),
    [profile, photos, isPremium],
  );

  const handleAddFiles = async (files: File[]) => {
    for (const f of files) {
      try {
        await upload(f);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar foto';
        toast.error(msg);
      }
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const row = photos[index];
    if (!row) return;
    try {
      await remove(row.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao remover foto';
      toast.error(msg);
    }
  };

  const handleSave = async (next: ProfileViewData) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile({
        name: next.name.trim() || null,
        city: next.city.trim() || null,
        bio: next.bio.trim() || null,
        interests: next.interests,
      });
      toast.success('Perfil atualizado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Link
        to="/settings"
        className="fixed top-4 right-4 z-30 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center backdrop-blur-md"
        aria-label="Definições"
      >
        <SettingsIcon className="w-5 h-5 text-foreground" />
      </Link>
      <ProfileView
        profile={view}
        onAddFiles={handleAddFiles}
        onEditProfile={() => setEditing(true)}
        onVerify={() => setVerifying(true)}
      />
      <EditProfileSheet
        open={editing}
        profile={view}
        onClose={() => setEditing(false)}
        onSave={handleSave}
        onAddFiles={handleAddFiles}
        onRemovePhoto={handleRemovePhoto}
      />
      <VerificationModal
        open={verifying}
        onOpenChange={setVerifying}
        onConfirm={() => {
          // Refresh from DB so is_verified reflects the real backend state.
          reload();
        }}
      />
      <BottomNav />
    </div>
  );
}
