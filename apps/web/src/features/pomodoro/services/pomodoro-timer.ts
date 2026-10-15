import type { FocusSessionMode } from '@orbit/shared-types';

export interface TimerEngineState {
  mode: FocusSessionMode;
  targetDurationSeconds: number;
  startedAtTimestamp: number | null;
  pausedAtTimestamp: number | null;
  accumulatedPausedMs: number;
  isRunning: boolean;
}

/**
 * Calculates elapsed seconds for a running or paused timer state resiliently
 * against background tab throttling and sleeps.
 */
export function calculateElapsedSeconds(
  timerState: Pick<
    TimerEngineState,
    'startedAtTimestamp' | 'pausedAtTimestamp' | 'accumulatedPausedMs' | 'isRunning'
  >,
  currentTimestamp: number = Date.now()
): number {
  if (!timerState.startedAtTimestamp) {
    return 0;
  }

  if (timerState.pausedAtTimestamp !== null) {
    const activeMs = timerState.pausedAtTimestamp - timerState.startedAtTimestamp - timerState.accumulatedPausedMs;
    return Math.max(0, Math.floor(activeMs / 1000));
  }

  if (timerState.isRunning) {
    const activeMs = currentTimestamp - timerState.startedAtTimestamp - timerState.accumulatedPausedMs;
    return Math.max(0, Math.floor(activeMs / 1000));
  }

  return 0;
}

/**
 * Calculates remaining seconds in the session.
 */
export function calculateRemainingSeconds(
  timerState: Pick<
    TimerEngineState,
    'targetDurationSeconds' | 'startedAtTimestamp' | 'pausedAtTimestamp' | 'accumulatedPausedMs' | 'isRunning'
  >,
  currentTimestamp: number = Date.now()
): number {
  const elapsed = calculateElapsedSeconds(timerState, currentTimestamp);
  return Math.max(0, timerState.targetDurationSeconds - elapsed);
}

/**
 * Calculates progress fraction between 0.0 and 1.0.
 */
export function calculateProgressFraction(
  targetSeconds: number,
  remainingSeconds: number
): number {
  if (targetSeconds <= 0) return 0;
  const elapsed = targetSeconds - remainingSeconds;
  return Math.min(1, Math.max(0, elapsed / targetSeconds));
}

/**
 * Formats seconds into MM:SS display format.
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Pure Web Audio API chime bell. Plays a pleasant dual-tone chime
 * upon Pomodoro completion with zero external audio assets.
 */
interface AudioWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export function playPomodoroChime(): void {
  const win = (typeof window !== 'undefined' ? window : globalThis) as unknown as AudioWindow;
  if (!win) return;

  try {
    const AudioContextClass = win.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic frequencies: C5 (523.25 Hz) then G5 (783.99 Hz)
    const notes = [
      { freq: 523.25, timeOffset: 0.0, gain: 0.2 },
      { freq: 783.99, timeOffset: 0.15, gain: 0.25 }
    ];

    notes.forEach(({ freq, timeOffset, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + timeOffset);

      gainNode.gain.setValueAtTime(0.0001, now + timeOffset);
      gainNode.gain.linearRampToValueAtTime(gain, now + timeOffset + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 1.2);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 1.25);
    });
  } catch {
    // Graceful degradation when audio context is blocked or not allowed
  }
}
