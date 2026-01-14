import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Rudra's Personal Collection - Movies & TV Shows",
  description: 'Personal collection of movies and TV shows',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-gray-100 antialiased">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
