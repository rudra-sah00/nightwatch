'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const TOAST_OPTIONS = {
  classNames: {
    toast:
      'group toast group-[.toaster]:bg-zinc-950 group-[.toaster]:text-zinc-50 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg',
    description: 'group-[.toast]:text-zinc-400',
    actionButton: 'group-[.toast]:bg-zinc-50 group-[.toast]:text-zinc-900',
    cancelButton: 'group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400',
    error: 'group-[.toast]:text-red-400',
    success: 'group-[.toast]:text-green-400',
    warning: 'group-[.toast]:text-yellow-400',
    info: 'group-[.toast]:text-blue-400',
  },
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={TOAST_OPTIONS}
      {...props}
    />
  );
};

export { Toaster };
