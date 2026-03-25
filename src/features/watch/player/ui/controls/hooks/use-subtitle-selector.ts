'use client';

import { useEffect, useRef, useState } from 'react';
import {
  applySubtitleSettings,
  type SubtitleSettings,
  saveSubtitleSettings,
} from '../utils/subtitle-settings';

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
}

export type SubtitleMenuScreen = 'tracks' | 'style';

interface UseSubtitleSelectorOptions {
  tracks: SubtitleTrack[];
  currentTrack?: string | null;
  onTrackChange?: (id: string | null) => void;
  subtitleSettings: SubtitleSettings;
  onSubtitleSettingsChange?: (settings: SubtitleSettings) => void;
}

export function useSubtitleSelector({
  tracks,
  currentTrack,
  onTrackChange,
  subtitleSettings,
  onSubtitleSettingsChange,
}: UseSubtitleSelectorOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScreen, setCurrentScreen] =
    useState<SubtitleMenuScreen>('tracks');
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside (passive listener for better perf)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCurrentScreen('tracks');
      }
    };

    document.addEventListener('mousedown', handleClickOutside, {
      passive: true,
    });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isActive = !!currentTrack;
  const currentLabel = tracks.find((t) => t.id === currentTrack)?.label;

  const updateSettings = (newSettings: SubtitleSettings) => {
    onSubtitleSettingsChange?.(newSettings);
    applySubtitleSettings(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const handleFontSizeChange = (value: string) =>
    updateSettings({ ...subtitleSettings, fontSize: value });

  const handleFontFamilyChange = (value: string) =>
    updateSettings({ ...subtitleSettings, fontFamily: value });

  const handleBackgroundColorChange = (value: string) =>
    updateSettings({ ...subtitleSettings, backgroundColor: value });

  const handleTextColorChange = (value: string) =>
    updateSettings({ ...subtitleSettings, textColor: value });

  const handleTextShadowChange = (value: string) =>
    updateSettings({ ...subtitleSettings, textShadow: value });

  const handleTrackChange = (trackId: string | null) => {
    setIsLoading(true);
    onTrackChange?.(trackId);
    setIsLoading(false);
  };

  const toggleMenu = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) setCurrentScreen('tracks');
  };

  return {
    menuRef,
    isOpen,
    setIsOpen,
    currentScreen,
    setCurrentScreen,
    isLoading,
    isActive,
    currentLabel,
    toggleMenu,
    handleFontSizeChange,
    handleFontFamilyChange,
    handleBackgroundColorChange,
    handleTextColorChange,
    handleTextShadowChange,
    handleTrackChange,
  };
}
