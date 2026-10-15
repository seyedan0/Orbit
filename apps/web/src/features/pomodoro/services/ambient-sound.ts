import type { AmbientSoundType } from '@orbit/shared-types';

interface AudioWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export type { AmbientSoundType };

/**
 * Generates an audio buffer filled with white noise (uniform random distribution).
 */
export function generateWhiteNoiseBuffer(ctx: AudioContext, durationSeconds = 5): AudioBuffer {
  const bufferSize = ctx.sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

/**
 * Generates an audio buffer filled with pink noise (Paul Kellet's multi-pole filter).
 * Provides a warm 1/f spectral density.
 */
export function generatePinkNoiseBuffer(ctx: AudioContext, durationSeconds = 5): AudioBuffer {
  const bufferSize = ctx.sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;

    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

/**
 * Generates an audio buffer filled with Brownian (red) noise.
 * Leaky integration produces a warm, deep bass rumble.
 */
export function generateBrownNoiseBuffer(ctx: AudioContext, durationSeconds = 5): AudioBuffer {
  const bufferSize = ctx.sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }

  return buffer;
}

/**
 * Generates an audio buffer simulating falling rain.
 * Combines filtered soft brown noise floor with randomized droplet impulses.
 */
export function generateRainBuffer(ctx: AudioContext, durationSeconds = 5): AudioBuffer {
  const bufferSize = ctx.sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.025 * white) / 1.025;
    let sample = lastOut * 2.8;

    // Random discrete droplet transients
    if (Math.random() < 0.0025) {
      sample += (Math.random() * 2 - 1) * 0.35;
    }

    data[i] = sample;
  }

  return buffer;
}

/**
 * Resilient, zero-external-dependency ambient sound synthesizer based on Web Audio API.
 */
export class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private currentType: AmbientSoundType = 'none';
  private volume: number = 0.5;
  private activePlaying: boolean = false;
  private stopTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(initialVolume = 0.5) {
    this.volume = Math.max(0, Math.min(1, initialVolume));
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;

    const win = (typeof window !== 'undefined' ? window : globalThis) as unknown as AudioWindow;
    if (!win) return null;

    const AudioContextClass = win.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.audioCtx = new AudioContextClass();
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Starts or transitions to the given ambient sound type.
   */
  play(type: 'white' | 'pink' | 'brown' | 'rain'): void {
    if (this.activePlaying && this.currentType === type) {
      return;
    }

    this.stopImmediate();

    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    let buffer: AudioBuffer;
    switch (type) {
      case 'white':
        buffer = generateWhiteNoiseBuffer(ctx);
        break;
      case 'pink':
        buffer = generatePinkNoiseBuffer(ctx);
        break;
      case 'brown':
        buffer = generateBrownNoiseBuffer(ctx);
        break;
      case 'rain':
        buffer = generateRainBuffer(ctx);
        break;
      default:
        return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    // Smooth ramp-in
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(this.volume, now + 0.35);

    if (type === 'rain') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      source.connect(filter);
      filter.connect(gain);
      this.filterNode = filter;
    } else {
      source.connect(gain);
    }

    gain.connect(ctx.destination);
    source.start(now);

    this.sourceNode = source;
    this.masterGain = gain;
    this.currentType = type;
    this.activePlaying = true;
  }

  /**
   * Smoothly fades out and stops the current ambient sound.
   */
  stop(): void {
    if (!this.activePlaying || !this.masterGain || !this.audioCtx) {
      this.stopImmediate();
      return;
    }

    const now = this.audioCtx.currentTime;
    try {
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
    } catch {
      // Ignore audio parameter errors during shutdown
    }

    this.activePlaying = false;
    this.currentType = 'none';

    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
    }

    this.stopTimeoutId = setTimeout(() => {
      this.stopImmediate();
    }, 320);
  }

  private stopImmediate(): void {
    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Node already stopped or disconnected
      }
      this.sourceNode = null;
    }

    if (this.filterNode) {
      try {
        this.filterNode.disconnect();
      } catch {
        // Filter already disconnected
      }
      this.filterNode = null;
    }

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Gain already disconnected
      }
      this.masterGain = null;
    }

    this.activePlaying = false;
  }

  /**
   * Adjusts master gain volume between 0.0 and 1.0.
   */
  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.volume = clamped;

    if (this.masterGain && this.audioCtx && this.activePlaying) {
      const now = this.audioCtx.currentTime;
      try {
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(clamped, now + 0.1);
      } catch {
        this.masterGain.gain.value = clamped;
      }
    }
  }

  getVolume(): number {
    return this.volume;
  }

  isPlaying(): boolean {
    return this.activePlaying;
  }

  getCurrentType(): AmbientSoundType {
    return this.currentType;
  }
}

// Global shared singleton for the application session
export const ambientSoundManager = new AmbientSoundEngine(0.5);
