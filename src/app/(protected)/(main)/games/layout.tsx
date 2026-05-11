import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Games' };

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
