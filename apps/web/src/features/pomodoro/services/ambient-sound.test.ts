import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmbientSoundEngine,
  generateBrownNoiseBuffer,
  generatePinkNoiseBuffer,
  generateRainBuffer,
  generateWhiteNoiseBuffer
} from './ambient-sound';

describe('ambient-sound synthesizer', () => {
  let mockAudioContext: unknown;
  let mockGainNode: {
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let mockSourceNode: {
    buffer: unknown;
    loop: boolean;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let mockFilterNode: {
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGainNode = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockSourceNode = {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };

    mockFilterNode = {
      type: 'lowpass',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockAudioContext = vi.fn().mockImplementation(function () {
      return {
        sampleRate: 44100,
        currentTime: 10,
        state: 'running',
        resume: vi.fn().mockResolvedValue(undefined),
        createBuffer: (_channels: number, length: number, sampleRate: number) => ({
          length,
          sampleRate,
          getChannelData: () => new Float32Array(length)
        }),
        createBufferSource: () => mockSourceNode,
        createGain: () => mockGainNode,
        createBiquadFilter: () => mockFilterNode,
        destination: {}
      };
    });

    vi.stubGlobal('AudioContext', mockAudioContext);
    if (typeof window !== 'undefined') {
      (window as unknown as { AudioContext: unknown }).AudioContext = mockAudioContext;
    }
  });

  it('generates white noise buffer filled with random samples', () => {
    const ctx = new (mockAudioContext as new () => AudioContext)();
    const buffer = generateWhiteNoiseBuffer(ctx, 1);
    expect(buffer.length).toBe(44100);
    const data = buffer.getChannelData(0);
    expect(data.length).toBe(44100);
  });

  it('generates pink noise buffer using multi-pole filter', () => {
    const ctx = new (mockAudioContext as new () => AudioContext)();
    const buffer = generatePinkNoiseBuffer(ctx, 1);
    expect(buffer.length).toBe(44100);
  });

  it('generates brown noise buffer with leaky integration', () => {
    const ctx = new (mockAudioContext as new () => AudioContext)();
    const buffer = generateBrownNoiseBuffer(ctx, 1);
    expect(buffer.length).toBe(44100);
  });

  it('generates rain simulation buffer with droplets', () => {
    const ctx = new (mockAudioContext as new () => AudioContext)();
    const buffer = generateRainBuffer(ctx, 1);
    expect(buffer.length).toBe(44100);
  });

  it('plays white noise, ramps in volume and sets looping', () => {
    const engine = new AmbientSoundEngine(0.6);
    engine.play('white');

    expect(engine.isPlaying()).toBe(true);
    expect(engine.getCurrentType()).toBe('white');
    expect(mockSourceNode.loop).toBe(true);
    expect(mockSourceNode.start).toHaveBeenCalled();
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.6, expect.any(Number));
  });

  it('plays rain simulation with lowpass filter connected', () => {
    const engine = new AmbientSoundEngine(0.5);
    engine.play('rain');

    expect(engine.isPlaying()).toBe(true);
    expect(engine.getCurrentType()).toBe('rain');
    expect(mockFilterNode.type).toBe('lowpass');
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockFilterNode);
    expect(mockFilterNode.connect).toHaveBeenCalledWith(mockGainNode);
  });

  it('adjusts volume and clamps within [0, 1]', () => {
    const engine = new AmbientSoundEngine(0.5);
    engine.setVolume(0.8);
    expect(engine.getVolume()).toBe(0.8);

    engine.setVolume(1.5);
    expect(engine.getVolume()).toBe(1.0);

    engine.setVolume(-0.2);
    expect(engine.getVolume()).toBe(0.0);
  });

  it('stops playback cleanly and fades gain', () => {
    const engine = new AmbientSoundEngine(0.5);
    engine.play('brown');
    expect(engine.isPlaying()).toBe(true);

    engine.stop();
    expect(engine.isPlaying()).toBe(false);
    expect(engine.getCurrentType()).toBe('none');
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.0001, expect.any(Number));
  });
});
