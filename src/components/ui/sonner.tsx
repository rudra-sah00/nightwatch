'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const TOAST_OPTIONS = {
  duration: 5200,
  classNames: {
    toast:
      'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-4 group-[.toaster]:border-border group-[.toaster]:rounded-none group-[.toaster]:font-body group-[.toaster]:font-bold w-full leading-relaxed',
    title:
      'group-[.toast]:font-headline group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:tracking-wider group-[.toast]:text-[12px]',
    description:
      'group-[.toast]:font-medium group-[.toast]:opacity-90 group-[.toast]:leading-relaxed group-[.toast]:break-words',
    actionButton:
      'group-[.toast]:bg-[#1a1a1a] group-[.toast]:text-white group-[.toast]:border-4 group-[.toast]:border-border group-[.toast]:rounded-none font-headline font-bold uppercase tracking-widest',
    cancelButton:
      'group-[.toast]:bg-white group-[.toast]:text-foreground group-[.toast]:border-4 group-[.toast]:border-border group-[.toast]:rounded-none font-headline font-bold uppercase tracking-widest',
    error:
      'group-[.toast]:!bg-[#ffdad6] group-[.toast]:!text-foreground group-[.toast]:!border-border group-[.toast]:shadow-[inset_8px_0_0_0_#e63b2e]',
    success:
      'group-[.toast]:!bg-[#d6f6d5] group-[.toast]:!text-foreground group-[.toast]:!border-border',
    warning:
      'group-[.toast]:!bg-[#ffcc00] group-[.toast]:!text-foreground group-[.toast]:!border-border',
    info: 'group-[.toast]:!bg-[#d6e3ff] group-[.toast]:!text-foreground group-[.toast]:!border-border',
  },
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={TOAST_OPTIONS}
      closeButton
      expand
      visibleToasts={5}
      {...props}
    />
  );
};

export { Toaster };
