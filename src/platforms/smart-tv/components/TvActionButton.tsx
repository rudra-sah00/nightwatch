'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { cva, type VariantProps } from 'class-variance-authority';

const tvActionButtonVariants = cva(
  'flex-1 flex items-center justify-center gap-3 px-6 py-5 border-[4px] font-headline font-black uppercase tracking-widest text-base transition-all rounded-md',
  {
    variants: {
      color: {
        default: 'bg-card text-foreground border-border',
        blue: 'bg-neo-blue text-white border-border',
        yellow: 'bg-neo-yellow text-foreground border-border',
      },
    },
    defaultVariants: { color: 'default' },
  },
);

interface TvActionButtonProps
  extends VariantProps<typeof tvActionButtonVariants> {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}

export function TvActionButton({
  label,
  icon,
  color,
  onPress,
  disabled,
}: TvActionButtonProps) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => {
      if (!disabled) onPress();
    },
    focusable: !disabled,
  });

  return (
    <div
      ref={ref}
      className={`${tvActionButtonVariants({ color })} ${
        disabled ? 'opacity-50' : ''
      } ${
        focused
          ? 'border-foreground bg-foreground text-background scale-[1.03] shadow-lg'
          : ''
      }`}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
      {label}
    </div>
  );
}
