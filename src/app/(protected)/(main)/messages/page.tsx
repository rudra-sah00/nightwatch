import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MessagesClient } from '@/features/friends/components/MessagesClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return { title: t('messagesTitle') };
}

export default function MessagesPage() {
  return <MessagesClient />;
}
