import { notFound } from 'next/navigation';
import { getPublicProfile } from '@/features/profile/api';
import { UserProfileClient } from '@/features/profile/components/user-profile-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const result = await getPublicProfile(id).catch(() => null);

  if (!result?.profile) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <UserProfileClient
      profile={result.profile}
      todayIso={today.toISOString().split('T')[0]}
    />
  );
}
