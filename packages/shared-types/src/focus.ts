import type { LocalStatus } from './task.js';

export type FocusSessionMode = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';
export type FocusSessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface FocusSessionEntity {
  id: string;
  userId: string;
  taskId?: string | null | undefined;
  mode: FocusSessionMode;
  status: FocusSessionStatus;
  targetDurationMinutes: number;
  actualDurationSeconds: number;
  startedAt: string;
  completedAt?: string | null | undefined;
  cancelledAt?: string | null | undefined;
  cycleNumber: number;
  notes?: string | null | undefined;
  version: number;
  localStatus: LocalStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined;
}

export interface PomodoroSettings {
  workDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true
};
