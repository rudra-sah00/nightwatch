import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import QueryProvider from '@/providers/QueryProvider';
import { RoomProvider } from '@/providers/RoomProvider';
import { RoomLayout } from '@/components/layout';

export const metadata: Metadata = {
  title: {
    default: 'Watch Rudra - Stream Movies & TV Shows',
    template: '%s | Watch Rudra',
  },
  description: 'Watch movies and TV shows together with friends in real-time',
  icons: {
    icon: '/play.ico',
    shortcut: '/play.ico',
    apple: '/play.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white antialiased">
        <QueryProvider>
          <AuthProvider>
            <RoomProvider>
              <RoomLayout>
                {children}
              </RoomLayout>
            </RoomProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

