'use client';

import { Check, Info, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Props for the {@link PasswordInfo} component. */
interface PasswordInfoProps {
  className?: string;
}

/**
 * Inline info button that opens a modal listing password requirements.
 *
 * Displays minimum character count, uppercase requirement, and special
 * character rules. Includes a note about known-breach checking via
 * Have I Been Pwned. Closes on Escape key or backdrop click.
 */
export function PasswordInfo({ className }: PasswordInfoProps) {
  const t = useTranslations('common');
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
        className="inline-flex items-center gap-1.5 text-xs font-headline font-black uppercase tracking-widest text-foreground/70 hover:text-neo-blue transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2"
        aria-label={t('passwordInfo.ariaLabel')}
      >
        <Info className="h-3.5 w-3.5 stroke-[3px]" />
        <span>{t('passwordInfo.requirements')}</span>
      </button>

      {isOpen ? (
        <>
          {/* Full screen backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm cursor-pointer w-full h-full border-none"
            onClick={() => setIsOpen(false)}
            aria-label={t('actions.closeModal')}
          />

          {/* Centered Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative w-full max-w-sm bg-background border-[4px] border-border  pointer-events-auto motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-requirements-title"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-background border-[3px] border-border p-1.5 text-foreground hover:bg-neo-red hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2"
                aria-label={t('actions.close')}
              >
                <X className="h-4 w-4 stroke-[3px]" />
              </button>

              <div className="p-8 space-y-6">
                {/* Header */}
                <h4
                  id="password-requirements-title"
                  className="font-black font-headline text-2xl uppercase tracking-tighter pr-8 text-foreground"
                >
                  {t('passwordInfo.title')}
                </h4>

                {/* Requirements List */}
                <div className="space-y-3">
                  <RequirementItem text={t('passwordInfo.minChars')} />
                  <RequirementItem text={t('passwordInfo.uppercase')} />
                  <RequirementItem text={t('passwordInfo.specialChar')} />
                </div>
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
    <div className="flex items-center gap-3 text-sm font-headline font-black uppercase tracking-widest text-foreground">
      <div className="flex-shrink-0 w-5 h-5 bg-success/20 border-[2px] border-border flex items-center justify-center ">
        <Check className="h-3.5 w-3.5 text-foreground stroke-[3.5px]" />
      </div>
      <span>{text}</span>
    </div>
  );
}
