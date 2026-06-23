'use client';

import {
  type FocusableComponentLayout,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

interface TvCardProps {
  title: string;
  image?: string;
  large?: boolean;
  href?: string;
  /** If omitted but href is set, navigates to href on Enter */
  onPress?: () => void;
  onFocus?: (layout: FocusableComponentLayout) => void;
  /** Use eager loading for above-the-fold cards */
  eager?: boolean;
  /** 0-100 progress percentage for continue watching */
  progress?: number;
}

export const TvCard = memo(function TvCard({
  title,
  image,
  large,
  href,
  onPress,
  onFocus,
  eager,
  progress,
}: TvCardProps) {
  const router = useRouter();
  const { ref, focused } = useFocusable({
    onEnterPress: () => {
      if (onPress) onPress();
      else if (href) router.push(href);
    },
    onFocus: (layout) => {
      onFocus?.(layout);
      if (href) router.prefetch(href);
    },
  });

  return (
    <div
      ref={ref}
      className={`tv-focusable tv-card relative ${focused ? 'tv-focusable--focused' : ''} ${large ? 'tv-card--large' : ''}`}
    >
      {image ? (
        <Image
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          fill
          unoptimized
          priority={eager}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-800 to-zinc-900" />
      )}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-sm font-medium truncate">{title}</p>
      </div>
      {/* Continue watching progress bar */}
      {progress != null && progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-tv-focus"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
});
