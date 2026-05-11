import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Happy Glass' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
