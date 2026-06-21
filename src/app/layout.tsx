import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import 'material-symbols/outlined.css';
import './globals.css';
import { Suspense } from 'react';
import { CookieConsent } from '@/components/layout/CookieConsent';
import { DiscordPresenceSync } from '@/components/layout/DiscordPresenceSync';
import { ElectronDragRegion } from '@/components/layout/electron-drag-region';
import { MobileShell } from '@/components/layout/MobileShell';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import { ProgressBar } from '@/components/layout/progress-bar';
import { SwRegister } from '@/components/layout/sw-register';
import { TvShell } from '@/components/layout/TvShell';
import { Toaster } from '@/components/ui/sonner';
import { SplashScreen } from '@/components/ui/splash-screen';
import { AuthProvider } from '@/providers/auth-provider';

import { IntlProvider } from '@/providers/intl-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { ThemeProvider } from '@/providers/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.in';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Nightwatch — Watch Together, Stream, and Connect',
    template: '%s — Nightwatch',
  },
  description:
    'Your personal streaming companion — synchronized playback, watch parties, live streaming, music, and voice calls with friends.',
  keywords: [
    'watch together',
    'watch party',
    'synchronized streaming',
    'live streaming',
    'voice calls',
    'music streaming',
    'stream with friends',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Nightwatch',
    title: 'Nightwatch — Watch Together, Stream, and Connect',
    description:
      'Synchronized playback, watch parties, live streaming, music, and voice calls with friends.',
    url: BASE_URL,
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Nightwatch' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'Nightwatch — Watch Together, Stream, and Connect',
    description:
      'Synchronized playback, watch parties, live streaming, music, and voice calls with friends.',
    images: ['/logo.png'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark light',
  maximumScale: 1, // Prevent iOS auto-zoom on input focus (inputs < 16px trigger zoom)
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Nightwatch',
              url: BASE_URL,
              description:
                'Synchronized playback, watch parties, live streaming, music, and voice calls with friends.',
              applicationCategory: 'EntertainmentApplication',
              operatingSystem: 'Windows, macOS, Linux, Android, iOS',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              image: `${BASE_URL}/logo.png`,
            }),
          }}
        />
        {/* hreflang alternate links for international SEO */}
        {(
          [
            'en',
            'hi',
            'es',
            'fr',
            'ja',
            'ko',
            'de',
            'pt',
            'ar',
            'ru',
            'zh',
            'it',
            'tr',
            'th',
          ] as const
        ).map((locale) => (
          <link
            key={locale}
            rel="alternate"
            hrefLang={locale}
            href={`${BASE_URL}/?lang=${locale}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={BASE_URL} />
        {/* Blocking script to set dark class before React hydrates — prevents FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('neo-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('contextmenu',function(e){e.preventDefault()});['copy','cut','paste'].forEach(function(t){document.addEventListener(t,function(e){if(e.target.closest('[data-allow-clipboard]'))return;e.preventDefault()})})`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground select-none`}
      >
        <Suspense fallback={<div className="min-h-screen" />}>
          <IntlProvider>
            {/* Electron Window Drag Region (top edge where macOS/Windows controls sit) */}
            <ElectronDragRegion />

            <QueryProvider>
              <ThemeProvider>
                <SocketProvider>
                  <AuthProvider>
                    <div
                      className="flex flex-col overflow-hidden h-[100dvh] box-border"
                      style={{
                        paddingTop:
                          'max(var(--electron-titlebar-height, 0px), env(safe-area-inset-top, 0px))',
                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                        paddingLeft: 'env(safe-area-inset-left, 0px)',
                        paddingRight: 'env(safe-area-inset-right, 0px)',
                      }}
                    >
                      <ProgressBar />
                      <DiscordPresenceSync />
                      <MobileShell />
                      <TvShell />
                      <OfflineIndicator />
                      <SplashScreen />
                      {children}
                      <Toaster />
                      <SwRegister />
                      <CookieConsent />
                    </div>
                  </AuthProvider>
                </SocketProvider>
              </ThemeProvider>
            </QueryProvider>
          </IntlProvider>
        </Suspense>
      </body>
    </html>
  );
}
