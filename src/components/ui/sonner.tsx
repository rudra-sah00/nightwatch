'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const TOAST_OPTIONS = {
  classNames: {
    toast:
      'group toast group-[.toaster]:bg-[#f5f0e8] group-[.toaster]:text-[#1a1a1a] group-[.toaster]:border-4 group-[.toaster]:border-[#1a1a1a] group-[.toaster]:rounded-none group-[.toaster]:neo-shadow-sm font-body font-bold w-full',
    description: 'group-[.toast]:font-medium group-[.toast]:opacity-80',
    actionButton:
      'group-[.toast]:bg-[#1a1a1a] group-[.toast]:text-white group-[.toast]:border-4 group-[.toast]:border-[#1a1a1a] group-[.toast]:rounded-none font-headline font-bold uppercase tracking-widest',
    cancelButton:
      'group-[.toast]:bg-white group-[.toast]:text-[#1a1a1a] group-[.toast]:border-4 group-[.toast]:border-[#1a1a1a] group-[.toast]:rounded-none font-headline font-bold uppercase tracking-widest',
    error:
      'group-[.toast]:!bg-[#ffdad6] group-[.toast]:!text-[#1a1a1a] group-[.toast]:!border-[#1a1a1a]',
    success:
      'group-[.toast]:!bg-[#d6f6d5] group-[.toast]:!text-[#1a1a1a] group-[.toast]:!border-[#1a1a1a]',
    warning:
      'group-[.toast]:!bg-[#ffcc00] group-[.toast]:!text-[#1a1a1a] group-[.toast]:!border-[#1a1a1a]',
    info: 'group-[.toast]:!bg-[#d6e3ff] group-[.toast]:!text-[#1a1a1a] group-[.toast]:!border-[#1a1a1a]',
  },
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={TOAST_OPTIONS}
      {...props}
    />
  );
};

export { Toaster };
