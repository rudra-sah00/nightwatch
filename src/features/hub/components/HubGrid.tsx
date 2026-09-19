'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { hubDestinationsFor } from '../lib/destinations';

/**
 * The hub's destination grid, shared by the `/home` page and the entry gate so the
 * two cannot drift apart.
 *
 * Tiles do not move on hover or focus — only the border and ring change. A transform
 * here would shift layout under the pointer on a grid this large.
 *
 * @param onPick - Called before navigation. The gate uses it to record that the
 *   choice for this page load has been made, so it does not reappear during the
 *   client-side navigation that follows.
 */
export function HubGrid({ onPick }: { onPick?: () => void }) {
  const t = useTranslations('common');
  const destinations = hubDestinationsFor('web');

  return (
    <nav aria-label={t('hub.title')} className="w-full">
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full list-none p-0 m-0">
        {destinations.map(({ id, href, icon: Icon, labelKey, accent }) => (
          <li key={id}>
            <Link
              href={href}
              onClick={onPick}
              className="flex flex-col items-center justify-center gap-4 p-6 sm:p-8 h-full border-[3px] border-border bg-card hover:border-neo-blue focus-visible:border-neo-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-blue"
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
  );
}
