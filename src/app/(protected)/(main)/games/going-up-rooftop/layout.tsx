import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Going Up: Rooftop' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
