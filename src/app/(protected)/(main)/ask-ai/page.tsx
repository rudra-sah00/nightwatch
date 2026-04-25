import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ask AI | Nightwatch',
};

export default function AskAiPage() {
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-8">
      <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-foreground mb-4">
        Ask AI
      </h1>
      <p className="text-sm text-foreground/40 font-headline uppercase tracking-widest">
        Coming soon
      </p>
    </main>
  );
}
