'use client';

import { useDesktopApp } from '@/hooks/use-desktop-app';

export function ElectronDragRegion() {
  const { isDesktopApp } = useDesktopApp();

  if (!isDesktopApp) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-8 z-[9999] bg-transparent pointer-events-auto [-webkit-app-region:drag]" />
  );
}
