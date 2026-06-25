'use client';

import { useMemo } from 'react';
import { PageTitle } from '@/components/layout/page-title';
import { PublicProfileView } from './public-profile-view';

interface Props {
  profile: {
    id: string;
    name: string;
    username: string | null;
    profilePhoto: string | null;
    createdAt: string;
    activity: { date: string; watchSeconds: number }[];
    musicActivity: { date: string; listenSeconds: number }[];
  };
  todayIso: string;
}

export function UserProfileClient({ profile, todayIso }: Props) {
  const displayName = useMemo(() => {
    const firstName = profile.name.split(' ')[0] || profile.name;
    return firstName.length > 12 ? `${firstName.slice(0, 12)}…` : firstName;
  }, [profile.name]);

  return (
    <>
      <PageTitle title={displayName} />
      <PublicProfileView profile={profile} todayIso={todayIso} />
    </>
  );
}
