'use client';

import { useEffect } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';

/**
 * Sets the navbar center page title on mount and clears it on unmount.
 * Drop this anywhere in a route to display that route's title in the navbar.
 */
export function PageTitle({ title }: { title: string }) {
  const { setTitle } = usePageTitle();
  useEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [setTitle, title]);
  return null;
}
