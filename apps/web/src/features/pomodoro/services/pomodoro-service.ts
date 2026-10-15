import type {
  FocusSessionEntity,
  FocusSessionMode,
  PomodoroSettings,
  SyncQueueEntry
} from '@orbit/shared-types';
import { DEFAULT_POMODORO_SETTINGS } from '@orbit/shared-types';
import type { AtomicFocusStore } from '@orbit/sync-engine';

export const POMODORO_SETTINGS_STORAGE_KEY = 'orbit_pomodoro_settings';

export interface PomodoroServiceDeps {
  userId: string;
  newId?: () => string;
  now?: () => Date;
  settings?: PomodoroSettings;
}

export interface StartSessionParams {
  taskId?: string | null | undefined;
  mode?: FocusSessionMode | undefined;
  targetDurationMinutes?: number | undefined;
  cycleNumber?: number | undefined;
  notes?: string | null | undefined;
}

export interface CompleteSessionResult {
  completedSession: FocusSessionEntity;
  nextMode: FocusSessionMode;
  nextCycleNumber: number;
}

export interface TodayFocusSummary {
  totalFocusMinutes: number;
  completedPomodoros: number;
  completedSessions: FocusSessionEntity[];
}

/**
 * Loads user Pomodoro settings from localStorage, falling back to default settings.
 */
export function loadPomodoroSettings(): PomodoroSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_POMODORO_SETTINGS };
  try {
    const raw = localStorage.getItem(POMODORO_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_POMODORO_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return {
      workDurationMinutes: parsed.workDurationMinutes ?? DEFAULT_POMODORO_SETTINGS.workDurationMinutes,
      shortBreakMinutes: parsed.shortBreakMinutes ?? DEFAULT_POMODORO_SETTINGS.shortBreakMinutes,
      longBreakMinutes: parsed.longBreakMinutes ?? DEFAULT_POMODORO_SETTINGS.longBreakMinutes,
      longBreakInterval: parsed.longBreakInterval ?? DEFAULT_POMODORO_SETTINGS.longBreakInterval,
      autoStartBreaks: parsed.autoStartBreaks ?? DEFAULT_POMODORO_SETTINGS.autoStartBreaks,
      autoStartWork: parsed.autoStartWork ?? DEFAULT_POMODORO_SETTINGS.autoStartWork,
      soundEnabled: parsed.soundEnabled ?? DEFAULT_POMODORO_SETTINGS.soundEnabled
    };
  } catch {
    return { ...DEFAULT_POMODORO_SETTINGS };
  }
}

/**
 * Saves user Pomodoro settings to localStorage.
 */
export function savePomodoroSettings(settings: PomodoroSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(POMODORO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or disabled localStorage exceptions
  }
}

/**
 * Starts a new focus or break session and registers an atomic creation mutation.
 */
export async function startFocusSession(
  store: AtomicFocusStore,
  params: StartSessionParams = {},
  deps: PomodoroServiceDeps
): Promise<FocusSessionEntity> {
  const getNow = deps.now ?? (() => new Date());
  const getNewId = deps.newId ?? (() => crypto.randomUUID());
  const now = getNow();
  const isoNow = now.toISOString();

  const settings = deps.settings ?? loadPomodoroSettings();
  const mode = params.mode ?? 'WORK';

  let defaultMinutes = settings.workDurationMinutes;
  if (mode === 'SHORT_BREAK') {
    defaultMinutes = settings.shortBreakMinutes;
  } else if (mode === 'LONG_BREAK') {
    defaultMinutes = settings.longBreakMinutes;
  }

  const targetDurationMinutes = params.targetDurationMinutes ?? defaultMinutes;
  const sessionId = getNewId();

  const session: FocusSessionEntity = {
    id: sessionId,
    userId: deps.userId,
    taskId: params.taskId ?? null,
    mode,
    status: 'ACTIVE',
    targetDurationMinutes,
    actualDurationSeconds: 0,
    startedAt: isoNow,
    completedAt: null,
    cancelledAt: null,
    cycleNumber: params.cycleNumber ?? 1,
    notes: params.notes ?? null,
    version: 1,
    localStatus: 'CREATED',
    createdAt: isoNow,
    updatedAt: isoNow
  };

  const mutation: SyncQueueEntry = {
    id: getNewId(),
    idempotencyKey: getNewId(),
    entityType: 'FOCUS_SESSION',
    entityId: sessionId,
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: session,
    fieldTimestamps: {
      id: isoNow,
      userId: isoNow,
      mode: isoNow,
      status: isoNow,
      startedAt: isoNow,
      targetDurationMinutes: isoNow,
      cycleNumber: isoNow
    },
    createdAt: isoNow,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: isoNow
  };

  await store.saveFocusSessionWithMutation(session, mutation);
  return session;
}

/**
 * Pauses an active focus session.
 */
export async function pauseFocusSession(
  store: AtomicFocusStore,
  sessionId: string,
  deps: PomodoroServiceDeps
): Promise<FocusSessionEntity> {
  const session = await store.getFocusSession(sessionId);
  if (!session) {
    throw new Error(`Focus session not found: ${sessionId}`);
  }

  if (session.status !== 'ACTIVE') {
    return session;
  }

  const getNow = deps.now ?? (() => new Date());
  const getNewId = deps.newId ?? (() => crypto.randomUUID());
  const isoNow = getNow().toISOString();

  const updatedSession: FocusSessionEntity = {
    ...session,
    status: 'PAUSED',
    version: session.version + 1,
    localStatus: 'UPDATED',
    updatedAt: isoNow
  };

  const mutation: SyncQueueEntry = {
    id: getNewId(),
    idempotencyKey: getNewId(),
    entityType: 'FOCUS_SESSION',
    entityId: sessionId,
    operation: 'UPDATE',
    baseVersion: session.version,
    payloadType: 'PARTIAL',
    payload: {
      status: 'PAUSED',
      updatedAt: isoNow
    },
    fieldTimestamps: {
      status: isoNow,
      updatedAt: isoNow
    },
    createdAt: isoNow,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: isoNow
  };

  await store.saveFocusSessionWithMutation(updatedSession, mutation);
  return updatedSession;
}

/**
 * Resumes a paused focus session.
 */
export async function resumeFocusSession(
  store: AtomicFocusStore,
  sessionId: string,
  deps: PomodoroServiceDeps
): Promise<FocusSessionEntity> {
  const session = await store.getFocusSession(sessionId);
  if (!session) {
    throw new Error(`Focus session not found: ${sessionId}`);
  }

  if (session.status !== 'PAUSED') {
    return session;
  }

  const getNow = deps.now ?? (() => new Date());
  const getNewId = deps.newId ?? (() => crypto.randomUUID());
  const isoNow = getNow().toISOString();

  const updatedSession: FocusSessionEntity = {
    ...session,
    status: 'ACTIVE',
    version: session.version + 1,
    localStatus: 'UPDATED',
    updatedAt: isoNow
  };

  const mutation: SyncQueueEntry = {
    id: getNewId(),
    idempotencyKey: getNewId(),
    entityType: 'FOCUS_SESSION',
    entityId: sessionId,
    operation: 'UPDATE',
    baseVersion: session.version,
    payloadType: 'PARTIAL',
    payload: {
      status: 'ACTIVE',
      updatedAt: isoNow
    },
    fieldTimestamps: {
      status: isoNow,
      updatedAt: isoNow
    },
    createdAt: isoNow,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: isoNow
  };

  await store.saveFocusSessionWithMutation(updatedSession, mutation);
  return updatedSession;
}

/**
 * Completes a focus session, calculates final duration, advances the cycle count,
 * determines the subsequent mode, and registers an atomic sync mutation.
 */
export async function completeFocusSession(
  store: AtomicFocusStore,
  sessionId: string,
  deps: PomodoroServiceDeps,
  actualDurationSeconds?: number
): Promise<CompleteSessionResult> {
  const session = await store.getFocusSession(sessionId);
  if (!session) {
    throw new Error(`Focus session not found: ${sessionId}`);
  }

  const getNow = deps.now ?? (() => new Date());
  const getNewId = deps.newId ?? (() => crypto.randomUUID());
  const isoNow = getNow().toISOString();

  const finalDuration =
    actualDurationSeconds !== undefined
      ? Math.max(0, actualDurationSeconds)
      : session.targetDurationMinutes * 60;

  const completedSession: FocusSessionEntity = {
    ...session,
    status: 'COMPLETED',
    actualDurationSeconds: finalDuration,
    completedAt: isoNow,
    version: session.version + 1,
    localStatus: 'UPDATED',
    updatedAt: isoNow
  };

  const mutation: SyncQueueEntry = {
    id: getNewId(),
    idempotencyKey: getNewId(),
    entityType: 'FOCUS_SESSION',
    entityId: sessionId,
    operation: 'UPDATE',
    baseVersion: session.version,
    payloadType: 'PARTIAL',
    payload: {
      status: 'COMPLETED',
      actualDurationSeconds: finalDuration,
      completedAt: isoNow,
      updatedAt: isoNow
    },
    fieldTimestamps: {
      status: isoNow,
      actualDurationSeconds: isoNow,
      completedAt: isoNow,
      updatedAt: isoNow
    },
    createdAt: isoNow,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: isoNow
  };

  await store.saveFocusSessionWithMutation(completedSession, mutation);

  const settings = deps.settings ?? loadPomodoroSettings();
  const longBreakInterval = settings.longBreakInterval || 4;

  let nextMode: FocusSessionMode = 'WORK';
  let nextCycleNumber = session.cycleNumber;

  if (session.mode === 'WORK') {
    if (session.cycleNumber >= longBreakInterval) {
      nextMode = 'LONG_BREAK';
      nextCycleNumber = session.cycleNumber;
    } else {
      nextMode = 'SHORT_BREAK';
      nextCycleNumber = session.cycleNumber;
    }
  } else if (session.mode === 'SHORT_BREAK') {
    nextMode = 'WORK';
    nextCycleNumber = session.cycleNumber + 1;
  } else if (session.mode === 'LONG_BREAK') {
    nextMode = 'WORK';
    nextCycleNumber = 1;
  }

  return {
    completedSession,
    nextMode,
    nextCycleNumber
  };
}

/**
 * Cancels a focus session and records cancellation details with an atomic mutation.
 */
export async function cancelFocusSession(
  store: AtomicFocusStore,
  sessionId: string,
  deps: PomodoroServiceDeps,
  actualDurationSeconds?: number
): Promise<FocusSessionEntity> {
  const session = await store.getFocusSession(sessionId);
  if (!session) {
    throw new Error(`Focus session not found: ${sessionId}`);
  }

  const getNow = deps.now ?? (() => new Date());
  const getNewId = deps.newId ?? (() => crypto.randomUUID());
  const isoNow = getNow().toISOString();

  const finalDuration =
    actualDurationSeconds !== undefined
      ? Math.max(0, actualDurationSeconds)
      : session.actualDurationSeconds;

  const cancelledSession: FocusSessionEntity = {
    ...session,
    status: 'CANCELLED',
    actualDurationSeconds: finalDuration,
    cancelledAt: isoNow,
    version: session.version + 1,
    localStatus: 'UPDATED',
    updatedAt: isoNow
  };

  const mutation: SyncQueueEntry = {
    id: getNewId(),
    idempotencyKey: getNewId(),
    entityType: 'FOCUS_SESSION',
    entityId: sessionId,
    operation: 'UPDATE',
    baseVersion: session.version,
    payloadType: 'PARTIAL',
    payload: {
      status: 'CANCELLED',
      actualDurationSeconds: finalDuration,
      cancelledAt: isoNow,
      updatedAt: isoNow
    },
    fieldTimestamps: {
      status: isoNow,
      actualDurationSeconds: isoNow,
      cancelledAt: isoNow,
      updatedAt: isoNow
    },
    createdAt: isoNow,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: isoNow
  };

  await store.saveFocusSessionWithMutation(cancelledSession, mutation);
  return cancelledSession;
}

/**
 * Returns focus summary for today (total work minutes, count of completed pomodoros, and session list).
 */
export async function getTodayFocusSummary(
  store: AtomicFocusStore,
  userId: string,
  now: Date = new Date()
): Promise<TodayFocusSummary> {
  const sessions = await store.listFocusSessions({ includeCancelled: false });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  const completedToday = sessions.filter((s) => {
    if (s.userId !== userId || s.status !== 'COMPLETED' || s.mode !== 'WORK') {
      return false;
    }
    const sessionTime = s.completedAt ? Date.parse(s.completedAt) : Date.parse(s.startedAt);
    return sessionTime >= startOfToday && sessionTime <= endOfToday;
  });

  const totalActualSeconds = completedToday.reduce((sum, s) => sum + (s.actualDurationSeconds || 0), 0);
  const totalFocusMinutes = Math.round(totalActualSeconds / 60);

  return {
    totalFocusMinutes,
    completedPomodoros: completedToday.length,
    completedSessions: completedToday
  };
}
