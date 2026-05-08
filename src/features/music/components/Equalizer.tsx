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
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl animate-in fade-in duration-300"
        aria-label="Close equalizer"
      />

      {/* Controls */}
      <div className="relative z-10 w-full sm:w-auto sm:min-w-[380px] flex flex-col gap-4 px-6 pt-5 pb-8 sm:pb-6 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 ease-out">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-headline uppercase tracking-widest text-white/70">
            Equalizer
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset('flat')}
              className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/40 hover:text-white border border-white/10 hover:border-white/30 rounded-full transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
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

        {/* Band sliders — horizontal scroll on mobile */}
        <div className="flex items-end gap-4 h-44 overflow-x-auto no-scrollbar min-w-0">
          {bands.map((band, i) => {
            const pct = ((band.gain + 12) / 24) * 100;
            return (
              <div
                key={band.frequency}
                className="flex flex-col items-center gap-2 min-w-[40px]"
              >
                <span className="text-[9px] text-white/50 font-mono tabular-nums">
                  {band.gain > 0 ? '+' : ''}
                  {band.gain.toFixed(0)}
                </span>
                <div className="relative h-28 w-6 flex items-center justify-center">
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
                  <div className="absolute w-2.5 h-[1px] bg-white/20 top-1/2" />
                  {/* Invisible range input on top */}
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
                  {/* Thumb indicator */}
                  <div
                    className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-white/80 shadow-lg shadow-white/20 pointer-events-none transition-all duration-100"
                    style={{ bottom: `calc(${pct}% - 7px)` }}
                  />
                </div>
                <span className="text-[9px] text-white/40 font-mono">
                  {band.frequency >= 1000
                    ? `${(band.frequency / 1000).toFixed(1)}k`
                    : band.frequency}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
