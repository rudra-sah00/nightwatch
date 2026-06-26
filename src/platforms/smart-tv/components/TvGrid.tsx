'use client';

import {
  type FocusableComponentLayout,
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';

interface TvGridProps {
  focusKey?: string;
  onFocus?: (layout: FocusableComponentLayout) => void;
  children: React.ReactNode;
}

export function TvGrid({ focusKey, onFocus, children }: TvGridProps) {
  const { ref, focusKey: fk } = useFocusable({
    focusKey,
    saveLastFocusedChild: true,
    trackChildren: true,
    onFocus,
  });

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
