/**
 * AudioWorklet Processor for Nova Sonic microphone capture.
 *
 * Replaces a main-thread ScriptProcessorNode. Capture now runs on the audio
 * render thread, so resampling and Int16 conversion no longer compete with
 * React rendering, and there is no deprecated API in the path.
 *
 * Resampling is driven by the *actual* `sampleRate` of the AudioContext rather
 * than a browser sniff. Chrome honours `new AudioContext({ sampleRate: 16000 })`
 * and needs no conversion; Firefox and Safari/iOS ignore it and hand us the
 * device rate (typically 44.1/48 kHz). Deciding from the real rate means every
 * browser sends true 16 kHz audio instead of mislabelled device-rate audio.
 *
 * Posts `{ type: 'audio', pcm: Int16Array }` to the main thread, which
 * base64-encodes and forwards it over the socket.
 */

const TARGET_SAMPLE_RATE = 16000;

/** ~32 ms of 16 kHz audio per message — small enough to keep latency low. */
const FRAMES_PER_MESSAGE = 512;

class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // `sampleRate` is a global in AudioWorkletGlobalScope.
    this.ratio = sampleRate / TARGET_SAMPLE_RATE;
    this.needsResample = Math.abs(this.ratio - 1) > 1e-6;

    // Fractional read position into the pending input, carried across renders
    // so resampling does not drift or click at buffer boundaries.
    this.readPos = 0;
    this.pending = new Float32Array(0);

    this.out = new Int16Array(FRAMES_PER_MESSAGE);
    this.outLen = 0;

    this.muted = false;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'mute') {
        this.muted = Boolean(data.muted);
      } else if (data.type === 'flush') {
        this.pending = new Float32Array(0);
        this.readPos = 0;
        this.outLen = 0;
      }
    };
  }

  /** Appends a render quantum to the pending input buffer. */
  append(input) {
    const merged = new Float32Array(this.pending.length + input.length);
    merged.set(this.pending, 0);
    merged.set(input, this.pending.length);
    this.pending = merged;
  }

  emitSample(value) {
    const clamped = Math.max(-1, Math.min(1, value));
    this.out[this.outLen++] = clamped * 0x7fff;
    if (this.outLen === FRAMES_PER_MESSAGE) {
      // Copy so the transferred buffer is not reused underneath the consumer.
      const pcm = this.out.slice(0, this.outLen);
      this.port.postMessage({ type: 'audio', pcm }, [pcm.buffer]);
      this.outLen = 0;
    }
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;
    if (this.muted) return true;

    if (!this.needsResample) {
      for (let i = 0; i < channel.length; i++) {
        this.emitSample(channel[i]);
      }
      return true;
    }

    this.append(channel);

    // Linear interpolation between neighbouring input samples. Needs one
    // sample of lookahead, so stop at pending.length - 1 and keep the tail.
    let pos = this.readPos;
    while (pos + 1 < this.pending.length) {
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const sample =
        this.pending[idx] * (1 - frac) + this.pending[idx + 1] * frac;
      this.emitSample(sample);
      pos += this.ratio;
    }

    // Retain the unconsumed tail and rebase the fractional position onto it.
    const consumed = Math.floor(pos);
    if (consumed > 0) {
      this.pending = this.pending.slice(consumed);
      pos -= consumed;
    }
    this.readPos = pos;

    return true;
  }
}

registerProcessor('audio-capture-processor', CaptureProcessor);
