import { describe, expect, it, vi } from 'vitest';
import {
  calculateElapsedSeconds,
  calculateProgressFraction,
  calculateRemainingSeconds,
  formatTimerDisplay,
  playPomodoroChime
} from './pomodoro-timer';

describe('pomodoro-timer engine', () => {
  it('formats MM:SS correctly', () => {
    expect(formatTimerDisplay(1500)).toBe('25:00');
    expect(formatTimerDisplay(300)).toBe('05:00');
    expect(formatTimerDisplay(59)).toBe('00:59');
    expect(formatTimerDisplay(5)).toBe('00:05');
    expect(formatTimerDisplay(0)).toBe('00:00');
    expect(formatTimerDisplay(-10)).toBe('00:00');
  });

  it('calculates elapsed and remaining seconds correctly when running', () => {
    const startedAt = 100000;
    const now = 100000 + 45 * 1000; // 45 seconds later

    const state = {
      targetDurationSeconds: 1500,
      startedAtTimestamp: startedAt,
      pausedAtTimestamp: null,
      accumulatedPausedMs: 0,
      isRunning: true
    };

    expect(calculateElapsedSeconds(state, now)).toBe(45);
    expect(calculateRemainingSeconds(state, now)).toBe(1455);
  });

  it('takes accumulated paused time into account', () => {
    const startedAt = 100000;
    // 60 seconds passed since startedAt, but 20 seconds were paused previously
    const now = 100000 + 60 * 1000;
    const state = {
      targetDurationSeconds: 1500,
      startedAtTimestamp: startedAt,
      pausedAtTimestamp: null,
      accumulatedPausedMs: 20 * 1000,
      isRunning: true
    };

    expect(calculateElapsedSeconds(state, now)).toBe(40);
    expect(calculateRemainingSeconds(state, now)).toBe(1460);
  });

  it('calculates static elapsed time while paused', () => {
    const startedAt = 100000;
    const pausedAt = startedAt + 30 * 1000; // paused after 30s
    const state = {
      targetDurationSeconds: 1500,
      startedAtTimestamp: startedAt,
      pausedAtTimestamp: pausedAt,
      accumulatedPausedMs: 0,
      isRunning: false
    };

    // Even if current timestamp is 10 minutes later, elapsed stays 30s
    const future = startedAt + 600 * 1000;
    expect(calculateElapsedSeconds(state, future)).toBe(30);
    expect(calculateRemainingSeconds(state, future)).toBe(1470);
  });

  it('clamps progress fraction between 0.0 and 1.0', () => {
    expect(calculateProgressFraction(1500, 1500)).toBe(0);
    expect(calculateProgressFraction(1500, 750)).toBe(0.5);
    expect(calculateProgressFraction(1500, 0)).toBe(1);
    expect(calculateProgressFraction(1500, -50)).toBe(1);
    expect(calculateProgressFraction(0, 0)).toBe(0);
  });

  it('plays chime gracefully in browser environment', () => {
    const mockAudioContext = vi.fn().mockImplementation(function () {
      return {
        currentTime: 0,
      createOscillator: () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      }),
      createGain: () => ({
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn()
      }),
      destination: {}
    };
  });

    vi.stubGlobal('AudioContext', mockAudioContext);
    if (typeof window !== 'undefined') {
      (window as unknown as { AudioContext: unknown }).AudioContext = mockAudioContext;
    }

    expect(() => playPomodoroChime()).not.toThrow();
    expect(mockAudioContext).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
