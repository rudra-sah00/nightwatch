'use client';

import { useEffect } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';

/**
 * Sets the navbar center page title on mount and clears it on unmount.
 * Drop this anywhere in a route to display that route's title in the navbar.
 * Optionally pass `href` so clicking the title navigates to that route.
 */
export function PageTitle({ title, href }: { title: string; href?: string }) {
  const { setTitle } = usePageTitle();
  useEffect(() => {
    setTitle(title, href);
    return () => setTitle('');
  }, [setTitle, title, href]);
  return null;
}
