'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

interface TvActionButtonProps {
  label: string;
  icon: string;
  color?: 'blue' | 'yellow' | 'default';
  onPress: () => void;
  disabled?: boolean;
}

export function TvActionButton({
  label,
  icon,
  color = 'default',
  onPress,
  disabled,
}: TvActionButtonProps) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => {
      if (!disabled) onPress();
    },
    focusable: !disabled,
  });

  const baseColors = {
    blue: 'bg-neo-blue text-white border-border',
    yellow: 'bg-neo-yellow text-foreground border-border',
    default: 'bg-card text-foreground border-border',
  };

  return (
    <div
      ref={ref}
      className={`flex-1 flex items-center justify-center gap-3 px-6 py-5 border-[4px] font-headline font-black uppercase tracking-widest text-base transition-all rounded-md ${
        disabled ? 'opacity-50' : ''
      } ${
        focused
          ? 'border-foreground bg-foreground text-background scale-[1.03] shadow-lg'
          : baseColors[color]
      }`}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
      {label}
    </div>
  );
}
