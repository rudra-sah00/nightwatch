'use client';

import {
  type FocusableComponentLayout,
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useEffect } from 'react';

interface TvGridProps {
  focusKey?: string;
  onFocus?: (layout: FocusableComponentLayout) => void;
  /** When true, focuses the first child after mount (use for async-loaded grids) */
  autoFocus?: boolean;
  children: React.ReactNode;
}

export function TvGrid({
  focusKey,
  onFocus,
  autoFocus,
  children,
}: TvGridProps) {
  const {
    ref,
    focusKey: fk,
    focusSelf,
  } = useFocusable({
    focusKey,
    saveLastFocusedChild: true,
    trackChildren: true,
    onFocus,
  });

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => focusSelf(), 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, focusSelf]);

  return (
    <FocusContext.Provider value={fk}>
      <div
        ref={ref}
        className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 px-8 py-4"
      >
        {children}
      </div>
    </FocusContext.Provider>
  );
}
