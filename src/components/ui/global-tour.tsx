'use client';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useDesktopApp } from '@/hooks/use-desktop-app';

export function GlobalTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tourStarted = useRef(false);
  const { isDesktopApp } = useDesktopApp();

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
                title:
                  '<span class="font-headline font-black text-xl uppercase tracking-tighter">Welcome to Watch Rudra</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Let us show you around your new minimalist cinema experience. Form follows function.</span>',
                side: 'bottom',
                align: 'center',
              },
            },
            {
              element: 'input[name="q"]',
              popover: {
                title:
                  '<span class="font-headline font-black text-xl uppercase tracking-tighter">Find Your Film</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Search across 12k+ titles. Type your favorite movie or show here.</span>',
                side: 'bottom',
                align: 'start',
              },
            },
            {
              element: 'a[href="/continue-watching"]',
              popover: {
                title:
                  '<span class="font-headline font-black text-xl uppercase tracking-tighter">Resume Watching</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Pick up right where you left off. Every frame saved.</span>',
                side: 'bottom',
                align: 'center',
              },
            },
            {
              element: 'a[href="/live"]',
              popover: {
                title:
                  '<span class="font-headline font-black text-xl uppercase tracking-tighter">Live Events</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Join watch parties and live streams currently happening.</span>',
                side: 'bottom',
                align: 'center',
              },
            },
            {
              element: 'a[href="/watchlist"]',
              popover: {
                title:
                  '<span class="font-headline font-black text-xl uppercase tracking-tighter">Your Queue</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Save movies and episodes here to watch later.</span>',
                side: 'bottom',
                align: 'center',
              },
            },
            ...(isDesktopApp
              ? [
                  {
                    element: 'a[href="/downloads"]',
                    popover: {
                      title:
                        '<span class="font-headline font-black text-xl uppercase tracking-tighter">Offline Vault</span>',
                      description:
                        '<span class="font-body text-sm font-medium opacity-80">Watch movies anywhere, anytime. Access your offline downloads here.</span>',
                      side: 'bottom' as const,
                      align: 'center' as const,
                    },
                  },
                ]
              : []),
            {
              element: 'a[href="/profile"]',
              popover: {
                title:
                  '<span class="font-headline font-black text-xl uppercase tracking-tighter">Profile Settings</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Manage your account, preferences, and view your activity here.</span>',
                side: 'bottom',
                align: 'end',
              },
            },
            {
              element: 'a[href="/profile"]',
              popover: {
                title:
                  '<span class="font-headline font-black text-xl text-neo-red uppercase tracking-tighter">Pro Tip: Server Change</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Inside your profile, you can switch between <strong>Server 1, Server 2, and Server 3</strong>.<br/><br/><strong>Why?</strong> They have different content libraries! If you can\'t find a movie or show on one server, try switching to another.</span>',
                side: 'bottom',
                align: 'end',
              },
            },
            {
              popover: {
                title:
                  '<span class="font-headline font-black text-xl uppercase tracking-tighter">You are ready</span>',
                description:
                  '<span class="font-body text-sm font-medium opacity-80">Enjoy the pure cinematic experience. No distractions. Just film.</span>',
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
  }, [searchParams, pathname, router, isDesktopApp]);

  return null;
}
