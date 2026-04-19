'use client';

import { GlobalLoading } from '@/components/ui/global-loading';
import { useNavigationStore } from '@/store/use-navigation-store';

/**
 * GlobalLoadingOverlay
 *
 * Component that listens to the global navigation store and renders
 * the full-screen spinner if the navigation type is set to 'spinner'.
 *
 * This is primarily used for routes that do not have a navbar (Login, Signup).
 */
export function GlobalLoadingOverlay() {
  const { isNavigating, type } = useNavigationStore();

  if (isNavigating && type === 'spinner') {
    return <GlobalLoading />;
  }

  return null;
}
