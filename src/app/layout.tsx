import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import 'material-symbols/outlined.css';
import './globals.css';
import { Suspense } from 'react';
import { DiscordPresenceSync } from '@/components/layout/DiscordPresenceSync';
import { ElectronDragRegion } from '@/components/layout/electron-drag-region';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/auth-provider';
import { DevToolsProtectionProvider } from '@/providers/devtools-protection-provider';
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

export const metadata: Metadata = {
  title: 'Watch Rudra',
  description: 'Your personal streaming companion',
  icons: {
    icon: '/play.ico',
    shortcut: '/play.ico',
    apple: '/play.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
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
      <head />
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <DevToolsProtectionProvider>
          {/* Electron Window Drag Region (top edge where macOS/Windows controls sit) */}
          <ElectronDragRegion />

          <ThemeProvider>
            <SocketProvider>
              <AuthProvider>
                <Suspense fallback={null}>
                  <DiscordPresenceSync />
                  <OfflineIndicator />
                </Suspense>
                {children}
                <Toaster />
              </AuthProvider>
            </SocketProvider>
          </ThemeProvider>
        </DevToolsProtectionProvider>
      </body>
    </html>
  );
}
