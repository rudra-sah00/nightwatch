import type React from 'react';

interface AuthCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  height?: string;
  className?: string;
}

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
