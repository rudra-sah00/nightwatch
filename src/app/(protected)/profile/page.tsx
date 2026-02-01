'use client';

import dynamic from 'next/dynamic';

const ProfileCard = dynamic(
  () =>
    import('@/features/profile/components/profile-card').then(
      (m) => m.ProfileCard,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">
          Loading profile...
        </div>
      </div>
    ),
    ssr: false,
  },
);

export default function ProfilePage() {
  return <ProfileCard />;
}
