import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AiAssistantWidgetClient } from '@/features/ai-assistant/AiAssistantWidgetClient';
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
              <AiAssistantWidgetClient />
              <Toaster />
            </AuthProvider>
          </SocketProvider>
        </DevToolsProtectionProvider>
      </body>
    </html>
  );
}
