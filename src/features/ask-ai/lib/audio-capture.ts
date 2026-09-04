import { float32ToPcm, pcmToBase64 } from './pcm';

/**
 * Microphone capture for Nova Sonic.
 *
 * Prefers an AudioWorklet so resampling and Int16 conversion run on the audio
 * render thread. Falls back to a ScriptProcessorNode only where `audioWorklet`
 * is unavailable, since this ships to Capacitor WebViews and Android TV as well
 * as desktop browsers.
 *
 * Either way the emitted audio is genuinely 16 kHz: the resample decision comes
 * from the AudioContext's real `sampleRate`, not a user-agent check.
 */

const TARGET_SAMPLE_RATE = 16000;
const WORKLET_URL = '/audio-capture-processor.js';

/** ScriptProcessor buffer size, used only on the fallback path. */
const FALLBACK_BUFFER_SIZE = 2048;

export interface AudioCapture {
  /** Stops emitting without tearing down the graph. */
  setMuted(muted: boolean): void;
  /** Releases the mic, the nodes and the AudioContext. */
  close(): Promise<void>;
  /** True when the AudioWorklet path is in use. */
  readonly usingWorklet: boolean;
}

/**
 * Starts capturing the microphone, invoking `onChunk` with base64 16-bit PCM.
 *
 * @throws if mic permission is refused or no input device is available.
 */
export async function startAudioCapture(
  onChunk: (base64: string) => void,
): Promise<AudioCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      // Without echo cancellation the assistant hears its own voice through
      // the speakers, which reads as a user interruption and cuts it off.
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // Requesting 16 kHz avoids resampling where the browser honours it. Firefox
  // and Safari ignore it; the worklet handles that from the real rate.
  let ctx: AudioContext;
  try {
    ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    ctx = new AudioContext();
  }

  // Autoplay policies can hand back a suspended context.
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  const source = ctx.createMediaStreamSource(stream);
  const cleanup: Array<() => void> = [];
  let muted = false;

  const teardown = async () => {
    for (const fn of cleanup.splice(0)) {
      try {
        fn();
      } catch {
        // Best effort — keep releasing the rest.
      }
    }
    source.disconnect();
    for (const track of stream.getTracks()) track.stop();
    if (ctx.state !== 'closed') await ctx.close().catch(() => {});
  };

  if (typeof ctx.audioWorklet?.addModule === 'function') {
    try {
      await ctx.audioWorklet.addModule(WORKLET_URL);
      const node = new AudioWorkletNode(ctx, 'audio-capture-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
      });
      node.port.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; pcm?: Int16Array };
        if (data?.type === 'audio' && data.pcm) {
          onChunk(pcmToBase64(data.pcm));
        }
      };
      source.connect(node);
      cleanup.push(() => {
        node.port.onmessage = null;
        node.disconnect();
      });

      return {
        usingWorklet: true,
        setMuted(next) {
          muted = next;
          node.port.postMessage({ type: 'mute', muted: next });
        },
        close: teardown,
      };
    } catch {
      // Module failed to load (offline, CSP, stale service worker) — fall back.
    }
  }

  // --- Fallback: ScriptProcessorNode ---
  // Deprecated and main-thread, but better than no voice input at all.
  const ratio = ctx.sampleRate / TARGET_SAMPLE_RATE;
  const needsResample = Math.abs(ratio - 1) > 1e-6;
  const processor = ctx.createScriptProcessor(FALLBACK_BUFFER_SIZE, 1, 1);

  processor.onaudioprocess = (event) => {
    if (muted) return;
    const input = event.inputBuffer.getChannelData(0);

    if (!needsResample) {
      onChunk(pcmToBase64(float32ToPcm(input)));
      return;
    }

    // Decimate with linear interpolation. Correctness here is what the old
    // Firefox-only branch got wrong: it sized the output for the resampled
    // length but filled it at the input length on every other browser.
    const outLength = Math.floor(input.length / ratio);
    const resampled = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const next = idx + 1 < input.length ? input[idx + 1] : input[idx];
      resampled[i] = input[idx] * (1 - frac) + next * frac;
    }
    onChunk(pcmToBase64(float32ToPcm(resampled)));
  };

  source.connect(processor);
  // A ScriptProcessor only runs while connected to a destination. Routing it
  // through a silent gain node keeps it pumping without echoing the mic.
  const silent = ctx.createGain();
  silent.gain.value = 0;
  processor.connect(silent);
  silent.connect(ctx.destination);

  cleanup.push(() => {
    processor.onaudioprocess = null;
    processor.disconnect();
    silent.disconnect();
  });

  return {
    usingWorklet: false,
    setMuted(next) {
      muted = next;
    },
    close: teardown,
  };
}
