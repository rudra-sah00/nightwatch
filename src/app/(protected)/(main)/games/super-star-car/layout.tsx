import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Super Star Car' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
