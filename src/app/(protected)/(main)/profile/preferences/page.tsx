'use client';

import { useTranslations } from 'next-intl';
import { PageTitle } from '@/components/layout/page-title';
import { AppPreferences } from '@/features/profile/components/app-preferences';
import { ProfileBackButton } from '@/features/profile/components/profile-back-button';

export default function PreferencesPage() {
  const t = useTranslations('profile.nav');
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-200 w-full">
      <PageTitle title={t('preferences')} />
      <ProfileBackButton label="Profile" />
      <AppPreferences />
    </main>
  );
}
