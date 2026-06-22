'use client';

import {
  type FocusableComponentLayout,
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { memo, useCallback, useRef } from 'react';

interface TvRowProps {
  title: string;
  focusKey?: string;
  children:
    | React.ReactNode
    | ((
        onChildFocus: (layout: FocusableComponentLayout) => void,
      ) => React.ReactNode);
}

export const TvRow = memo(function TvRow({
  title,
  focusKey,
  children,
}: TvRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const {
    ref,
    focusKey: fk,
    hasFocusedChild,
  } = useFocusable({
    focusKey,
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  const onChildFocus = useCallback((_layout: FocusableComponentLayout) => {
    const container = scrollRef.current;
    const section = sectionRef.current;
    if (!container) return;

    // Vertical: scroll section into view (instant to avoid fighting horizontal smooth)
    section?.scrollIntoView({ block: 'nearest', behavior: 'instant' });

    // Horizontal: center the focused card
    requestAnimationFrame(() => {
      const focused = container.querySelector(
        "[class*='tv-focusable--focused']",
      ) as HTMLElement;
      if (!focused) return;

      const containerRect = container.getBoundingClientRect();
      const focusedRect = focused.getBoundingClientRect();

      if (focusedRect.right > containerRect.right - 40) {
        container.scrollBy({
          left: focusedRect.right - containerRect.right + 100,
          behavior: 'smooth',
        });
      } else if (focusedRect.left < containerRect.left + 40) {
        container.scrollBy({
          left: focusedRect.left - containerRect.left - 100,
          behavior: 'smooth',
        });
      }
    });
  }, []);

  return (
    <FocusContext.Provider value={fk}>
      <section
        ref={sectionRef}
        className={`mb-8 ${hasFocusedChild ? 'tv-row--active' : ''}`}
      >
        <h2 className="tv-row__title text-lg font-semibold px-8 mb-3 text-muted-foreground transition-colors">
          {title}
        </h2>
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden scrollbar-hide"
        >
          <div ref={ref} className="flex gap-4 px-8 py-2">
            {typeof children === 'function'
              ? (children as (onFocus: typeof onChildFocus) => React.ReactNode)(
                  onChildFocus,
                )
              : children}
          </div>
        </div>
      </section>
    </FocusContext.Provider>
  );
});
