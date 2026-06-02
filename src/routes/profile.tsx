import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { ProfileView, type ProfileViewData } from '@/components/ProfileView';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { VerificationModal } from '@/components/VerificationModal';
import { BottomNav } from '@/components/BottomNav';

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

const INITIAL: ProfileViewData = {
  name: 'Você',
  age: 27,
  city: 'Lisboa',
  bio: 'Curioso, café forte e boas histórias.',
  interests: ['Surf', 'Viagens', 'Design'],
  photos: [],
  isVerified: false,
  isPremium: false,
};

function ProfilePage() {
  const [profile, setProfile] = useState<ProfileViewData>(INITIAL);
  const [editing, setEditing] = useState(false);
  const [verifying, setVerifying] = useState(false);

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
        profile={profile}
        onPhotosChange={(photos) => setProfile(p => ({ ...p, photos }))}
        onEditProfile={() => setEditing(true)}
        onVerify={() => setVerifying(true)}
      />
      <EditProfileSheet
        open={editing}
        profile={profile}
        onClose={() => setEditing(false)}
        onSave={(next) => setProfile(next)}
      />
      <VerificationModal
        open={verifying}
        onOpenChange={setVerifying}
        onConfirm={() => setProfile(p => ({ ...p, isVerified: true }))}
      />
      <BottomNav />
    </div>
  );
}
