import { getTranslations } from 'next-intl/server';
import LoginClient from './LoginClient';
import { TvLoginGate } from './TvLoginGate';

export async function generateMetadata() {
  const t = await getTranslations('auth');
  return {
    title: `${t('title.entrance')} | Nightwatch`,
    description: t('features.solo.desc'),
  };
}

export default async function LoginPage() {
  return (
    <>
      <TvLoginGate />
      <LoginClient />
    </>
  );
}
