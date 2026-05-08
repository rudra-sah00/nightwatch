'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { EQ_PRESETS, type EqualizerBand } from '../engine/audio-engine';

const PRESET_NAMES = Object.keys(EQ_PRESETS);

/**
 * Equalizer panel with presets and custom band sliders.
 * Must be triggered by user gesture (initializes AudioContext).
 */
export function Equalizer({ onClose }: { onClose: () => void }) {
  const { initEqualizer, setEqBands, getEqBands, isRemoteControlling } =
    useMusicPlayerContext();
  const [bands, setBands] = useState<EqualizerBand[]>(getEqBands);
  const [activePreset, setActivePreset] = useState('flat');

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
    <div className="fixed inset-0 z-[10200] flex items-end sm:items-center justify-center animate-in fade-in duration-300">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
        aria-label="Close equalizer"
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:w-[90%] sm:max-w-sm flex flex-col gap-5 p-6 sm:rounded-2xl rounded-t-3xl bg-white/10 border border-white/10 backdrop-blur-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 ease-out pb-10 sm:pb-6">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-headline uppercase tracking-wider text-white">
            Equalizer
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all duration-200 ${
                activePreset === name
                  ? 'bg-white text-black border-white scale-105'
                  : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Band sliders */}
        <div className="flex items-end justify-between gap-3 h-40">
          {bands.map((band, i) => (
            <div
              key={band.frequency}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <span className="text-[9px] text-white/40 font-mono tabular-nums">
                {band.gain > 0 ? '+' : ''}
                {band.gain.toFixed(0)}
              </span>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={band.gain}
                onChange={(e) => handleBandChange(i, Number(e.target.value))}
                className="w-full h-28 accent-white appearance-none cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
              />
              <span className="text-[9px] text-white/50 font-mono">
                {band.frequency >= 1000
                  ? `${(band.frequency / 1000).toFixed(1)}k`
                  : band.frequency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
