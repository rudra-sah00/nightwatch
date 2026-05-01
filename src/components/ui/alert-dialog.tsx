'use client';

import { AlertDialog as RadixAlertDialog } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

/** Props for the {@link AlertDialog} root component. */
interface AlertDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback fired when the open state changes. */
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Controlled alert dialog root. Wraps Radix `AlertDialog.Root`.
 *
 * Unlike {@link Dialog}, an alert dialog requires an explicit user action
 * (confirm or cancel) and cannot be dismissed by clicking the overlay.
 */
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

/**
 * Centered alert dialog panel rendered in a portal with a blurred overlay.
 * Styled with neo-brutalist 4px borders.
 */
export function AlertDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixAlertDialog.Portal>
      <RadixAlertDialog.Overlay className="fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[60] bg-black/80 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" />
      <RadixAlertDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2',
          'bg-background border-[4px] border-border rounded-none w-[calc(100%-2rem)] max-w-md p-6 md:p-8',
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

/** Header section for alert dialog title and description. */
export function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4 mb-6', className)}>{children}</div>;
}

/** Footer area for alert dialog action and cancel buttons. */
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

/** Bold, uppercase alert dialog title. Wraps Radix `AlertDialog.Title`. */
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
        'text-2xl md:text-3xl font-black font-headline uppercase tracking-tighter text-foreground leading-none',
        className,
      )}
    >
      {children}
    </RadixAlertDialog.Title>
  );
}

/** Muted description text for the alert dialog. */
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

/**
 * Destructive/confirm action button. Closes the dialog on click.
 * Styled with `neo-red` background by default.
 */
export function AlertDialogAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <RadixAlertDialog.Action asChild>
      <button
        className={cn(
          'w-full sm:w-auto px-6 py-3 bg-neo-red text-primary-foreground border-[3px] border-border font-headline font-black uppercase tracking-widest transition-[background-color,color,border-color,opacity,transform] duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </RadixAlertDialog.Action>
  );
}

/** Cancel button that dismisses the alert dialog without taking action. */
export function AlertDialogCancel({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <RadixAlertDialog.Cancel asChild>
      <button
        className={cn(
          'w-full sm:w-auto px-6 py-3 bg-background text-foreground border-[3px] border-border font-headline font-black uppercase tracking-widest transition-[background-color,color,border-color,opacity,transform] duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </RadixAlertDialog.Cancel>
  );
}
