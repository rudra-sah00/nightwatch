import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { DevToolsProtection } from '@/hooks/useDevToolsProtection';
import { AuthProvider } from '@/providers/auth-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
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
      <head>
        {/* Google Fonts for Subtitles - Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Inter:wght@400;600;700&family=Lato:wght@400;700&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Fira+Sans:wght@400;700&family=Source+Sans+Pro:wght@400;700&family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <DevToolsProtection>{children}</DevToolsProtection>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
