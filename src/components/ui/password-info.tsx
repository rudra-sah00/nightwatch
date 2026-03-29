'use client';

import { Check, Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PasswordInfoProps {
  className?: string;
}

export function PasswordInfo({ className }: PasswordInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs font-headline font-black uppercase tracking-widest text-[#4a4a4a] hover:text-[#0055ff] transition-colors"
        aria-label="Password requirements"
      >
        <Info className="h-3.5 w-3.5 stroke-[3px]" />
        <span>Requirements</span>
      </button>

      {isOpen ? (
        <>
          {/* Full screen backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm cursor-pointer w-full h-full border-none"
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
          />

          {/* Centered Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative w-full max-w-sm bg-white border-[4px] border-[#1a1a1a] neo-shadow pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-requirements-title"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-white border-[3px] border-[#1a1a1a] p-1.5 text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-all neo-shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                aria-label="Close"
              >
                <X className="h-4 w-4 stroke-[3px]" />
              </button>

              <div className="p-8 space-y-6">
                {/* Header */}
                <h4
                  id="password-requirements-title"
                  className="font-black font-headline text-2xl uppercase tracking-tighter pr-8 text-[#1a1a1a]"
                >
                  Password Requirements
                </h4>

                {/* Requirements List */}
                <div className="space-y-3">
                  <RequirementItem text="8+ characters" />
                  <RequirementItem text="Uppercase (A-Z)" />
                  <RequirementItem text="Special char (!@#$%^&*)" />
                </div>

                {/* Breach note */}
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-[#4a4a4a] pt-4 border-t-[3px] border-[#1a1a1a]">
                  We check passwords against{' '}
                  <a
                    href="https://haveibeenpwned.com/Passwords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0055ff] underline hover:text-[#e63b2e] transition-colors"
                  >
                    known breaches
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RequirementItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-headline font-black uppercase tracking-widest text-[#1a1a1a]">
      <div className="flex-shrink-0 w-5 h-5 bg-[#d6f6d5] border-[2px] border-[#1a1a1a] flex items-center justify-center neo-shadow-sm">
        <Check className="h-3.5 w-3.5 text-[#1a1a1a] stroke-[3.5px]" />
      </div>
      <span>{text}</span>
    </div>
  );
}
