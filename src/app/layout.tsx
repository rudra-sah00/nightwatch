import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/auth-provider';
import { DevToolsProtectionProvider } from '@/providers/devtools-protection-provider';
import { SocketProvider } from '@/providers/socket-provider';

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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <DevToolsProtectionProvider>
          {/* Electron Window Drag Region (top edge where macOS/Windows controls sit) */}
          <div className="fixed top-0 left-0 right-0 h-8 z-[9999] bg-transparent pointer-events-auto [-webkit-app-region:drag]" />

          <SocketProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </SocketProvider>
        </DevToolsProtectionProvider>
      </body>
    </html>
  );
}
