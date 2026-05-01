'use client';

import { toast } from 'sonner';
import { setMusicLanguages } from '@/features/music/api';

/**
 * The 17 Indian languages supported by the JioSaavn music API.
 * Used as the option set in {@link LanguagePickerDialog}.
 */
const LANGUAGES = [
  'hindi',
  'english',
  'punjabi',
  'tamil',
  'telugu',
  'marathi',
  'gujarati',
  'bengali',
  'kannada',
  'malayalam',
  'urdu',
  'bhojpuri',
  'rajasthani',
  'odia',
  'assamese',
  'haryanvi',
  'sanskrit',
] as const;

/**
 * Props for the {@link LanguagePickerDialog} component.
 */
interface LanguagePickerDialogProps {
  /** The currently selected language set (at least one must remain selected). */
  selectedLangs: Set<string>;
  /** Callback to update the selected languages in the parent's state. */
  onChangeLangs: (langs: Set<string>) => void;
  /** Closes the dialog overlay. */
  onClose: () => void;
  /** Called after the "Apply" button persists the selection — triggers a data reload. */
  onApply: () => void;
}

/**
 * Modal dialog for selecting preferred music languages.
 *
 * Displays a 2-column grid of 17 Indian language toggle buttons. At least one
 * language must remain selected (deselecting the last one is a no-op). Clicking
 * "Apply" persists the selection to the server via `setMusicLanguages`, closes
 * the dialog, and triggers a home-page data reload through `onApply`.
 */
export function LanguagePickerDialog({
  selectedLangs,
  onChangeLangs,
  onClose,
  onApply,
}: LanguagePickerDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
    >
      <div
        className="bg-background border-[3px] border-border p-6 w-80 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        <h3 className="font-headline font-black uppercase tracking-tighter text-lg mb-4">
          Music Languages
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                const next = new Set(selectedLangs);
                if (next.has(lang)) {
                  if (next.size > 1) next.delete(lang);
                } else next.add(lang);
                onChangeLangs(next);
              }}
              className={`px-3 py-2 border-[2px] font-headline font-bold text-[10px] uppercase tracking-wider transition-colors ${
                selectedLangs.has(lang)
                  ? 'border-neo-yellow bg-neo-yellow/10 text-foreground'
                  : 'border-border text-foreground/40 hover:border-foreground/20'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            const langs = [...selectedLangs].join(',');
            onClose();
            await setMusicLanguages(langs).catch(() => {});
            onApply();
            toast.success('Languages updated');
          }}
          className="w-full mt-4 py-2 bg-neo-yellow border-[2px] border-border font-headline font-black uppercase text-xs tracking-wider hover:brightness-110 transition-all"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
