'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { cva, type VariantProps } from 'class-variance-authority';

const tvButtonVariants = cva(
  'flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-base transition-all',
  {
    variants: {
      variant: {
        default: '',
        primary: '',
        destructive: '',
      },
      size: {
        default: 'px-6 py-3 text-base',
        sm: 'px-4 py-2 text-sm',
        lg: 'px-8 py-4 text-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

interface TvButtonProps extends VariantProps<typeof tvButtonVariants> {
  label: string;
  icon?: string;
  onPress?: () => void;
  focusKey?: string;
}

export function TvButton({
  label,
  icon,
  onPress,
  focusKey,
  variant,
  size,
}: TvButtonProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => onPress?.(),
  });

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={`${tvButtonVariants({ variant, size })} ${
        focused
          ? 'bg-tv-focus text-foreground scale-105 shadow-lg shadow-tv-focus/30'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {icon && <span className="material-symbols-outlined">{icon}</span>}
      {label}
    </button>
  );
}
