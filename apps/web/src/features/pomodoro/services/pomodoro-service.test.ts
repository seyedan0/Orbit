import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import {
  cancelFocusSession,
  completeFocusSession,
  getTodayFocusSummary,
  loadPomodoroSettings,
  pauseFocusSession,
  resumeFocusSession,
  savePomodoroSettings,
  startFocusSession
} from './pomodoro-service';

describe('pomodoro-service', () => {
  let store: MemoryLocalStore;
  const mockNow = new Date('2026-10-15T09:00:00.000Z');
  const userId = 'user-test-1';

  beforeEach(() => {
    store = new MemoryLocalStore(() => mockNow);
    localStorage.clear();
  });

  it('starts a work session with default settings and atomic mutation', async () => {
    const session = await startFocusSession(
      store,
      { taskId: 'task-10' },
      { userId, now: () => mockNow }
    );

    expect(session.id).toBeDefined();
    expect(session.userId).toBe(userId);
    expect(session.taskId).toBe('task-10');
    expect(session.mode).toBe('WORK');
    expect(session.targetDurationMinutes).toBe(25);
    expect(session.status).toBe('ACTIVE');
    expect(session.cycleNumber).toBe(1);

    const saved = await store.getFocusSession(session.id);
    expect(saved).toEqual(session);

    const pending = await store.listPendingMutations(10);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.entityType).toBe('FOCUS_SESSION');
    expect(pending[0]?.operation).toBe('CREATE');
  });

  it('starts short and long breaks with appropriate target durations', async () => {
    const shortBreak = await startFocusSession(
      store,
      { mode: 'SHORT_BREAK' },
      { userId, now: () => mockNow }
    );
    expect(shortBreak.mode).toBe('SHORT_BREAK');
    expect(shortBreak.targetDurationMinutes).toBe(5);

    const longBreak = await startFocusSession(
      store,
      { mode: 'LONG_BREAK' },
      { userId, now: () => mockNow }
    );
    expect(longBreak.mode).toBe('LONG_BREAK');
    expect(longBreak.targetDurationMinutes).toBe(15);
  });

  it('pauses and resumes an active session with LWW updates', async () => {
    const session = await startFocusSession(
      store,
      {},
      { userId, now: () => mockNow }
    );

    const pauseTime = new Date('2026-10-15T09:10:00.000Z');
    const paused = await pauseFocusSession(store, session.id, {
      userId,
      now: () => pauseTime
    });

    expect(paused.status).toBe('PAUSED');
    expect(paused.version).toBe(2);

    const resumeTime = new Date('2026-10-15T09:12:00.000Z');
    const resumed = await resumeFocusSession(store, session.id, {
      userId,
      now: () => resumeTime
    });

    expect(resumed.status).toBe('ACTIVE');
    expect(resumed.version).toBe(3);
  });

  it('completes session, advances cycle to short break on cycle 1-3 and long break on cycle 4', async () => {
    const session1 = await startFocusSession(
      store,
      { cycleNumber: 1, mode: 'WORK' },
      { userId, now: () => mockNow }
    );

    const completionTime = new Date('2026-10-15T09:25:00.000Z');
    const res1 = await completeFocusSession(
      store,
      session1.id,
      { userId, now: () => completionTime },
      1500
    );

    expect(res1.completedSession.status).toBe('COMPLETED');
    expect(res1.completedSession.actualDurationSeconds).toBe(1500);
    expect(res1.nextMode).toBe('SHORT_BREAK');
    expect(res1.nextCycleNumber).toBe(1);

    // After short break, advances to work cycle 2
    const breakSession = await startFocusSession(
      store,
      { cycleNumber: 1, mode: 'SHORT_BREAK' },
      { userId, now: () => completionTime }
    );
    const breakRes = await completeFocusSession(
      store,
      breakSession.id,
      { userId, now: () => completionTime }
    );
    expect(breakRes.nextMode).toBe('WORK');
    expect(breakRes.nextCycleNumber).toBe(2);

    // Work cycle 4 completion leads to LONG_BREAK
    const session4 = await startFocusSession(
      store,
      { cycleNumber: 4, mode: 'WORK' },
      { userId, now: () => completionTime }
    );
    const res4 = await completeFocusSession(
      store,
      session4.id,
      { userId, now: () => completionTime }
    );
    expect(res4.nextMode).toBe('LONG_BREAK');
    expect(res4.nextCycleNumber).toBe(4);

    // After LONG_BREAK, resets to cycle 1
    const longBreak = await startFocusSession(
      store,
      { cycleNumber: 4, mode: 'LONG_BREAK' },
      { userId, now: () => completionTime }
    );
    const longBreakRes = await completeFocusSession(
      store,
      longBreak.id,
      { userId, now: () => completionTime }
    );
    expect(longBreakRes.nextMode).toBe('WORK');
    expect(longBreakRes.nextCycleNumber).toBe(1);
  });

  it('cancels an active session', async () => {
    const session = await startFocusSession(
      store,
      {},
      { userId, now: () => mockNow }
    );

    const cancelTime = new Date('2026-10-15T09:05:00.000Z');
    const cancelled = await cancelFocusSession(
      store,
      session.id,
      { userId, now: () => cancelTime },
      300
    );

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.actualDurationSeconds).toBe(300);
    expect(cancelled.cancelledAt).toBe(cancelTime.toISOString());
  });

  it('computes today focus summary correctly', async () => {
    const s1 = await startFocusSession(store, {}, { userId, now: () => mockNow });
    await completeFocusSession(store, s1.id, { userId, now: () => mockNow }, 1500); // 25 mins

    const s2 = await startFocusSession(store, {}, { userId, now: () => mockNow });
    await completeFocusSession(store, s2.id, { userId, now: () => mockNow }, 1200); // 20 mins

    // Different user
    const otherUserSession = await startFocusSession(
      store,
      {},
      { userId: 'other-user', now: () => mockNow }
    );
    await completeFocusSession(
      store,
      otherUserSession.id,
      { userId: 'other-user', now: () => mockNow },
      1500
    );

    const summary = await getTodayFocusSummary(store, userId, mockNow);
    expect(summary.completedPomodoros).toBe(2);
    expect(summary.totalFocusMinutes).toBe(45); // (1500 + 1200) / 60
    expect(summary.completedSessions).toHaveLength(2);
  });

  it('saves and loads settings with localStorage fallback', () => {
    const custom = {
      workDurationMinutes: 30,
      shortBreakMinutes: 6,
      longBreakMinutes: 20,
      longBreakInterval: 3,
      autoStartBreaks: true,
      autoStartWork: true,
      soundEnabled: false
    };

    savePomodoroSettings(custom);
    const loaded = loadPomodoroSettings();
    expect(loaded).toEqual(custom);
  });
});
