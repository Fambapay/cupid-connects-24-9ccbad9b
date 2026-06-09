import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppleToast } from '@/components/notifications/AppleToast';
import { ProfileView, type ProfileViewData } from '@/components/ProfileView';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { VerificationModal } from '@/components/VerificationModal';
import { BottomNav } from '@/components/BottomNav';
import { useProfile } from '@/hooks/useProfile';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';

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
  const navigate = useNavigate();
  const { profile, updateProfile, reload } = useProfile();
  const { photos, upload, remove } = usePhotoUpload();
  const { isPremium, subscription } = useSubscription();
  const { credits } = useCredits();
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
      tier: subscription.membershipTier,
    }),
    [profile, photos, isPremium, subscription.membershipTier],
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

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    supabase.from('admin_emails').select('email').maybeSingle().then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ProfileView
        profile={view}
        superLikeBalance={credits.super_like_balance}
        boostBalance={credits.boost_balance}
        onAddFiles={handleAddFiles}
        onEditProfile={() => setEditing(true)}
        onVerify={() => setVerifying(true)}
        onOpenSettings={() => navigate({ to: '/settings' })}
        isAdmin={isAdmin}
        onOpenAdmin={() => navigate({ to: '/admin' })}
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
