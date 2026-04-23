import { getTranslations } from 'next-intl/server';
import LoginClient from './LoginClient';

export async function generateMetadata() {
  const t = await getTranslations('auth');
  return {
    title: `${t('title.entrance')} | Nightwatch`,
    description: t('features.solo.desc'),
  };
}

export default async function LoginPage() {
  // Mandatory 2.5s delay to showcase premium loading animation

  return <LoginClient />;
}
