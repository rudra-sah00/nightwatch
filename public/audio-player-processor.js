/**
 * AudioWorklet Processor for Nova Sonic playback
 * Ported from official AWS sample: AudioPlayerProcessor.worklet.js
 *
 * Uses an expandable ring buffer with initial buffering (1 second)
 * to ensure smooth, gap-free audio playback.
 */

class ExpandableBuffer {
  constructor() {
    this.buffer = new Float32Array(24000); // 1 second at 24kHz
    this.readIndex = 0;
    this.writeIndex = 0;
    this.isInitialBuffering = true;
    this.initialBufferLength = 24000; // Buffer 1 second before playing
  }

  write(samples) {
    if (this.writeIndex + samples.length <= this.buffer.length) {
      // Enough space
    } else if (samples.length <= this.readIndex) {
      // Shift to beginning
      const sub = this.buffer.subarray(this.readIndex, this.writeIndex);
      this.buffer.set(sub);
      this.writeIndex -= this.readIndex;
      this.readIndex = 0;
    } else {
      // Grow buffer
      const newLen = (samples.length + this.writeIndex - this.readIndex) * 2;
      const newBuf = new Float32Array(newLen);
      newBuf.set(this.buffer.subarray(this.readIndex, this.writeIndex));
      this.buffer = newBuf;
      this.writeIndex -= this.readIndex;
      this.readIndex = 0;
    }
    this.buffer.set(samples, this.writeIndex);
    this.writeIndex += samples.length;
    if (this.writeIndex - this.readIndex >= this.initialBufferLength) {
      this.isInitialBuffering = false;
    }
  }

  read(destination) {
    let copyLen = 0;
    if (!this.isInitialBuffering) {
      copyLen = Math.min(destination.length, this.writeIndex - this.readIndex);
    }
    destination.set(
      this.buffer.subarray(this.readIndex, this.readIndex + copyLen),
    );
    this.readIndex += copyLen;
    if (copyLen < destination.length) {
      destination.fill(0, copyLen);
    }
    if (copyLen === 0) {
      this.isInitialBuffering = true;
    }
  }

  clear() {
    this.readIndex = 0;
    this.writeIndex = 0;
  }
}

class AudioPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.playbackBuffer = new ExpandableBuffer();
    this.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        this.playbackBuffer.write(event.data.audioData);
      } else if (event.data.type === 'barge-in') {
        this.playbackBuffer.clear();
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0][0];
    this.playbackBuffer.read(output);
    return true;
  }
}

registerProcessor('audio-player-processor', AudioPlayerProcessor);
