'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Props for the {@link NeoSearchBar} component. */
interface NeoSearchBarProps {
  /** Current search query value. */
  value: string;
  /** Change handler for the search input. */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Placeholder text. Defaults to `'Search...'`. */
  placeholder?: string;
  className?: string;
}

/**
 * Neo-brutalist search input with a leading magnifying-glass icon.
 *
 * Renders a tall (56px) {@link Input} with bold uppercase styling, a focus
 * ring, and a search icon positioned inside the left padding.
 */
export function NeoSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: NeoSearchBarProps) {
  return (
    <div className={`relative w-full ${className || ''}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground/50" />
      <Input
        className="pl-14 h-14 bg-background border-[3px] border-border font-headline font-bold text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2 uppercase tracking-widest placeholder:text-foreground/30 rounded-md transition-all w-full"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
