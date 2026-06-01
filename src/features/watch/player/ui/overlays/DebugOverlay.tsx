'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';

interface LogEntry {
  time: number;
  msg: string;
}

const MAX_LOGS = 80;

const isStaging =
  typeof window !== 'undefined' &&
  window.location.hostname === 'dev.nightwatch.in';

/**
 * Green-screen debug overlay — only renders on staging (dev.nightwatch.in).
 * Shows real-time player state, HLS metrics, and a scrollable event log.
 * Triple-tap the video to toggle. Copy button exports all logs to clipboard.
 */
export function DebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const { state, videoRef, hlsRef, streamUrl, metadata } = usePlayerContext();

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => {
      const next = [...prev, { time: Date.now(), msg }];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  // Log player state changes
  useEffect(() => {
    if (!visible || !isStaging) return;
    if (state.isLoading) addLog('⏳ Loading...');
  }, [state.isLoading, visible, addLog]);

  useEffect(() => {
    if (!visible || !isStaging) return;
    if (state.isBuffering) addLog('🔄 Buffering...');
  }, [state.isBuffering, visible, addLog]);

  useEffect(() => {
    if (!visible || !isStaging) return;
    if (state.error) addLog(`❌ Error: ${state.error}`);
  }, [state.error, visible, addLog]);

  useEffect(() => {
    if (!visible || !isStaging) return;
    addLog(state.isPlaying ? '▶️ Playing' : '⏸️ Paused');
  }, [state.isPlaying, visible, addLog]);

  useEffect(() => {
    if (!visible || !isStaging) return;
    if (state.currentQuality !== 'auto')
      addLog(`🎞️ Quality → ${state.currentQuality}`);
  }, [state.currentQuality, visible, addLog]);

  // Log stream URL changes (refetch detection)
  useEffect(() => {
    if (!visible || !isStaging) return;
    if (streamUrl) addLog(`🔗 Stream loaded: ${streamUrl.slice(0, 60)}...`);
  }, [streamUrl, visible, addLog]);

  // Triple-tap to toggle
  useEffect(() => {
    if (!isStaging) return;
    const container = document.querySelector('.video-container');
    if (!container) return;

    const handler = () => {
      tapCountRef.current += 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (tapCountRef.current >= 3) {
        tapCountRef.current = 0;
        setVisible((v) => !v);
      } else {
        tapTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
        }, 400);
      }
    };

    container.addEventListener('dblclick', handler);
    return () => container.removeEventListener('dblclick', handler);
  }, []);

  const handleCopy = useCallback(async () => {
    const video = videoRef.current;
    const hls = hlsRef.current;

    const info = [
      '=== Nightwatch Player Debug ===',
      `Time: ${new Date().toISOString()}`,
      `Stream: ${streamUrl}`,
      `Title: ${metadata.title}`,
      `State: ${state.isPlaying ? 'playing' : 'paused'} | Quality: ${state.currentQuality}`,
      `Time: ${state.currentTime.toFixed(1)}s / ${state.duration.toFixed(1)}s`,
      `Buffered: ${state.buffered.toFixed(1)}s`,
      `Video readyState: ${video?.readyState ?? 'N/A'}`,
      `Video networkState: ${video?.networkState ?? 'N/A'}`,
      `HLS active: ${!!hls}`,
      hls
        ? `HLS level: ${hls.currentLevel} / ${hls.levels?.length ?? 0} levels`
        : '',
      hls
        ? `HLS bandwidth: ${((hls.bandwidthEstimate ?? 0) / 1e6).toFixed(1)} Mbps`
        : '',
      '\n=== Event Log ===',
      ...logs.map((l) => `[${new Date(l.time).toLocaleTimeString()}] ${l.msg}`),
    ]
      .filter(Boolean)
      .join('\n');

    await navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [videoRef, hlsRef, streamUrl, metadata, state, logs]);

  // Don't render anything in production
  if (!isStaging) return null;
  if (!visible) return null;

  const video = videoRef.current;
  const hls = hlsRef.current;

  return (
    <div
      className="absolute top-0 left-0 right-0 bottom-0 z-[9998] pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute top-2 left-2 right-2 max-h-[70%] overflow-hidden pointer-events-auto rounded-md bg-black/85 border border-green-500/60 p-2 font-mono text-[10px] leading-tight text-green-400 select-text">
        {/* Header */}
        <div className="flex items-center justify-between mb-1 border-b border-green-500/30 pb-1">
          <span className="text-green-300 font-bold text-[11px]">🟢 DEBUG</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[9px] bg-green-900/60 border border-green-500/40 rounded px-1.5 py-0.5 text-green-300 active:bg-green-700/60"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-1.5">
          <span>
            ▶ {state.isPlaying ? 'PLAYING' : 'PAUSED'}
            {state.isBuffering ? ' (buffering)' : ''}
          </span>
          <span>🎞️ {state.currentQuality}</span>
          <span>
            ⏱️ {state.currentTime.toFixed(1)}s / {state.duration.toFixed(1)}s
          </span>
          <span>📦 Buf: {state.buffered.toFixed(1)}s</span>
          <span>📡 readyState: {video?.readyState ?? '-'}</span>
          <span>🌐 networkState: {video?.networkState ?? '-'}</span>
          {hls && (
            <>
              <span>
                🔧 HLS lvl: {hls.currentLevel}/{hls.levels?.length ?? 0}
              </span>
              <span>
                📊 {((hls.bandwidthEstimate ?? 0) / 1e6).toFixed(1)} Mbps
              </span>
            </>
          )}
          {!hls && <span>📱 Native AVPlayer</span>}
        </div>

        {/* Log */}
        <div
          ref={logRef}
          className="max-h-32 overflow-y-auto border-t border-green-500/30 pt-1 space-y-px"
        >
          {logs.map((l) => (
            <div key={`${l.time}-${l.msg}`} className="text-green-500/80">
              <span className="text-green-700">
                {new Date(l.time).toLocaleTimeString()}
              </span>{' '}
              {l.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
