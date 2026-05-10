import type { EngineContext, EqualizerBand } from './types';

export function connectEqualizer(ctx: EngineContext): void {
  if (ctx.eqFilters.length === 0 || !ctx.audioContext) return;
  try {
    ctx.sourceNode?.disconnect();
    let source = ctx.sourceNodes.get(ctx.audio);
    if (!source) {
      source = ctx.audioContext.createMediaElementSource(ctx.audio);
      ctx.sourceNodes.set(ctx.audio, source);
    }
    ctx.sourceNode = source;
    let lastNode: AudioNode = ctx.sourceNode;
    for (const filter of ctx.eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(ctx.audioContext.destination);
  } catch {
    /* context issue */
  }
}

/** Connect audio directly to destination during crossfade (bypasses shared EQ). */
export function connectAudioToDestination(
  ctx: EngineContext,
  audioEl: HTMLAudioElement,
): void {
  if (!ctx.audioContext) return;
  try {
    audioEl.crossOrigin = 'anonymous';
    let source = ctx.sourceNodes.get(audioEl);
    if (!source) {
      source = ctx.audioContext.createMediaElementSource(audioEl);
      ctx.sourceNodes.set(audioEl, source);
    }
    source.connect(ctx.audioContext.destination);
  } catch {
    /* already connected or context issue */
  }
}

export function initEqualizer(ctx: EngineContext): void {
  if (ctx.audioContext) {
    if (ctx.audioContext.state === 'suspended') ctx.audioContext.resume();
    return;
  }

  const wasPlaying = !ctx.audio.paused;
  const savedTime = ctx.audio.currentTime;
  const hadSrc = !!ctx.audio.src && ctx.audio.src !== location.href;

  ctx.audio.crossOrigin = 'anonymous';
  ctx.audioContext = new AudioContext();
  ctx.audioContext.resume();
  ctx.sourceNode = ctx.audioContext.createMediaElementSource(ctx.audio);

  try {
    const saved = localStorage.getItem('nightwatch:eq-bands');
    if (saved) ctx.eqBands = JSON.parse(saved);
  } catch {
    /* use default */
  }

  ctx.eqFilters = ctx.eqBands.map((band, i) => {
    const filter = ctx.audioContext!.createBiquadFilter();
    filter.type =
      i === 0
        ? 'lowshelf'
        : i === ctx.eqBands.length - 1
          ? 'highshelf'
          : 'peaking';
    filter.frequency.value = band.frequency;
    filter.gain.value = band.gain;
    if (filter.type === 'peaking') filter.Q.value = 1.4;
    return filter;
  });

  let lastNode: AudioNode = ctx.sourceNode;
  for (const filter of ctx.eqFilters) {
    lastNode.connect(filter);
    lastNode = filter;
  }
  lastNode.connect(ctx.audioContext.destination);

  if (hadSrc) {
    ctx.audio.load();
    if (savedTime > 0) ctx.audio.currentTime = savedTime;
    if (wasPlaying) ctx.audio.play().catch(() => {});
  }
}

export function setEqBands(ctx: EngineContext, bands: EqualizerBand[]): void {
  ctx.eqBands = bands;
  for (let i = 0; i < bands.length && i < ctx.eqFilters.length; i++) {
    ctx.eqFilters[i].gain.value = bands[i].gain;
  }
  try {
    localStorage.setItem('nightwatch:eq-bands', JSON.stringify(bands));
  } catch {
    /* quota exceeded */
  }
}

export function getEqBands(ctx: EngineContext): EqualizerBand[] {
  return ctx.eqBands;
}

export function destroyEqualizer(ctx: EngineContext): void {
  ctx.sourceNode?.disconnect();
  for (const f of ctx.eqFilters) f.disconnect();
  ctx.eqFilters = [];
  ctx.sourceNode = null;
  ctx.audioContext?.close();
  ctx.audioContext = null;
}
