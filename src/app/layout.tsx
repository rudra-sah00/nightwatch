import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import 'material-symbols/outlined.css';
import './globals.css';
import { Suspense } from 'react';
import { DiscordPresenceSync } from '@/components/layout/DiscordPresenceSync';
import { ElectronDragRegion } from '@/components/layout/electron-drag-region';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import { ProgressBar } from '@/components/layout/progress-bar';
import { SwUpdatePrompt } from '@/components/layout/sw-update-prompt';
import { Toaster } from '@/components/ui/sonner';
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
  title: 'Watch Rudra',
  description: 'Your personal streaming companion',
  manifest: '/manifest.json',
  icons: {
    icon: '/play.ico',
    shortcut: '/play.ico',
    apple: '/play.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark light',
  // Extend layout into the notch/Dynamic Island so safe-area-inset-* values
  // are non-zero on iOS — required for the player's bottom controls and mobile
  // header to correctly clear the home indicator and the notch.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script to set dark class before React hydrates — prevents FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('neo-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <SerwistProvider swUrl="/sw.js">
          <Suspense fallback={<div className="min-h-screen" />}>
            <IntlProvider>
              {/* Tauri Window Drag Region (top edge where macOS/Windows controls sit) */}
              <ElectronDragRegion />

              <ThemeProvider>
                <SocketProvider>
                  <AuthProvider>
                    <ProgressBar />
                    <DiscordPresenceSync />
                    <OfflineIndicator />
                    <SwUpdatePrompt />
                    {children}
                    <Toaster />
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
