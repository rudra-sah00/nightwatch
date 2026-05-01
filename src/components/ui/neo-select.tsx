'use client';

import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** A single option in the {@link NeoSelect} dropdown. */
interface NeoSelectOption {
  /** Value submitted/tracked by the select. */
  value: string;
  /** Human-readable label displayed in the dropdown. */
  label: string;
}

/** Props for the {@link NeoSelect} component. */
interface NeoSelectProps {
  /** Currently selected value. */
  value: string;
  /** Available options. */
  options: NeoSelectOption[];
  /** Called with the new value when the user picks an option. */
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Custom dropdown select with neo-brutalist styling.
 *
 * Renders a button that toggles a positioned option list. Closes on outside
 * click. The selected option is highlighted with the primary color.
 */
export function NeoSelect({
  value,
  options,
  onChange,
  className,
}: NeoSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
    },
    [onChange],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between gap-2 bg-background border-[3px] border-border px-4 h-14 text-sm font-headline font-bold uppercase tracking-widest cursor-pointer w-full min-w-[140px] hover:border-foreground/30 transition-colors"
      >
        <span className="truncate">{selected?.label || 'Select'}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border-[3px] border-border shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-4 py-2.5 text-sm font-headline font-bold uppercase tracking-widest transition-colors ${
                opt.value === value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
