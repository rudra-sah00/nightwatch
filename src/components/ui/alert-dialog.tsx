'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface AlertDialogActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface AlertDialogCancelProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-default"
        onClick={() => onOpenChange(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onOpenChange(false);
        }}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      {/* Content */}
      <div className="relative z-50 animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
}

export function AlertDialogContent({
  children,
  className,
}: AlertDialogContentProps) {
  return (
    <div
      className={cn(
        'bg-white border-[4px] border-border rounded-none  max-w-md w-full mx-4 p-8 relative',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AlertDialogHeader({
  children,
  className,
}: AlertDialogHeaderProps) {
  return <div className={cn('space-y-4 mb-6', className)}>{children}</div>;
}

export function AlertDialogFooter({
  children,
  className,
}: AlertDialogFooterProps) {
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
}: AlertDialogTitleProps) {
  return (
    <h2
      className={cn(
        'text-3xl font-black font-headline uppercase tracking-tighter text-foreground leading-none',
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function AlertDialogDescription({
  children,
  className,
}: AlertDialogDescriptionProps) {
  return (
    <p
      className={cn(
        'text-sm font-headline font-bold uppercase tracking-widest text-[#4a4a4a] leading-relaxed',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function AlertDialogAction({
  children,
  className,
  ...props
}: AlertDialogActionProps) {
  return (
    <button
      className={cn(
        'px-6 py-3 bg-[#e63b2e] text-white border-[3px] border-border font-headline font-black uppercase tracking-widest  transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({
  children,
  className,
  ...props
}: AlertDialogCancelProps) {
  return (
    <button
      className={cn(
        'px-6 py-3 bg-white text-foreground border-[3px] border-border font-headline font-black uppercase tracking-widest  transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
