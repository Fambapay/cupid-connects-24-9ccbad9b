import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ProfileView, type ProfileViewData } from '@/components/ProfileView';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { BottomNav } from '@/components/BottomNav';

export const Route = createFileRoute('/profile')({
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

  return (
    <div className="min-h-screen bg-background">
      <ProfileView
        profile={profile}
        onPhotosChange={(photos) => setProfile(p => ({ ...p, photos }))}
        onEditProfile={() => setEditing(true)}
      />
      <EditProfileSheet
        open={editing}
        profile={profile}
        onClose={() => setEditing(false)}
        onSave={(next) => setProfile(next)}
      />
      <BottomNav />
    </div>
  );
}
