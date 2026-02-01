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
      <div className="relative z-50">{children}</div>
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
        'bg-zinc-900 border border-white/10 rounded-lg shadow-xl max-w-md w-full mx-4 p-6',
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
  return <div className={cn('space-y-2 mb-4', className)}>{children}</div>;
}

export function AlertDialogFooter({
  children,
  className,
}: AlertDialogFooterProps) {
  return (
    <div className={cn('flex justify-end gap-3 mt-6', className)}>
      {children}
    </div>
  );
}

export function AlertDialogTitle({
  children,
  className,
}: AlertDialogTitleProps) {
  return (
    <h2 className={cn('text-xl font-semibold text-white', className)}>
      {children}
    </h2>
  );
}

export function AlertDialogDescription({
  children,
  className,
}: AlertDialogDescriptionProps) {
  return <p className={cn('text-sm text-white/70', className)}>{children}</p>;
}

export function AlertDialogAction({
  children,
  className,
  ...props
}: AlertDialogActionProps) {
  return (
    <button
      className={cn(
        'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors',
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
        'px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md font-medium transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
