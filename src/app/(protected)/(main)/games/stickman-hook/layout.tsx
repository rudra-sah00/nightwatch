import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Stickman Hook' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
