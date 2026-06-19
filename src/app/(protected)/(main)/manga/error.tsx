'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <p className="font-headline font-black text-2xl uppercase tracking-tight text-foreground/60">
        Something went wrong
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 bg-foreground text-background font-headline font-bold uppercase tracking-wider text-sm rounded hover:opacity-90 transition-opacity"
      >
        Try Again
      </button>
    </div>
  );
}
