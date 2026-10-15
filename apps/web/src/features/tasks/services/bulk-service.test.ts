import { describe, expect, it } from 'vitest';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { createTask } from './task-service';
import {
  bulkAddTag,
  bulkCompleteTasks,
  bulkDeleteTasks,
  bulkRestoreTasks,
  bulkUpdatePriority
} from './bulk-service';

describe('Bulk Task Operations (P5-BLK-001)', () => {
  it('bulk completes tasks with sync mutations', async () => {
    const store = new MemoryLocalStore();
    const deps = { store, userId: 'u1' };

    const t1 = await createTask({ title: 'تسک ۱' }, deps);
    const t2 = await createTask({ title: 'تسک ۲' }, deps);

    const completed = await bulkCompleteTasks(store, [t1.id, t2.id], deps);
    expect(completed).toHaveLength(2);
    expect(completed[0]?.completedAt).toBeDefined();
    expect(completed[1]?.completedAt).toBeDefined();

    const stored1 = await store.getTask(t1.id);
    expect(stored1?.completedAt).not.toBeNull();
  });

  it('bulk soft-deletes tasks and bulk restores them', async () => {
    const store = new MemoryLocalStore();
    const deps = { store, userId: 'u1' };

    const t1 = await createTask({ title: 'تسک ۱' }, deps);
    const t2 = await createTask({ title: 'تسک ۲' }, deps);

    // Delete both
    const deleted = await bulkDeleteTasks(store, [t1.id, t2.id], deps);
    expect(deleted).toHaveLength(2);
    expect(deleted[0]?.deletedAt).toBeDefined();

    // Verify excluded from normal list
    const active = await store.listTasks();
    expect(active).toHaveLength(0);

    // Restore both
    const restored = await bulkRestoreTasks(store, [t1.id, t2.id], deps);
    expect(restored).toHaveLength(2);
    expect(restored[0]?.deletedAt).toBeNull();

    const activeAfter = await store.listTasks();
    expect(activeAfter).toHaveLength(2);
  });

  it('bulk updates task priorities with atomic field mutations', async () => {
    const store = new MemoryLocalStore();
    const deps = { store, userId: 'u1' };

    const t1 = await createTask({ title: 'تسک ۱', priority: 0 }, deps);
    const t2 = await createTask({ title: 'تسک ۲', priority: 1 }, deps);

    const updated = await bulkUpdatePriority(store, [t1.id, t2.id], 5, deps);
    expect(updated).toHaveLength(2);
    expect(updated[0]?.priority).toBe(5);
    expect(updated[1]?.priority).toBe(5);

    const check1 = await store.getTask(t1.id);
    expect(check1?.priority).toBe(5);
  });

  it('bulk adds a tag without duplicates', async () => {
    const store = new MemoryLocalStore();
    const deps = { store, userId: 'u1' };

    const t1 = await createTask({ title: 'تسک ۱', tags: ['work'] }, deps);
    const t2 = await createTask({ title: 'تسک ۲', tags: ['home'] }, deps);

    await bulkAddTag(store, [t1.id, t2.id], 'urgent', deps);

    const check1 = await store.getTask(t1.id);
    const check2 = await store.getTask(t2.id);

    expect(check1?.tags).toEqual(['work', 'urgent']);
    expect(check2?.tags).toEqual(['home', 'urgent']);

    // Adding same tag again does not duplicate
    await bulkAddTag(store, [t1.id], 'urgent', deps);
    const check1Again = await store.getTask(t1.id);
    expect(check1Again?.tags).toEqual(['work', 'urgent']);
  });
});
