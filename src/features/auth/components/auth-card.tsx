import type React from 'react';

/**
 * Props for the {@link AuthCard} layout wrapper.
 */
interface AuthCardProps {
  /** Heading text rendered in the title row (34–38 px, uppercase, bold). */
  title: string;
  /**
   * Optional action element rendered on the right side of the title row.
   * Typically a "Back" button in the OTP verification step.
   */
  action?: React.ReactNode;
  /** Form content rendered in the flexible body area. */
  children: React.ReactNode;
  /** Explicit CSS height (overrides className-based height). */
  height?: string;
  /** Additional CSS classes merged onto the root container. */
  className?: string;
}

/**
 * Shared layout card for all authentication forms (login, signup, forgot password).
 *
 * Renders a fixed-height column with four zones:
 * 1. **Brand row** (32 px) — "NIGHTWATCH" wordmark.
 * 2. **Title row** (52 px) — large uppercase heading with an optional right-aligned
 *    action slot (e.g. a back button).
 * 3. **Gap** (8 px) — visual breathing room.
 * 4. **Body** (flex-1) — scrollable area for the form content passed as `children`.
 *
 * @param props - {@link AuthCardProps}
 * @returns The auth card wrapper element.
 */
export function AuthCard({
  title,
  action,
  children,
  height,
  className = '',
}: AuthCardProps) {
  return (
    <div
      className={`w-full flex flex-col overflow-hidden ${className}`}
      style={height ? { height } : undefined}
    >
      {/* ── BRAND ROW — 32px ── */}
      <div className="shrink-0 h-8 flex items-end">
        <h1 className="text-xl md:text-[22px] font-black italic tracking-[-0.05em] uppercase text-foreground leading-none font-headline whitespace-nowrap">
          NIGHTWATCH
        </h1>
      </div>

      {/* ── TITLE ROW — 52px ── */}
      <div className="shrink-0 h-[52px] border-b-[5px] border-border flex items-center justify-between mt-0">
        <h2 className="text-[34px] md:text-[38px] font-black uppercase tracking-[-0.04em] font-headline text-foreground leading-none whitespace-nowrap">
          {title}
        </h2>
        {action}
      </div>

      {/* ── GAP — 8px ── */}
      <div className="shrink-0 h-2" />

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
