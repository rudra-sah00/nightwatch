'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { HubGrid } from './HubGrid';

// TV-only, and pulled in lazily so the spatial navigation grid stays out of the web
// bundle. The web grid is anchor-based and invisible to the focus manager, so TV needs
// its own rather than a restyle.
const TvHubGrid = dynamic(
  () =>
    import('@/platforms/smart-tv/components/TvHubGrid').then(
      (m) => m.TvHubGrid,
    ),
  { ssr: false },
);

/**
 * Full-screen presentation shell for the hub.
 *
 * Deliberately `fixed inset-0` at a z-index above every layout chrome element, so the
 * hub owns the whole viewport: no left sidebar, no navbar, no right sidebar. The hub
 * is a choice of where to go, and leaving the app's own navigation visible behind it
 * would offer a second, contradictory answer to the same question.
 *
 * Sits below the fullscreen game surface (`z-[99999]`) on purpose — a game is only
 * fullscreened by a deliberate user action after load, so nothing should cover it.
 *
 * @param onPick - Called when a destination is chosen, before navigation.
 * @param onContinue - When supplied, renders an escape hatch to the page that was
 *   already loaded. The gate passes this so a deep link — a shared watch party, a
 *   clip, a notification tap — stays reachable instead of being swallowed.
 */
export function HubScreen({
  onPick,
  onContinue,
}: {
  onPick?: () => void;
  onContinue?: () => void;
}) {
  const t = useTranslations('common');

  // The hub owns the viewport while it is up; a scrollable page behind it would
  // still respond to the wheel.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      // Not a native <dialog>: it renders inside the layout tree rather than the top
      // layer, and must not be light-dismissible.
      role="dialog"
      aria-modal="true"
      aria-label={t('hub.title')}
      className="fixed inset-0 z-[10300] bg-background flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto"
    >
      <div className="w-full max-w-5xl flex flex-col items-center my-auto">
        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-foreground text-center leading-none mb-3">
          {t('hub.title')}
        </h1>
        <p className="font-body text-muted-foreground text-center mb-10 sm:mb-14">
          {t('hub.subtitle')}
        </p>

        <TvPageGate
          tvContent={
            <TvHubGrid onPick={onPick} onContinue={onContinue} trapFocus />
          }
        >
          <HubGrid onPick={onPick} />

          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="mt-10 sm:mt-14 font-headline font-bold uppercase tracking-widest text-sm text-muted-foreground underline decoration-2 underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-blue px-2 py-1"
            >
              {t('hub.continue')}
            </button>
          )}
        </TvPageGate>
      </div>
    </div>
  );
}
