'use client';

import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/providers/theme-provider';

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const TOAST_OPTIONS = {
  classNames: {
    toast:
      'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-4 group-[.toaster]:border-border group-[.toaster]:rounded-none group-[.toaster]: font-body font-bold w-full',
    description: 'group-[.toast]:font-medium group-[.toast]:opacity-80',
    actionButton:
      'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:border-4 group-[.toast]:border-border group-[.toast]:rounded-none font-headline font-bold uppercase tracking-widest',
    cancelButton:
      'group-[.toast]:bg-muted group-[.toast]:text-foreground group-[.toast]:border-4 group-[.toast]:border-border group-[.toast]:rounded-none font-headline font-bold uppercase tracking-widest',
    error:
      'group-[.toast]:!bg-destructive group-[.toast]:!text-destructive-foreground group-[.toast]:!border-border',
    success:
      'group-[.toast]:!bg-success/20 group-[.toast]:!text-foreground group-[.toast]:!border-border',
    warning:
      'group-[.toast]:!bg-neo-yellow/20 group-[.toast]:!text-foreground group-[.toast]:!border-border',
    info: 'group-[.toast]:!bg-neo-blue/20 group-[.toast]:!text-foreground group-[.toast]:!border-border',
  },
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'light' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={TOAST_OPTIONS}
      {...props}
    />
  );
};

export { Toaster };
