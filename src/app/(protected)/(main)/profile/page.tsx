import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ProfileClient from './ProfileClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return { title: t('profileTitle'), description: t('profileDescription') };
}

export default async function ProfilePage() {
  return <ProfileClient />;
}
