'use client';

import { useTranslations } from 'next-intl';
import { PageTitle } from '@/components/layout/page-title';
import { ActiveDevices } from '@/features/profile/components/active-devices';
import { ProfileBackButton } from '@/features/profile/components/profile-back-button';

export default function DevicesPage() {
  const t = useTranslations('profile.nav');
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-200 w-full">
      <PageTitle title={t('devices')} />
      <ProfileBackButton label="Profile" />
      <ActiveDevices />
    </main>
  );
}
