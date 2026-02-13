'use client';

import { Check, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PasswordInfoProps {
  className?: string;
}

export function PasswordInfo({ className }: PasswordInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors"
        aria-label="Password requirements"
      >
        <Info className="h-3.5 w-3.5" />
        <span>Requirements</span>
      </button>

      {isOpen && (
        <>
          {/* Full screen backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm cursor-pointer w-full h-full border-none"
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
          />

          {/* Centered Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative w-full max-w-sm bg-popover border border-white/10 rounded-2xl shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-requirements-title"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-5 space-y-4">
                {/* Header */}
                <h4
                  id="password-requirements-title"
                  className="font-semibold text-base pr-8"
                >
                  Password Requirements
                </h4>

                {/* Requirements List */}
                <div className="space-y-2.5">
                  <RequirementItem text="8+ characters" />
                  <RequirementItem text="Uppercase (A-Z)" />
                  <RequirementItem text="Special char (!@#$%^&*)" />
                </div>

                {/* Breach note */}
                <p className="text-xs text-muted-foreground/80 pt-2 border-t border-white/10">
                  We check passwords against{' '}
                  <a
                    href="https://haveibeenpwned.com/Passwords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:underline"
                  >
                    known breaches
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RequirementItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
      <span className="text-foreground/90">{text}</span>
    </div>
  );
}
