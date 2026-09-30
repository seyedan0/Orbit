import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode
} from 'react';
import {
  HttpSyncError,
  HttpSyncTransport,
  SyncRuntime,
  type SyncTransport
} from '@orbit/sync-engine';
import { useStore } from '../storage/store-context.js';
import { useOptionalSession } from '../auth/session-context.js';
import { readToken } from '../auth/local-session.js';

export type SyncState = 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE';

export interface SyncSnapshot {
  syncState: SyncState;
  lastSyncedAt: Date | null;
  lastError: string | null;
  isOnline: boolean;
}

export interface SyncContextValue extends SyncSnapshot {
  triggerSync: () => Promise<void>;
}

export class SyncCoordinator {
  private runtime: SyncRuntime;
  private state: SyncSnapshot;
  private listeners = new Set<() => void>();
  private onUnauthorized?: (() => void) | undefined;

  constructor(
    runtime: SyncRuntime,
    initialOnline?: boolean,
    onUnauthorized?: () => void
  ) {
    this.runtime = runtime;
    if (onUnauthorized) {
      this.onUnauthorized = onUnauthorized;
    }
    const online =
      initialOnline ??
      (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
        ? navigator.onLine
        : true);

    this.state = {
      syncState: online ? 'IDLE' : 'OFFLINE',
      lastSyncedAt: null,
      lastError: null,
      isOnline: online
    };
  }

  getSnapshot = (): SyncSnapshot => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setOnline = (online: boolean): void => {
    if (this.state.isOnline === online) return;
    this.state = {
      ...this.state,
      isOnline: online,
      syncState: !online
        ? 'OFFLINE'
        : this.state.syncState === 'OFFLINE'
          ? 'IDLE'
          : this.state.syncState
    };
    this.notify();
  };

  triggerSync = async (): Promise<void> => {
    if (!this.state.isOnline) {
      if (this.state.syncState !== 'OFFLINE') {
        this.state = { ...this.state, syncState: 'OFFLINE' };
        this.notify();
      }
      return;
    }

    this.state = {
      ...this.state,
      syncState: 'SYNCING',
      lastError: null
    };
    this.notify();

    try {
      await this.runtime.syncOnce();
      this.state = {
        ...this.state,
        syncState: 'IDLE',
        lastSyncedAt: new Date(),
        lastError: null
      };
      this.notify();
    } catch (err: unknown) {
      if (err instanceof HttpSyncError && err.status === 401) {
        this.onUnauthorized?.();
      }
      const message = err instanceof Error ? err.message : String(err);
      this.state = {
        ...this.state,
        syncState: 'ERROR',
        lastError: message
      };
      this.notify();
    }
  };

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const SyncContext = createContext<SyncContextValue | null>(null);

export interface SyncProviderProps {
  children: ReactNode;
  runtime?: SyncRuntime;
  transport?: SyncTransport;
  coordinator?: SyncCoordinator;
  baseUrl?: string;
}

export function SyncProvider({
  children,
  runtime: customRuntime,
  transport: customTransport,
  coordinator: customCoordinator,
  baseUrl = '/api/v1'
}: SyncProviderProps) {
  const store = useStore();
  const sessionContext = useOptionalSession();

  const coordinator = useMemo(() => {
    if (customCoordinator) return customCoordinator;

    const handleUnauthorized = () => {
      sessionContext?.signOut();
    };

    const transport =
      customTransport ??
      new HttpSyncTransport({
        baseUrl,
        getHeaders: () => {
          const token =
            sessionContext?.token ??
            (typeof window !== 'undefined' ? readToken(window.localStorage) : undefined);
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        onUnauthorized: handleUnauthorized
      });

    const runtime = customRuntime ?? new SyncRuntime(store, transport);
    return new SyncCoordinator(runtime, undefined, handleUnauthorized);
  }, [customCoordinator, customRuntime, customTransport, baseUrl, store, sessionContext]);

  const snapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => coordinator.setOnline(true);
    const handleOffline = () => coordinator.setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [coordinator]);

  const value = useMemo<SyncContextValue>(
    () => ({
      ...snapshot,
      triggerSync: coordinator.triggerSync
    }),
    [snapshot, coordinator]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncStatus(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncProvider');
  }
  return context;
}
