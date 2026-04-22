'use client';

import { useSidebar } from '@/app/(protected)/(main)/layout';

export function RightSidebar() {
  const { rightOpen: open } = useSidebar();

  return (
    <aside
      className={`shrink-0 h-full bg-card flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        open ? 'w-80 rounded-2xl' : 'w-11 hover:w-14 rounded-l-2xl -mr-2'
      }`}
    >
      {open ? (
        <>
          <div className="flex items-center px-4 pt-4 pb-3 border-b border-border">
            <span className="text-sm font-black uppercase tracking-widest font-headline text-foreground">
              Friends
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-foreground/30 font-headline uppercase tracking-widest text-center">
              Coming soon
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-xl text-foreground/60">
            group
          </span>
        </div>
      )}
    </aside>
  );
}
