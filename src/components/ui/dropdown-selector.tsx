'use client';

import { ChevronDown } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';

interface DropdownOption<T = unknown> {
  value: T;
  label: string;
  count?: number;
  data?: unknown;
}

interface DropdownSelectorProps<T = unknown> {
  options: DropdownOption<T>[];
  selectedValue: T;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  renderLabel?: (option: DropdownOption<T>) => React.ReactNode;
  renderOption?: (option: DropdownOption<T>) => React.ReactNode;
  placeholder?: string;
  className?: string;
}

export function DropdownSelector<T = unknown>({
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
  renderLabel,
  renderOption,
  placeholder = 'Select...',
  className = '',
}: DropdownSelectorProps<T>) {
  if (options.length === 0) return null;

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const defaultRenderLabel = (option: DropdownOption<T>) => (
    <span>
      {option.label}
      {option.count !== undefined && ` (${option.count} EP)`}
    </span>
  );

  const defaultRenderOption = (option: DropdownOption<T>) => (
    <>
      {option.label}
      {option.count !== undefined && ` (${option.count} EP)`}
    </>
  );

  if (options.length === 1) {
    return (
      <span className="text-zinc-400">
        {renderLabel ? renderLabel(options[0]) : defaultRenderLabel(options[0])}
      </span>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 border border-zinc-700 rounded hover:border-zinc-600 transition-colors"
        onClick={onToggle}
      >
        {selectedOption ? (
          renderLabel ? (
            renderLabel(selectedOption)
          ) : (
            defaultRenderLabel(selectedOption)
          )
        ) : (
          <span className="text-zinc-400">{placeholder}</span>
        )}
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded overflow-hidden shadow-xl z-10 min-w-full">
          {options.map((option) => (
            <button
              type="button"
              key={String(option.value)}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors whitespace-nowrap',
                selectedValue === option.value && 'bg-zinc-700'
              )}
              onClick={() => onSelect(option.value)}
            >
              {renderOption ? renderOption(option) : defaultRenderOption(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
