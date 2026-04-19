'use client';

import { useRootPage } from './use-root-page';

export default function RootPage() {
  useRootPage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  );
}
