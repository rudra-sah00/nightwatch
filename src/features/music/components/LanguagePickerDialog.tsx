'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { setMusicLanguages } from '@/features/music/api';
import { cn } from '@/lib/utils';

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

interface LanguagePickerDialogProps {
  selectedLangs: Set<string>;
  onChangeLangs: (langs: Set<string>) => void;
  onClose: () => void;
  onApply: () => void;
}

export function LanguagePickerDialog({
  selectedLangs,
  onChangeLangs,
  onClose,
  onApply,
}: LanguagePickerDialogProps) {
  const t = useTranslations('music');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

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
    setVisible(false);
    setTimeout(async () => {
      onClose();
      await setMusicLanguages(langs).catch(() => {});
      onApply();
      toast.success(t('languagePicker.updated'));
    }, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[10100] flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className={`flex flex-col items-center max-h-[80vh] w-full max-w-sm px-6 transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        <h2 className="text-2xl md:text-3xl font-black font-headline uppercase tracking-tighter text-white mb-6">
          {t('languagePicker.title')}
        </h2>

        <div className="flex flex-col w-full gap-0.5 overflow-y-auto flex-1 no-scrollbar">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggle(lang)}
              className={cn(
                'w-full px-4 py-3 flex items-center justify-between text-left transition-all duration-200 rounded-sm',
                selectedLangs.has(lang)
                  ? 'text-white font-black'
                  : 'text-white/30 hover:text-white/60',
              )}
            >
              <span className="text-base font-headline font-bold tracking-wide capitalize">
                {lang}
              </span>
              {selectedLangs.has(lang) && (
                <Check className="w-4 h-4 stroke-[3px]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-6 mt-5">
          <button
            type="button"
            className="text-white text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white/80"
            onClick={handleApply}
          >
            apply ↵
          </button>
          <button
            type="button"
            className="text-white/60 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white"
            onClick={close}
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
