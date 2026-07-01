import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppleToast } from '@/components/notifications/AppleToast';
import { ProfileView, type ProfileViewData } from '@/components/ProfileView';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { VerificationModal } from '@/components/VerificationModal';
import { AppShell } from '@/components/AppShell';
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
      { name: 'description', content: 'Gere o teu perfil Hunie: fotos, bio, interesses e verificação azul. Quanto mais completo, mais matches recebes.' },
      { property: 'og:title', content: 'Meu perfil — Hunie' },
      { property: 'og:description', content: 'Gere o teu perfil Hunie: fotos, bio, interesses e verificação azul. Quanto mais completo, mais matches recebes.' },
      { property: 'og:url', content: 'https://hunie.app/profile' },
    ],
    links: [{ rel: 'canonical', href: 'https://hunie.app/profile' }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile, reload } = useProfile();
  const { photos, upload, remove } = usePhotoUpload();
  const { isPremium, isTrialing, subscription } = useSubscription();
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
      isTrialing,
      tier: subscription.membershipTier,
      heightCm: profile?.height_cm ?? null,
      lookingFor: profile?.looking_for ?? null,
      pets: profile?.pets ?? null,
      smoking: profile?.smoking ?? null,
      drinking: profile?.drinking ?? null,
      workout: profile?.workout ?? null,
    }),
    [profile, photos, isPremium, isTrialing, subscription.membershipTier],
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
        height_cm: next.heightCm ?? null,
        looking_for: next.lookingFor ?? null,
        pets: next.pets ?? null,
        smoking: next.smoking ?? null,
        drinking: next.drinking ?? null,
        workout: next.workout ?? null,
      });
      toast.custom(
        (t) => (
          <AppleToast
            toastId={t}
            title="Perfil atualizado"
            body="As tuas alterações foram guardadas."
            onDismiss={() => toast.dismiss(t)}
          />
        ),
        { duration: 2600 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };


  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    // Defer non-critical query until after the entry animation settles.
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback?.(cb, { timeout: 800 }) ??
      window.setTimeout(cb, 400);
    const id = idle(() => {
      supabase.from('admin_emails').select('email').maybeSingle().then(({ data }) => {
        setIsAdmin(!!data);
      });
    });
    return () => {
      (window as any).cancelIdleCallback?.(id) ?? window.clearTimeout(id);
    };
  }, []);

  return (
    <AppShell className="bg-[var(--profile-bg)]">
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
    </AppShell>
  );
}
