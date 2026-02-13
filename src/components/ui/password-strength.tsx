'use client';

import { useMemo } from 'react';
import {
  getPasswordStrength,
  type PasswordStrengthResult,
} from '@/features/auth/schema';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

/**
 * Visual password strength indicator with 3 states: Weak / Fair / Strong
 * Shows a segmented bar + label with color feedback.
 */
export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthProps) {
  const result: PasswordStrengthResult = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  if (!password) return null;

  const segmentKeys = ['weak', 'fair', 'strong'] as const;
  const activeSegments =
    result.strength === 'strong' ? 3 : result.strength === 'fair' ? 2 : 1;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Bar */}
      <div className="flex gap-1">
        {segmentKeys.map((key, i) => (
          <div
            key={key}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              i < activeSegments ? '' : 'bg-muted',
            )}
            style={{
              backgroundColor: i < activeSegments ? result.color : undefined,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <p
        className="text-xs font-medium transition-colors duration-300"
        style={{ color: result.color }}
      >
        {result.label}
      </p>
    </div>
  );
}
