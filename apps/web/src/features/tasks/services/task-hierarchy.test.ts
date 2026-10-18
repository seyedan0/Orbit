import { describe, expect, it } from 'vitest';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import {
  createTask,
  createSubtask,
  listSubtasks,
  detectCircularParent,
  cascadeTaskStatus,
  duplicateTask,
  completeTask
} from './task-service';

describe('Task Hierarchy, Duplication & Recurrence Logic', () => {
  const userId = 'user-test-123';

  it('creates an independent subtask with parentTaskId', async () => {
    const store = new MemoryLocalStore();
    const parent = await createTask(
      { title: 'Parent Task', priority: 3 },
      { store, userId }
    );

    const child = await createSubtask(
      store,
      parent.id,
      { title: 'Child Subtask', priority: 1 },
      { store, userId }
    );

    expect(child.parentTaskId).toBe(parent.id);
    expect(child.projectId).toBe(parent.projectId);

    const subtasks = await listSubtasks(store, parent.id);
    expect(subtasks).toHaveLength(1);
    expect(subtasks[0]!.id).toBe(child.id);
  });

  it('detects circular parent hierarchies correctly', async () => {
    const store = new MemoryLocalStore();
    const taskA = await createTask({ title: 'Task A' }, { store, userId });
    const taskB = await createSubtask(store, taskA.id, { title: 'Task B' }, { store, userId });
    const taskC = await createSubtask(store, taskB.id, { title: 'Task C' }, { store, userId });

    // Directly linking A to A is circular
    expect(await detectCircularParent(store, taskA.id, taskA.id)).toBe(true);

    // Linking A to C would create A -> B -> C -> A (cycle!)
    expect(await detectCircularParent(store, taskA.id, taskC.id)).toBe(true);

    // Linking an unrelated Task D to C is safe
    const taskD = await createTask({ title: 'Task D' }, { store, userId });
    expect(await detectCircularParent(store, taskD.id, taskC.id)).toBe(false);
  });

  it('cascades completion status to all active subtasks recursively', async () => {
    const store = new MemoryLocalStore();
    const parent = await createTask({ title: 'Parent' }, { store, userId });
    const child1 = await createSubtask(store, parent.id, { title: 'Child 1' }, { store, userId });
    const child2 = await createSubtask(store, child1.id, { title: 'Grandchild' }, { store, userId });

    expect(child1.completedAt).toBeNull();
    expect(child2.completedAt).toBeNull();

    await cascadeTaskStatus(store, parent.id, 'COMPLETED', { store, userId });

    const updatedChild1 = await store.getTask(child1.id);
    const updatedChild2 = await store.getTask(child2.id);

    expect(updatedChild1?.completedAt).not.toBeNull();
    expect(updatedChild2?.completedAt).not.toBeNull();
  });

  it('duplicates task with all attributes and fresh checklist item IDs', async () => {
    const store = new MemoryLocalStore();
    const original = await createTask(
      {
        title: 'Original Task',
        priority: 5,
        tags: ['urgent', 'project'],
        items: [
          { id: 'item-1', title: 'Step 1', isCompleted: true, order: 0 },
          { id: 'item-2', title: 'Step 2', isCompleted: false, order: 1 }
        ]
      },
      { store, userId }
    );

    const duplicate = await duplicateTask(store, original.id, { store, userId });

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.title).toContain('Original Task');
    expect(duplicate.priority).toBe(5);
    expect(duplicate.tags).toEqual(['urgent', 'project']);
    expect(duplicate.items).toHaveLength(2);
    // Checklist items are duplicated and reset to active
    expect(duplicate.items[0]!.id).not.toBe('item-1');
    expect(duplicate.items[0]!.isCompleted).toBe(false);
  });

  it('resets inline checklist items when recurring task advances to next occurrence', async () => {
    const store = new MemoryLocalStore();
    const recurring = await createTask(
      {
        title: 'Daily Standup',
        dueDate: '2026-10-18T09:00:00.000Z',
        repeatFlag: 'FREQ=DAILY',
        items: [
          { id: 'item-1', title: 'Check emails', isCompleted: true, order: 0 }
        ]
      },
      { store, userId }
    );

    const advanced = await completeTask(recurring.id, { store, userId });

    expect(advanced.completedAt).toBeNull();
    expect(advanced.dueDate).toBe('2026-10-19T09:00:00.000Z');
    // Checklist items should be reset for next cycle
    expect(advanced.items[0]!.isCompleted).toBe(false);
  });
});
