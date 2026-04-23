import { getTranslations } from 'next-intl/server';
import SignupClient from './SignupClient';

export async function generateMetadata() {
  const t = await getTranslations('auth');
  return {
    title: `${t('title.discovery')} | Nightwatch`,
    description: t('features.party.desc'),
  };
}

export default async function SignupPage() {
  // Mandatory 2.5s delay to showcase premium loading animation

  return <SignupClient />;
}
