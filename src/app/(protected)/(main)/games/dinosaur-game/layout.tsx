import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Dinosaur Game' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
