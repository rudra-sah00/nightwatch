'use client';

import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { setMusicLanguages } from '@/features/music/api';
import { cn } from '@/lib/utils';

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
 * Full-screen language picker for music preferences.
 *
 * Matches the profile route's language selection design — full viewport
 * backdrop blur, large text options with check marks, and safe-area-aware
 * cancel/apply buttons.
 */
export function LanguagePickerDialog({
  selectedLangs,
  onChangeLangs,
  onClose,
  onApply,
}: LanguagePickerDialogProps) {
  const toggle = (lang: string) => {
    const next = new Set(selectedLangs);
    if (next.has(lang)) {
      if (next.size > 1) next.delete(lang);
    } else {
      next.add(lang);
    }
    onChangeLangs(next);
  };

  const handleApply = async () => {
    const langs = [...selectedLangs].join(',');
    onClose();
    await setMusicLanguages(langs).catch(() => {});
    onApply();
    toast.success('Languages updated');
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[100] bg-white/80 dark:bg-black/60 backdrop-blur-2xl flex flex-col items-center overflow-hidden animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Music Languages"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {/* Cancel */}
      <button
        type="button"
        onClick={onClose}
        className="absolute z-50 text-foreground/50 hover:text-foreground font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors"
        style={{
          top: 'calc(2rem + env(safe-area-inset-top, 0px))',
          right: 'calc(2rem + env(safe-area-inset-right, 0px))',
        }}
      >
        Cancel
      </button>

      <div
        className="flex flex-col items-center w-full max-w-md px-6 h-full"
        style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}
      >
        <h2 className="text-3xl md:text-5xl font-black font-headline uppercase tracking-tighter text-foreground shrink-0 mb-6">
          Music Languages
        </h2>

        {/* Language list */}
        <div className="flex flex-col w-full gap-1 overflow-y-auto flex-1 pb-32 no-scrollbar">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggle(lang)}
              className={cn(
                'w-full px-6 py-4 flex items-center justify-between text-left transition-all duration-200',
                selectedLangs.has(lang)
                  ? 'text-foreground font-black [text-shadow:0_0_12px_rgba(255,255,255,0.5)]'
                  : 'text-foreground/30 hover:text-foreground/60',
              )}
            >
              <span className="text-lg font-headline font-bold tracking-wide capitalize">
                {lang}
              </span>
              {selectedLangs.has(lang) && (
                <Check className="w-5 h-5 stroke-[3px]" />
              )}
            </button>
          ))}
        </div>

        {/* Apply button — sticky bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/80 to-transparent"
          style={{
            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <button
            type="button"
            onClick={handleApply}
            className="w-full max-w-md mx-auto block py-4 bg-neo-yellow border-[3px] border-border font-headline font-black uppercase tracking-[0.2em] text-foreground text-base hover:brightness-110 transition-all rounded-md"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
