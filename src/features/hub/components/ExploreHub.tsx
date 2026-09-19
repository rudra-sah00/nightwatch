'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { hubDestinationsFor } from '../lib/destinations';

/**
 * Entry hub — the landing surface for authenticated users on web and mobile.
 *
 * Asks what the user wants to explore and routes into one of the app's domains,
 * the way a streaming service asks which profile is watching. It is rendered
 * fresh on every visit to /home and deliberately remembers nothing: there is no
 * "last section" to restore and no preference to get stuck in, so the choice is
 * always explicit.
 *
 * Destinations come from a shared list so this and the TV hub cannot diverge.
 */
export function ExploreHub() {
  const t = useTranslations('common');
  const destinations = hubDestinationsFor('web');

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 w-full">
      <div className="w-full max-w-5xl flex flex-col items-center">
        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-foreground text-center leading-none mb-3">
          {t('hub.title')}
        </h1>
        <p className="font-body text-muted-foreground text-center mb-10 sm:mb-14">
          {t('hub.subtitle')}
        </p>

        <nav aria-label={t('hub.title')} className="w-full">
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full list-none p-0 m-0">
            {destinations.map(({ id, href, icon: Icon, labelKey, accent }) => (
              <li key={id}>
                <Link
                  href={href}
                  className="group flex flex-col items-center justify-center gap-4 p-6 sm:p-8 h-full border-[3px] border-border bg-card transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-blue"
                >
                  <span
                    className={`flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 border-[3px] border-border ${accent}`}
                  >
                    <Icon
                      className="w-8 h-8 sm:w-10 sm:h-10 text-foreground"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-headline font-black uppercase tracking-widest text-sm sm:text-base text-foreground text-center">
                    {t(labelKey)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
