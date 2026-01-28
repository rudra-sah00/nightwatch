'use client';

import { AlertTriangle, Check, Info, Shield } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PasswordInfoProps {
  className?: string;
}

export function PasswordInfo({ className }: PasswordInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Password requirements"
      >
        <Info className="h-3.5 w-3.5" />
        <span>Password requirements</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Tooltip */}
          <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-lg border bg-popover p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">
                    Secure Password Requirements
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your password must meet all criteria below
                  </p>
                </div>
              </div>

              {/* Requirements List */}
              <div className="space-y-2 text-xs">
                <RequirementItem text="At least 8 characters long" />
                <RequirementItem text="Contains lowercase letter (a-z)" />
                <RequirementItem text="Contains uppercase letter (A-Z)" />
                <RequirementItem text="Contains number (0-9)" />
                <RequirementItem text="Contains special character (!@#$%^&*)" />
              </div>

              {/* Breach Detection Info */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-medium text-xs">
                      Data Breach Protection
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      We check if your password has been exposed in known data
                      breaches using{' '}
                      <a
                        href="https://haveibeenpwned.com/Passwords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        HaveIBeenPwned
                      </a>
                      . If detected, you'll need to choose a different password.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Use a unique
                  password you haven't used elsewhere. Consider using a password
                  manager.
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
    <div className="flex items-start gap-2">
      <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
