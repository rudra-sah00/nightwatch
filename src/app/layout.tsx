import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stream - Watch Movies & TV Shows',
  description: 'Stream your favorite movies and TV shows',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white antialiased">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
