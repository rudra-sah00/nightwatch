import { base64ToFloat32 } from './pcm';

/**
 * Assistant audio playback for Nova Sonic.
 *
 * Uses the AudioWorklet in `public/audio-player-processor.js`, whose ring
 * buffer smooths uneven socket delivery and — importantly for barge-in —
 * supports discarding everything already queued via a single `barge-in`
 * message.
 *
 * The previous approach scheduled a fresh AudioBufferSourceNode per chunk with
 * `start(nextPlayTime)` and kept no references, so queued audio could not be
 * cancelled; interrupting the assistant meant closing the whole AudioContext.
 * The fallback path here keeps those references so `flush()` works either way.
 */

const OUTPUT_SAMPLE_RATE = 24000;
const WORKLET_URL = '/audio-player-processor.js';

/** Pre-buffer before playback starts. Trades jitter resistance for latency. */
const INITIAL_BUFFER_FRAMES = 4800; // 0.2s at 24kHz

export interface AudioPlayback {
  /** Queues a base64 16-bit PCM chunk from the assistant. */
  enqueue(base64: string): void;
  /** Drops everything queued or scheduled — used for barge-in. */
  flush(): void;
  close(): Promise<void>;
  readonly usingWorklet: boolean;
}

export async function startAudioPlayback(): Promise<AudioPlayback> {
  const ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  if (typeof ctx.audioWorklet?.addModule === 'function') {
    try {
      await ctx.audioWorklet.addModule(WORKLET_URL);
      const node = new AudioWorkletNode(ctx, 'audio-player-processor');
      node.port.postMessage({
        type: 'config',
        initialBufferLength: INITIAL_BUFFER_FRAMES,
      });
      node.connect(ctx.destination);

      return {
        usingWorklet: true,
        enqueue(base64) {
          const samples = base64ToFloat32(base64);
          if (samples.length === 0) return;
          node.port.postMessage({ type: 'audio', audioData: samples });
        },
        flush() {
          node.port.postMessage({ type: 'barge-in' });
        },
        async close() {
          node.disconnect();
          if (ctx.state !== 'closed') await ctx.close().catch(() => {});
        },
      };
    } catch {
      // Fall through to manual scheduling.
    }
  }

  // --- Fallback: manual buffer scheduling, with cancellable sources ---
  let nextPlayTime = 0;
  let scheduled: AudioBufferSourceNode[] = [];

  const forget = (node: AudioBufferSourceNode) => {
    scheduled = scheduled.filter((n) => n !== node);
  };

  const flush = () => {
    for (const src of scheduled.splice(0)) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Already finished — nothing to cancel.
      }
    }
    nextPlayTime = 0;
  };

  return {
    usingWorklet: false,
    enqueue(base64) {
      const samples = base64ToFloat32(base64);
      if (samples.length === 0) return;

      const buffer = ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);

      if (nextPlayTime < ctx.currentTime) {
        nextPlayTime = ctx.currentTime + 0.05;
      }
      src.start(nextPlayTime);
      nextPlayTime += buffer.duration;

      // Retained so flush() can cancel audio that has not played yet.
      scheduled.push(src);
      src.onended = () => forget(src);
    },
    flush,
    async close() {
      flush();
      if (ctx.state !== 'closed') await ctx.close().catch(() => {});
    },
  };
}
