import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Temple Run 2: Frozen Shadows' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
