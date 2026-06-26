'use client';

import { Check, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

interface RemoveConfirmPopupProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
}

/**
 * Minimal confirmation popup for remove actions.
 * No borders — just a big check icon, a big cancel icon, and text.
 */
export function RemoveConfirmPopup({
  open,
  onConfirm,
  onCancel,
  message,
}: RemoveConfirmPopupProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[10050] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed top-[50%] left-[50%] z-[10060] translate-x-[-50%] translate-y-[-50%] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {message}
          </DialogPrimitive.Title>
          <div className="flex flex-col items-center gap-6 p-8">
            <p className="font-headline font-black text-lg sm:text-2xl uppercase tracking-wider text-white text-center max-w-xs">
              {message}
            </p>
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={onConfirm}
                aria-label="Confirm"
                className={cn(
                  'w-16 h-16 rounded-full bg-neo-green flex items-center justify-center',
                  'hover:scale-110 transition-transform',
                )}
              >
                <Check className="w-8 h-8 stroke-[3px] text-white" />
              </button>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel"
                className={cn(
                  'w-16 h-16 rounded-full bg-neo-red flex items-center justify-center',
                  'hover:scale-110 transition-transform',
                )}
              >
                <X className="w-8 h-8 stroke-[3px] text-white" />
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
