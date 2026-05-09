import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import 'material-symbols/outlined.css';
import './globals.css';
import { Suspense } from 'react';
import { DiscordPresenceSync } from '@/components/layout/DiscordPresenceSync';
import { ElectronDragRegion } from '@/components/layout/electron-drag-region';
import { MobileShell } from '@/components/layout/MobileShell';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import { ProgressBar } from '@/components/layout/progress-bar';
import { SwUpdatePrompt } from '@/components/layout/sw-update-prompt';
import { TvShell } from '@/components/layout/TvShell';
import { Toaster } from '@/components/ui/sonner';
import { SplashScreen } from '@/components/ui/splash-screen';
import { AuthProvider } from '@/providers/auth-provider';

import { IntlProvider } from '@/providers/intl-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SerwistProvider } from './serwist';

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

export const metadata: Metadata = {
  title: {
    default: 'Nightwatch',
    template: '%s — Nightwatch',
  },
  description: 'Your personal streaming companion',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
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
        <SerwistProvider swUrl="/sw.js">
          <Suspense fallback={<div className="min-h-screen" />}>
            <IntlProvider>
              {/* Electron Window Drag Region (top edge where macOS/Windows controls sit) */}
              <ElectronDragRegion />

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
                      <SwUpdatePrompt />
                      <SplashScreen />
                      {children}
                      <Toaster />
                    </div>
                  </AuthProvider>
                </SocketProvider>
              </ThemeProvider>
            </IntlProvider>
          </Suspense>
        </SerwistProvider>
      </body>
    </html>
  );
}
