import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

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
