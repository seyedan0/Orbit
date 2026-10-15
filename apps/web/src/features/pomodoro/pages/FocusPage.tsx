import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  FocusSessionEntity,
  FocusSessionMode,
  PomodoroSettings,
  TaskEntity
} from '@orbit/shared-types';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import {
  calculateProgressFraction,
  calculateRemainingSeconds,
  formatTimerDisplay,
  playPomodoroChime
} from '../services/pomodoro-timer';
import {
  cancelFocusSession,
  completeFocusSession,
  getTodayFocusSummary,
  loadPomodoroSettings,
  pauseFocusSession,
  resumeFocusSession,
  savePomodoroSettings,
  startFocusSession,
  type TodayFocusSummary
} from '../services/pomodoro-service';
import styles from './FocusPage.module.css';

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function FocusPage() {
  const store = useStore();
  const { session: authSession } = useSession();
  const userId = authSession?.userId ?? 'default-user';

  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdParam = searchParams.get('taskId');

  const [settings, setSettings] = useState<PomodoroSettings>(() => loadPomodoroSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDistractionFree, setIsDistractionFree] = useState(false);

  // Task association
  const [currentTask, setCurrentTask] = useState<TaskEntity | null>(null);
  const [availableTasks, setAvailableTasks] = useState<TaskEntity[]>([]);
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);

  // Active Session & Timer Engine State
  const [activeSession, setActiveSession] = useState<FocusSessionEntity | null>(null);
  const [mode, setMode] = useState<FocusSessionMode>('WORK');
  const [cycleNumber, setCycleNumber] = useState<number>(1);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number>(() => settings.workDurationMinutes * 60);
  const [startedAtTimestamp, setStartedAtTimestamp] = useState<number | null>(null);
  const [pausedAtTimestamp, setPausedAtTimestamp] = useState<number | null>(null);
  const [accumulatedPausedMs, setAccumulatedPausedMs] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => settings.workDurationMinutes * 60);

  // Today Focus Summary
  const [summary, setSummary] = useState<TodayFocusSummary>({
    totalFocusMinutes: 0,
    completedPomodoros: 0,
    completedSessions: []
  });

  const remainingSecondsRef = useRef(remainingSeconds);
  remainingSecondsRef.current = remainingSeconds;

  // Load Task from taskIdParam
  useEffect(() => {
    let isMounted = true;
    async function loadTask() {
      if (taskIdParam) {
        const task = await store.getTask(taskIdParam);
        if (isMounted && task) {
          setCurrentTask(task);
        }
      }
      const tasks = await store.listTasks();
      if (isMounted) {
        setAvailableTasks(tasks.filter((t) => t.completedAt == null && t.deletedAt == null));
      }
    }
    void loadTask();
    return () => {
      isMounted = false;
    };
  }, [store, taskIdParam]);

  // Load today summary
  const refreshSummary = useCallback(async () => {
    try {
      const sum = await getTodayFocusSummary(store, userId);
      setSummary(sum);
    } catch {
      // In tests or offline, handle gracefully
    }
  }, [store, userId]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  // Get duration for mode based on settings
  const getDurationForMode = useCallback(
    (m: FocusSessionMode): number => {
      if (m === 'WORK') return settings.workDurationMinutes * 60;
      if (m === 'SHORT_BREAK') return settings.shortBreakMinutes * 60;
      return settings.longBreakMinutes * 60;
    },
    [settings]
  );

  // Switch Mode directly
  const switchMode = useCallback(
    async (newMode: FocusSessionMode) => {
      if (activeSession && isRunning) {
        await cancelFocusSession(store, activeSession.id, { userId });
      }
      setActiveSession(null);
      setIsRunning(false);
      setIsPaused(false);
      setMode(newMode);
      setStartedAtTimestamp(null);
      setPausedAtTimestamp(null);
      setAccumulatedPausedMs(0);
      const seconds = getDurationForMode(newMode);
      setTargetDurationSeconds(seconds);
      setRemainingSeconds(seconds);
    },
    [activeSession, getDurationForMode, isRunning, store, userId]
  );

  // Play / Start
  const handleStart = async () => {
    if (isPaused && activeSession) {
      // Resume from paused
      const now = Date.now();
      const pausedDuration = pausedAtTimestamp ? now - pausedAtTimestamp : 0;
      setAccumulatedPausedMs((prev) => prev + pausedDuration);
      setPausedAtTimestamp(null);
      setIsPaused(false);
      setIsRunning(true);
      await resumeFocusSession(store, activeSession.id, { userId });
      return;
    }

    // New start
    const now = Date.now();
    const durationMins = Math.round(targetDurationSeconds / 60);
    const session = await startFocusSession(
      store,
      {
        taskId: currentTask?.id,
        mode,
        targetDurationMinutes: durationMins,
        cycleNumber
      },
      { userId, settings }
    );

    setActiveSession(session);
    setStartedAtTimestamp(now);
    setPausedAtTimestamp(null);
    setAccumulatedPausedMs(0);
    setIsRunning(true);
    setIsPaused(false);
  };

  // Pause
  const handlePause = async () => {
    if (!isRunning || !activeSession) return;
    const now = Date.now();
    setPausedAtTimestamp(now);
    setIsRunning(false);
    setIsPaused(true);
    await pauseFocusSession(store, activeSession.id, { userId });
  };

  // Complete Session
  const handleComplete = useCallback(async () => {
    if (!activeSession) return;
    const actualSeconds = targetDurationSeconds - remainingSecondsRef.current;
    const result = await completeFocusSession(store, activeSession.id, { userId, settings }, actualSeconds);

    if (settings.soundEnabled) {
      playPomodoroChime();
    }

    setActiveSession(null);
    setIsRunning(false);
    setIsPaused(false);
    setStartedAtTimestamp(null);
    setPausedAtTimestamp(null);
    setAccumulatedPausedMs(0);

    setMode(result.nextMode);
    setCycleNumber(result.nextCycleNumber);
    const nextDuration = getDurationForMode(result.nextMode);
    setTargetDurationSeconds(nextDuration);
    setRemainingSeconds(nextDuration);

    void refreshSummary();

    // Check auto-start settings
    if (
      (result.nextMode !== 'WORK' && settings.autoStartBreaks) ||
      (result.nextMode === 'WORK' && settings.autoStartWork)
    ) {
      setTimeout(() => {
        void handleStart();
      }, 500);
    }
  }, [activeSession, getDurationForMode, refreshSummary, settings, store, targetDurationSeconds, userId]);

  // Cancel / Reset
  const handleReset = async () => {
    if (activeSession) {
      const actualSeconds = targetDurationSeconds - remainingSeconds;
      await cancelFocusSession(store, activeSession.id, { userId }, actualSeconds);
    }
    setActiveSession(null);
    setIsRunning(false);
    setIsPaused(false);
    setStartedAtTimestamp(null);
    setPausedAtTimestamp(null);
    setAccumulatedPausedMs(0);
    setRemainingSeconds(targetDurationSeconds);
  };

  // Skip
  const handleSkip = async () => {
    if (activeSession) {
      await cancelFocusSession(store, activeSession.id, { userId });
    }
    const nextMode: FocusSessionMode = mode === 'WORK' ? (cycleNumber >= settings.longBreakInterval ? 'LONG_BREAK' : 'SHORT_BREAK') : 'WORK';
    const nextCycle = mode === 'SHORT_BREAK' ? cycleNumber + 1 : mode === 'LONG_BREAK' ? 1 : cycleNumber;

    setActiveSession(null);
    setIsRunning(false);
    setIsPaused(false);
    setStartedAtTimestamp(null);
    setPausedAtTimestamp(null);
    setAccumulatedPausedMs(0);

    setMode(nextMode);
    setCycleNumber(nextCycle);
    const nextSeconds = getDurationForMode(nextMode);
    setTargetDurationSeconds(nextSeconds);
    setRemainingSeconds(nextSeconds);
  };

  // Resilient Timer Tick Effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds(
        {
          targetDurationSeconds,
          startedAtTimestamp,
          pausedAtTimestamp,
          accumulatedPausedMs,
          isRunning
        },
        Date.now()
      );

      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        void handleComplete();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [accumulatedPausedMs, handleComplete, isRunning, pausedAtTimestamp, startedAtTimestamp, targetDurationSeconds]);

  // Progress Fraction
  const progressFraction = calculateProgressFraction(targetDurationSeconds, remainingSeconds);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressFraction);

  // Mode-based styles
  const progressClass =
    mode === 'WORK'
      ? styles.progressWork
      : mode === 'SHORT_BREAK'
      ? styles.progressShortBreak
      : styles.progressLongBreak;

  const btnThemeClass =
    mode === 'WORK'
      ? styles.btnWork
      : mode === 'SHORT_BREAK'
      ? styles.btnShortBreak
      : styles.btnLongBreak;

  const modeTitle =
    mode === 'WORK' ? 'تمرکز' : mode === 'SHORT_BREAK' ? 'استراحت کوتاه' : 'استراحت طولانی';

  return (
    <div
      className={`${styles.focusContainer} ${isDistractionFree ? styles.distractionFree : ''}`}
      data-testid="focus-page"
    >
      {/* Top Header / Mode Switcher */}
      <header className={styles.topBar}>
        <div className={styles.modeBadgeContainer} role="tablist" aria-label="انتخاب وضعیت تمرکز">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'WORK'}
            className={`${styles.modeTab} ${mode === 'WORK' ? styles.modeTabActiveWork : ''}`}
            onClick={() => void switchMode('WORK')}
            data-testid="mode-tab-work"
          >
            تمرکز ({settings.workDurationMinutes}m)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'SHORT_BREAK'}
            className={`${styles.modeTab} ${mode === 'SHORT_BREAK' ? styles.modeTabActiveShortBreak : ''}`}
            onClick={() => void switchMode('SHORT_BREAK')}
            data-testid="mode-tab-short-break"
          >
            استراحت کوتاه ({settings.shortBreakMinutes}m)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'LONG_BREAK'}
            className={`${styles.modeTab} ${mode === 'LONG_BREAK' ? styles.modeTabActiveLongBreak : ''}`}
            onClick={() => void switchMode('LONG_BREAK')}
            data-testid="mode-tab-long-break"
          >
            استراحت طولانی ({settings.longBreakMinutes}m)
          </button>
        </div>

        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setIsDistractionFree((prev) => !prev)}
            title={isDistractionFree ? 'خروج از حالت تمام‌صفحه' : 'حالت بدون حواس‌پرتی'}
            aria-label={isDistractionFree ? 'خروج از حالت تمام‌صفحه' : 'حالت بدون حواس‌پرتی'}
            data-testid="toggle-distraction-free-btn"
          >
            {isDistractionFree ? '🗗' : '🗖'}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setIsSettingsOpen(true)}
            title="تنظیمات پومودورو"
            aria-label="تنظیمات پومودورو"
            data-testid="open-settings-btn"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Task Chip / Association */}
      <div className={styles.taskChipContainer}>
        {currentTask ? (
          <div className={styles.taskChip} data-testid="current-task-chip">
            <span>🎯</span>
            <span className={styles.taskTitle} title={currentTask.title}>
              {currentTask.title}
            </span>
            <button
              type="button"
              className={styles.clearTaskBtn}
              onClick={() => {
                setCurrentTask(null);
                setSearchParams({});
              }}
              title="جدا کردن تسک"
              aria-label="جدا کردن تسک"
              data-testid="clear-task-btn"
            >
              ✕
            </button>
          </div>
        ) : (
          <div>
            {!isTaskSelectorOpen ? (
              <button
                type="button"
                className={styles.selectTaskBtn}
                onClick={() => setIsTaskSelectorOpen(true)}
                data-testid="select-task-btn"
              >
                + اتصال به یک تسک
              </button>
            ) : (
              <select
                className={styles.settingInput}
                style={{ width: '260px' }}
                onChange={(e) => {
                  const t = availableTasks.find((task) => task.id === e.target.value);
                  if (t) {
                    setCurrentTask(t);
                    setSearchParams({ taskId: t.id });
                  }
                  setIsTaskSelectorOpen(false);
                }}
                defaultValue=""
                data-testid="task-dropdown"
              >
                <option value="" disabled>
                  انتخاب تسک برای تمرکز...
                </option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Circular SVG Countdown Progress Ring */}
      <div className={styles.timerWrapper} role="timer" aria-live="polite">
        <svg
          width="280"
          height="280"
          className={styles.progressSvg}
          data-testid="progress-svg-ring"
        >
          <circle
            cx="140"
            cy="140"
            r={RADIUS}
            className={styles.circleBackground}
          />
          <circle
            cx="140"
            cy="140"
            r={RADIUS}
            className={`${styles.circleProgress} ${progressClass}`}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            data-testid="progress-circle"
          />
        </svg>

        <div className={styles.timerContent}>
          <span className={styles.timeDisplay} data-testid="timer-display">
            {formatTimerDisplay(remainingSeconds)}
          </span>
          <span className={styles.modeLabel}>{modeTitle}</span>
          <span className={styles.statusIndicator} data-testid="status-indicator">
            {isRunning ? 'در حال اجرا' : isPaused ? 'متوقف‌شده' : 'آماده'}
          </span>
        </div>
      </div>

      {/* Cycle Indicator */}
      <div className={styles.cycleContainer} data-testid="cycle-indicator">
        <div className={styles.cycleDots}>
          {Array.from({ length: settings.longBreakInterval }, (_, i) => {
            const num = i + 1;
            const isFilled = num <= cycleNumber;
            return (
              <span key={num} title={`چرخه ${num}`}>
                {isFilled ? '🍅' : '⚪'}
              </span>
            );
          })}
        </div>
        <span className={styles.cycleText}>
          پومودورو {cycleNumber} از {settings.longBreakInterval}
        </span>
      </div>

      {/* Primary Action Controls */}
      <div className={styles.controlsContainer}>
        {isRunning ? (
          <button
            type="button"
            className={`${styles.mainActionBtn} ${btnThemeClass}`}
            onClick={() => void handlePause()}
            data-testid="pause-timer-btn"
          >
            ⏸️ توقف
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.mainActionBtn} ${btnThemeClass}`}
            onClick={() => void handleStart()}
            data-testid="start-timer-btn"
          >
            ▶️ {isPaused ? 'ادامه' : 'شروع'}
          </button>
        )}

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => void handleComplete()}
          disabled={!activeSession}
          title="اتمام موفق دوره جاری"
          data-testid="complete-early-btn"
        >
          ✅ اتمام دوره
        </button>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => void handleSkip()}
          title="عبور به مرحله بعدی"
          data-testid="skip-timer-btn"
        >
          ⏭️ عبور
        </button>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => void handleReset()}
          title="بازنشانی زمان"
          data-testid="reset-timer-btn"
        >
          🔄 بازنشانی
        </button>
      </div>

      {/* Today's Focus Summary Banner */}
      <div className={styles.summaryCard} data-testid="focus-summary-card">
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue} data-testid="summary-pomodoro-count">
            {summary.completedPomodoros}
          </span>
          <span className={styles.summaryLabel}>پومودورو تکمیل‌شده امروز</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue} data-testid="summary-focus-minutes">
            {summary.totalFocusMinutes}
          </span>
          <span className={styles.summaryLabel}>دقیقه تمرکز خالص امروز</span>
        </div>
      </div>

      {/* Quick Settings Drawer / Modal */}
      {isSettingsOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsSettingsOpen(false)}
          data-testid="settings-modal-backdrop"
        >
          <div
            className={styles.settingsCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className={styles.settingsHeader}>
              <h2 id="settings-title" className={styles.settingsTitle}>
                تنظیمات زمان‌بندی پومودورو
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsSettingsOpen(false)}
                aria-label="بستن تنظیمات"
                data-testid="close-settings-btn"
              >
                ✕
              </button>
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>مدت زمان کار (دقیقه):</span>
              <input
                type="number"
                min="1"
                max="120"
                value={settings.workDurationMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    workDurationMinutes: Math.max(1, Number(e.target.value))
                  }))
                }
                className={styles.settingInput}
                data-testid="setting-work-duration"
              />
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>استراحت کوتاه (دقیقه):</span>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.shortBreakMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    shortBreakMinutes: Math.max(1, Number(e.target.value))
                  }))
                }
                className={styles.settingInput}
                data-testid="setting-short-break"
              />
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>استراحت طولانی (دقیقه):</span>
              <input
                type="number"
                min="1"
                max="90"
                value={settings.longBreakMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    longBreakMinutes: Math.max(1, Number(e.target.value))
                  }))
                }
                className={styles.settingInput}
                data-testid="setting-long-break"
              />
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>تناوب استراحت طولانی (چرخه‌ها):</span>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.longBreakInterval}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    longBreakInterval: Math.max(1, Number(e.target.value))
                  }))
                }
                className={styles.settingInput}
                data-testid="setting-long-break-interval"
              />
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>صدای زنگ پایان (Web Audio):</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    soundEnabled: e.target.checked
                  }))
                }
                className={styles.settingCheckbox}
                data-testid="setting-sound-enabled"
              />
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>آغاز خودکار استراحت‌ها:</span>
              <input
                type="checkbox"
                checked={settings.autoStartBreaks}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoStartBreaks: e.target.checked
                  }))
                }
                className={styles.settingCheckbox}
                data-testid="setting-auto-start-breaks"
              />
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>آغاز خودکار دوره کار:</span>
              <input
                type="checkbox"
                checked={settings.autoStartWork}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoStartWork: e.target.checked
                  }))
                }
                className={styles.settingCheckbox}
                data-testid="setting-auto-start-work"
              />
            </div>

            <button
              type="button"
              className={styles.saveSettingsBtn}
              onClick={() => {
                savePomodoroSettings(settings);
                setIsSettingsOpen(false);
                if (!isRunning) {
                  const s = getDurationForMode(mode);
                  setTargetDurationSeconds(s);
                  setRemainingSeconds(s);
                }
              }}
              data-testid="save-settings-btn"
            >
              ذخیره تنظیمات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
