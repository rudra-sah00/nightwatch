'use client';

import { AlertDialog as RadixAlertDialog } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: AlertDialogProps) {
  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixAlertDialog.Root>
  );
}

export function AlertDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixAlertDialog.Portal>
      <RadixAlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" />
      <RadixAlertDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2',
          'bg-background border-[4px] border-border rounded-none max-w-md w-full mx-4 p-8',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none',
          'focus:outline-none',
          className,
        )}
      >
        {children}
      </RadixAlertDialog.Content>
    </RadixAlertDialog.Portal>
  );
}

export function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4 mb-6', className)}>{children}</div>;
}

export function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AlertDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixAlertDialog.Title
      className={cn(
        'text-3xl font-black font-headline uppercase tracking-tighter text-foreground leading-none',
        className,
      )}
    >
      {children}
    </RadixAlertDialog.Title>
  );
}

export function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixAlertDialog.Description
      className={cn(
        'text-sm font-headline font-bold uppercase tracking-widest text-foreground/70 leading-relaxed',
        className,
      )}
    >
      {children}
    </RadixAlertDialog.Description>
  );
}

export function AlertDialogAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <RadixAlertDialog.Action asChild>
      <button
        className={cn(
          'px-6 py-3 bg-neo-red text-primary-foreground border-[3px] border-border font-headline font-black uppercase tracking-widest transition-[background-color,color,border-color,opacity,transform] duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </RadixAlertDialog.Action>
  );
}

export function AlertDialogCancel({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <RadixAlertDialog.Cancel asChild>
      <button
        className={cn(
          'px-6 py-3 bg-background text-foreground border-[3px] border-border font-headline font-black uppercase tracking-widest transition-[background-color,color,border-color,opacity,transform] duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </RadixAlertDialog.Cancel>
  );
}
