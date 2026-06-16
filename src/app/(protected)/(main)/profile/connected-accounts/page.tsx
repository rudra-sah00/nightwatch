'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ConnectedAccountsList } from '@/features/profile/components/connected-accounts-list';

export default function ConnectedAccountsPage() {
  const t = useTranslations('profile');

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-in fade-in duration-200 w-full">
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">
          {t('nav.connectedAccounts')}
        </h1>
      </div>

      <ConnectedAccountsList />
    </main>
  );
}
