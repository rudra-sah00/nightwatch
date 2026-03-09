import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <DevToolsProtectionProvider>
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
