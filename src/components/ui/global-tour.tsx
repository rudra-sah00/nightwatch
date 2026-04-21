'use client';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useDesktopApp } from '@/hooks/use-desktop-app';

export function GlobalTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tourStarted = useRef(false);
  const { isDesktopApp } = useDesktopApp();
  const t = useTranslations('tour');

  useEffect(() => {
    if (typeof window === 'undefined' || tourStarted.current) return;

    const isTourRequested = searchParams.get('tour') === 'true';

    // Only trigger tour on /home when the tour query param is present
    if (isTourRequested && pathname === '/home') {
      tourStarted.current = true;

      const timer = setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          animate: true,
          allowClose: true,
          overlayColor: 'rgba(0,0,0,0.5)',
          popoverClass:
            'rounded-xl border border-gray-200 shadow-lg !font-body',
          steps: [
            {
              popover: {
                title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('welcome.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('welcome.description')}</span>`,
                side: 'bottom',
                align: 'center',
              },
            },
            {
              element: 'input[name="q"]',
              popover: {
                title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('search.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('search.description')}</span>`,
                side: 'bottom',
                align: 'start',
              },
            },
            {
              element: 'a[href="/continue-watching"]',
              popover: {
                title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('resume.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('resume.description')}</span>`,
                side: 'bottom',
                align: 'center',
              },
            },
            {
              element: 'a[href="/live"]',
              popover: {
                title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('live.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('live.description')}</span>`,
                side: 'bottom',
                align: 'center',
              },
            },
            {
              element: 'a[href="/watchlist"]',
              popover: {
                title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('watchlist.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('watchlist.description')}</span>`,
                side: 'bottom',
                align: 'center',
              },
            },
            ...(isDesktopApp
              ? [
                  {
                    element: 'a[href="/downloads"]',
                    popover: {
                      title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('downloads.title')}</span>`,
                      description: `<span class="font-body text-sm font-medium opacity-80">${t('downloads.description')}</span>`,
                      side: 'bottom' as const,
                      align: 'center' as const,
                    },
                  },
                ]
              : []),
            {
              element: 'a[href="/profile"]',
              popover: {
                title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('profile.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('profile.description')}</span>`,
                side: 'bottom',
                align: 'end',
              },
            },
            {
              element: 'a[href="/profile"]',
              popover: {
                title: `<span class="font-headline font-black text-xl text-neo-red uppercase tracking-tighter">${t('serverTip.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('serverTip.description')}</span>`,
                side: 'bottom',
                align: 'end',
              },
            },
            {
              popover: {
                title: `<span class="font-headline font-black text-xl uppercase tracking-tighter">${t('ready.title')}</span>`,
                description: `<span class="font-body text-sm font-medium opacity-80">${t('ready.description')}</span>`,
                side: 'bottom',
                align: 'center',
              },
            },
          ],
          onDestroyStarted: () => {
            // Remove the parameter silently
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('tour');
            router.replace(
              `${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`,
            );
            driverObj.destroy();
          },
        });

        driverObj.drive();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, router, isDesktopApp, t]);

  return null;
}
