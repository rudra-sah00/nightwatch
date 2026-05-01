import type { LucideIcon } from 'lucide-react';

/** Props for the {@link EmptyState} component. */
interface EmptyStateProps {
  /** Lucide icon rendered at large size above the title. */
  icon: LucideIcon;
  /** Primary message displayed in bold uppercase. */
  title: string;
  /** Optional secondary explanation text. */
  description?: string;
}

/**
 * Placeholder shown when a list or section has no content.
 *
 * Renders a centered column with a large faded icon, a bold title, and an
 * optional description — all inside a neo-brutalist bordered surface.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-neo-surface border-[4px] border-border text-center">
      <Icon className="w-16 h-16 text-foreground opacity-20 mb-4 stroke-[3px]" />
      <p className="font-headline font-black uppercase tracking-widest text-foreground mb-2">
        {title}
      </p>
      {description && (
        <p className="font-headline font-bold uppercase tracking-widest text-neo-muted text-sm max-w-sm">
          {description}
        </p>
      )}
    </div>
  );
}
