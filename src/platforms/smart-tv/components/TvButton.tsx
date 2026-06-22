'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

interface TvButtonProps {
  label: string;
  icon?: string;
  onPress?: () => void;
  focusKey?: string;
}

export function TvButton({ label, icon, onPress, focusKey }: TvButtonProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => onPress?.(),
  });

  return (
    <button
      ref={ref}
      type="button"
      className={`
        flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-base transition-all
        ${
          focused
            ? 'bg-indigo-500 text-foreground scale-105 shadow-lg shadow-indigo-500/30'
            : 'bg-muted text-muted-foreground'
        }
      `}
    >
      {icon && <span className="material-symbols-outlined">{icon}</span>}
      {label}
    </button>
  );
}
