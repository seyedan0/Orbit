import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MutationPayload } from '@orbit/shared-types';
import { FakeSyncTransport, HttpSyncError, SyncRuntime } from '@orbit/sync-engine';
import { MemoryLocalStore } from '../storage/memory-local-store.js';
import { StoreProvider } from '../storage/store-context.js';
import {
  SyncCoordinator,
  SyncProvider,
  useSyncStatus
} from './sync-context.js';

describe('SyncCoordinator', () => {
  it('starts with IDLE state when online', () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();
    const runtime = new SyncRuntime(store, transport);
    const coordinator = new SyncCoordinator(runtime, true);

    const snapshot = coordinator.getSnapshot();
    expect(snapshot.syncState).toBe('IDLE');
    expect(snapshot.isOnline).toBe(true);
    expect(snapshot.lastSyncedAt).toBeNull();
    expect(snapshot.lastError).toBeNull();
  });

  it('starts with OFFLINE state when offline', () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();
    const runtime = new SyncRuntime(store, transport);
    const coordinator = new SyncCoordinator(runtime, false);

    const snapshot = coordinator.getSnapshot();
    expect(snapshot.syncState).toBe('OFFLINE');
    expect(snapshot.isOnline).toBe(false);
  });

  it('transitions state and notifies listeners on setOnline', () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();
    const runtime = new SyncRuntime(store, transport);
    const coordinator = new SyncCoordinator(runtime, true);

    const listener = vi.fn();
    const unsubscribe = coordinator.subscribe(listener);

    coordinator.setOnline(false);
    expect(coordinator.getSnapshot().syncState).toBe('OFFLINE');
    expect(coordinator.getSnapshot().isOnline).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);

    coordinator.setOnline(true);
    expect(coordinator.getSnapshot().syncState).toBe('IDLE');
    expect(coordinator.getSnapshot().isOnline).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    coordinator.setOnline(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('triggerSync does not sync when offline', async () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();
    const runtime = new SyncRuntime(store, transport);
    const syncOnceSpy = vi.spyOn(runtime, 'syncOnce');
    const coordinator = new SyncCoordinator(runtime, false);

    await coordinator.triggerSync();
    expect(syncOnceSpy).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().syncState).toBe('OFFLINE');
  });

  it('triggerSync runs syncOnce and sets IDLE with lastSyncedAt on success', async () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();
    const runtime = new SyncRuntime(store, transport);
    const syncOnceSpy = vi.spyOn(runtime, 'syncOnce');
    const coordinator = new SyncCoordinator(runtime, true);

    const listener = vi.fn();
    coordinator.subscribe(listener);

    await coordinator.triggerSync();

    expect(syncOnceSpy).toHaveBeenCalledTimes(1);
    const snapshot = coordinator.getSnapshot();
    expect(snapshot.syncState).toBe('IDLE');
    expect(snapshot.lastSyncedAt).toBeInstanceOf(Date);
    expect(snapshot.lastError).toBeNull();
    // Notified once for SYNCING and once for IDLE
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('triggerSync sets ERROR state and lastError on failure', async () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();
    transport.simulateNetworkErrorOnPush = true;
    const runtime = new SyncRuntime(store, transport);
    const coordinator = new SyncCoordinator(runtime, true);

    // Seed a mutation so push actually runs and fails
    await store.enqueueMutation({
      id: 'm1',
      idempotencyKey: 'k1',
      entityType: 'TASK',
      entityId: 't1',
      operation: 'CREATE',
      baseVersion: 0,
      payloadType: 'FULL',
      payload: { id: 't1', title: 'T1' } as unknown as MutationPayload,
      fieldTimestamps: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: '2020-01-01T00:00:00.000Z'
    });

    await coordinator.triggerSync();

    const snapshot = coordinator.getSnapshot();
    expect(snapshot.syncState).toBe('ERROR');
    expect(snapshot.lastError).toContain('Simulated network error on push');
  });
});

describe('SyncProvider and useSyncStatus', () => {
  it('throws error when useSyncStatus is called outside of SyncProvider', () => {
    function Consumer() {
      useSyncStatus();
      return null;
    }

    expect(() => renderToStaticMarkup(<Consumer />)).toThrow(
      'useSyncStatus must be used within a SyncProvider'
    );
  });

  it('renders children with initial IDLE status via SyncProvider', () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();

    function TestChild() {
      const { syncState } = useSyncStatus();
      return <div data-testid="status">{syncState}</div>;
    }

    const html = renderToStaticMarkup(
      <StoreProvider store={store}>
        <SyncProvider transport={transport}>
          <TestChild />
        </SyncProvider>
      </StoreProvider>
    );

    expect(html).toContain('IDLE');
  });

  it('triggers onUnauthorized callback when syncOnce throws 401 HttpSyncError', async () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();
    const runtime = new SyncRuntime(store, transport);
    const onUnauthorized = vi.fn();

    const coordinator = new SyncCoordinator(runtime, true, onUnauthorized);
    vi.spyOn(runtime, 'syncOnce').mockRejectedValueOnce(
      new HttpSyncError('Unauthorized token', 401, false)
    );

    await coordinator.triggerSync();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(coordinator.getSnapshot().syncState).toBe('ERROR');
    expect(coordinator.getSnapshot().lastError).toBe('Unauthorized token');
  });
});
