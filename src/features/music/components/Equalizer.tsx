'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { EQ_PRESETS, type EqualizerBand } from '../engine/audio-engine';

const PRESET_NAMES = Object.keys(EQ_PRESETS);

/**
 * Equalizer panel with presets and custom band sliders.
 * Must be triggered by user gesture (initializes AudioContext).
 */
export function Equalizer({ onClose }: { onClose: () => void }) {
  const t = useTranslations('music');
  const { initEqualizer, setEqBands, getEqBands, isRemoteControlling } =
    useMusicPlayerContext();
  const [bands, setBands] = useState<EqualizerBand[]>(getEqBands);
  const [activePreset, setActivePreset] = useState('flat');

  // Sync UI when EQ is updated remotely
  useEffect(() => {
    const onEqUpdated = (e: Event) => {
      const newBands = (e as CustomEvent).detail as EqualizerBand[];
      if (newBands) {
        setBands(newBands);
        setActivePreset('');
      }
    };
    window.addEventListener('music:eq-updated', onEqUpdated);
    return () => window.removeEventListener('music:eq-updated', onEqUpdated);
  }, []);

  const BAND_LABELS = [
    t('equalizer.bass'),
    t('equalizer.lowMid'),
    t('equalizer.mid'),
    t('equalizer.highMid'),
    t('equalizer.treble'),
  ];

  const handleInit = () => {
    if (!isRemoteControlling) initEqualizer();
  };

  const applyBands = (newBands: EqualizerBand[]) => {
    if (isRemoteControlling) {
      window.dispatchEvent(
        new CustomEvent('music:remote-command', {
          detail: { command: 'eq', value: newBands },
        }),
      );
    } else {
      setEqBands(newBands);
    }
  };

  const applyPreset = (name: string) => {
    handleInit();
    const preset = EQ_PRESETS[name] || EQ_PRESETS.flat;
    setBands(preset);
    applyBands(preset);
    setActivePreset(name);
  };

  const handleBandChange = (index: number, gain: number) => {
    handleInit();
    const updated = bands.map((b, i) => (i === index ? { ...b, gain } : b));
    setBands(updated);
    applyBands(updated);
    setActivePreset('');
  };

  return (
    <div className="fixed inset-0 z-[10200] flex flex-col items-center justify-center">
      {/* Backdrop — appears instantly */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl animate-in fade-in duration-200"
        aria-label={t('equalizer.close')}
      />

      {/* Cancel button — top right like language picker */}
      <button
        type="button"
        onClick={onClose}
        className="absolute z-50 text-white/50 hover:text-white font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors"
        style={{
          top: 'calc(2rem + env(safe-area-inset-top, 0px))',
          right: 'calc(2rem + env(safe-area-inset-right, 0px))',
        }}
      >
        {t('equalizer.cancel')}
      </button>

      {/* Content — centered */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6 animate-in slide-in-from-bottom-6 duration-400 ease-out">
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tighter text-white">
          {t('equalizer.title')}
        </h2>

        {/* Presets */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full justify-center flex-wrap">
          {PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap transition-all duration-200 ${
                activePreset === name
                  ? 'bg-white text-black border-white scale-105'
                  : 'border-white/20 text-white/50 hover:text-white hover:border-white/40'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Band sliders — centered */}
        <div className="flex items-center justify-center gap-5 sm:gap-7 w-full overflow-x-auto no-scrollbar py-2">
          {bands.map((band, i) => {
            const pct = ((band.gain + 12) / 24) * 100;
            return (
              <div
                key={band.frequency}
                className="flex flex-col items-center gap-2 min-w-[40px]"
              >
                <span className="text-[9px] text-white/50 font-mono tabular-nums">
                  {band.gain > 0 ? '+' : ''}
                  {band.gain.toFixed(0)}dB
                </span>
                <div className="relative h-32 w-6 flex items-center justify-center">
                  {/* Track background */}
                  <div className="absolute w-1 h-full rounded-full bg-white/10" />
                  {/* Fill from center */}
                  <div
                    className="absolute w-1 rounded-full bg-white/60 transition-all duration-100"
                    style={{
                      height: `${Math.abs(pct - 50)}%`,
                      bottom: pct >= 50 ? '50%' : `${pct}%`,
                      top: pct < 50 ? '50%' : undefined,
                    }}
                  />
                  {/* Center line */}
                  <div className="absolute w-3 h-[1px] bg-white/30 top-1/2" />
                  {/* Invisible range input */}
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={band.gain}
                    onChange={(e) =>
                      handleBandChange(i, Number(e.target.value))
                    }
                    className="absolute w-full h-full opacity-0 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                  />
                  {/* Thumb */}
                  <div
                    className="absolute w-4 h-4 rounded-full bg-white shadow-lg shadow-white/20 pointer-events-none transition-all duration-100"
                    style={{ bottom: `calc(${pct}% - 8px)` }}
                  />
                </div>
                {/* Band label */}
                <span className="text-[9px] text-white/60 font-headline font-bold uppercase tracking-wider">
                  {BAND_LABELS[i]}
                </span>
                <span className="text-[8px] text-white/30 font-mono">
                  {band.frequency >= 1000
                    ? `${(band.frequency / 1000).toFixed(1)}k`
                    : `${band.frequency}`}
                  Hz
                </span>
              </div>
            );
          })}
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={() => applyPreset('flat')}
          className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/30 rounded-full transition-colors"
        >
          {t('equalizer.resetFlat')}
        </button>
      </div>
    </div>
  );
}
