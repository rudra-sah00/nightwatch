'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function ProfileBackButton({ label }: { label: string }) {
  return (
    <Link
      href="/profile"
      className="inline-flex items-center gap-2 text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Link>
  );
}
