import { describe, expect, it } from 'vitest';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { createTask } from '../../tasks/services/task-service';
import {
  attachTagToTask,
  createTag,
  createTagGroup,
  DEFAULT_TAG_COLOR,
  deleteTag,
  deleteTagGroup,
  detachTagFromTask,
  listTagGroups,
  listTags,
  setTaskTags,
  TagNotFoundError,
  TagValidationError,
  updateTag,
  updateTagGroup
} from './tag-service';

function createTestEnv() {
  const store = new MemoryLocalStore();
  const userId = 'user-test-123';
  return { store, userId };
}

describe('Tag Service (P5-TAG-001)', () => {
  describe('Tag CRUD operations', () => {
    it('creates a tag with default color and records an atomic CREATE mutation', async () => {
      const { store, userId } = createTestEnv();
      const tag = await createTag({ name: 'کار' }, { store, userId });

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('کار');
      expect(tag.color).toBe(DEFAULT_TAG_COLOR);
      expect(tag.version).toBe(0);
      expect(tag.localStatus).toBe('CREATED');
      expect(tag.deletedAt).toBeNull();

      // Verify stored tag
      const stored = await store.getTag(tag.id);
      expect(stored).toEqual(tag);

      // Verify mutation in queue
      const pending = await store.listPendingMutations(10);
      expect(pending).toHaveLength(1);
      const firstMutation = pending[0]!;
      expect(firstMutation.entityType).toBe('TAG');
      expect(firstMutation.entityId).toBe(tag.id);
      expect(firstMutation.operation).toBe('CREATE');
      expect(firstMutation.payloadType).toBe('FULL');
      expect(firstMutation.fieldTimestamps.name).toBeDefined();
      expect(firstMutation.fieldTimestamps.color).toBeDefined();
    });

    it('creates a tag with custom color, icon and group', async () => {
      const { store, userId } = createTestEnv();
      const tag = await createTag(
        {
          name: 'فوری',
          color: '#ef4444',
          icon: '🔥',
          groupId: 'grp-urgent',
          order: 1
        },
        { store, userId }
      );

      expect(tag.name).toBe('فوری');
      expect(tag.color).toBe('#ef4444');
      expect(tag.icon).toBe('🔥');
      expect(tag.groupId).toBe('grp-urgent');
      expect(tag.order).toBe(1);
    });

    it('rejects blank tag name with TagValidationError', async () => {
      const { store, userId } = createTestEnv();
      await expect(createTag({ name: '   ' }, { store, userId })).rejects.toThrow(
        TagValidationError
      );
    });

    it('updates a tag name and color with partial LWW mutation', async () => {
      const { store, userId } = createTestEnv();
      const tag = await createTag({ name: 'شخصی', color: '#10b981' }, { store, userId });

      const updated = await updateTag(
        tag.id,
        { name: 'پروژه‌های شخصی', color: '#3b82f6' },
        { store, userId }
      );

      expect(updated.name).toBe('پروژه‌های شخصی');
      expect(updated.color).toBe('#3b82f6');
      expect(updated.version).toBe(1);
      expect(updated.localStatus).toBe('UPDATED');

      const pending = await store.listPendingMutations(10);
      expect(pending).toHaveLength(2);
      const updateMutation = pending.find((m) => m.operation === 'UPDATE');
      expect(updateMutation).toBeDefined();
      expect(updateMutation?.payloadType).toBe('PARTIAL');
      expect(updateMutation?.payload).toEqual({
        name: 'پروژه‌های شخصی',
        color: '#3b82f6'
      });
      expect(updateMutation?.fieldTimestamps.name).toBeDefined();
      expect(updateMutation?.fieldTimestamps.color).toBeDefined();
    });

    it('throws TagNotFoundError when updating non-existent tag', async () => {
      const { store, userId } = createTestEnv();
      await expect(
        updateTag('unknown-id', { name: 'تست' }, { store, userId })
      ).rejects.toThrow(TagNotFoundError);
    });

    it('soft deletes a tag with an atomic DELETE mutation', async () => {
      const { store, userId } = createTestEnv();
      const tag = await createTag({ name: 'موقت' }, { store, userId });

      const deleted = await deleteTag(tag.id, { store, userId });
      expect(deleted.deletedAt).not.toBeNull();
      expect(deleted.localStatus).toBe('DELETED');
      expect(deleted.version).toBe(1);

      // Should not be in default listTags
      const activeTags = await listTags({ store });
      expect(activeTags).toHaveLength(0);

      // But should be visible with includeDeleted
      const allTags = await listTags({ store }, { includeDeleted: true });
      expect(allTags).toHaveLength(1);
      expect(allTags[0]?.id).toBe(tag.id);

      // Verify DELETE mutation
      const pending = await store.listPendingMutations(10);
      const deleteMutation = pending.find((m) => m.operation === 'DELETE');
      expect(deleteMutation).toBeDefined();
      expect(deleteMutation?.operation).toBe('DELETE');
      expect(deleteMutation?.fieldTimestamps.deletedAt).toBeDefined();
    });
  });

  describe('Tag Groups operations', () => {
    it('creates, updates and lists tag groups', async () => {
      const { store, userId } = createTestEnv();
      const group = await createTagGroup(
        { name: 'حیطه کاری', color: '#6366f1' },
        { store, userId }
      );

      expect(group.id).toBeDefined();
      expect(group.name).toBe('حیطه کاری');
      expect(group.color).toBe('#6366f1');

      const groups = await listTagGroups({ store });
      expect(groups).toHaveLength(1);

      const updated = await updateTagGroup(
        group.id,
        { name: 'کسب‌وکار و شغل' },
        { store, userId }
      );
      expect(updated.name).toBe('کسب‌وکار و شغل');
      expect(updated.version).toBe(1);

      await deleteTagGroup(group.id, { store, userId });
      const remaining = await listTagGroups({ store });
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Task Tag Attachment and Detachment (LWW)', () => {
    it('attaches a tag to a task and emits atomic partial mutation with fieldTimestamps', async () => {
      const { store, userId } = createTestEnv();
      const task = await createTask({ title: 'نوشتن گزارش هفتگی' }, { store, userId });
      const tag = await createTag({ name: 'گزارش' }, { store, userId });

      const updatedTask = await attachTagToTask(task.id, tag.id, { store, userId });
      expect(updatedTask.tags).toEqual([tag.id]);
      expect(updatedTask.version).toBe(task.version + 1);
      expect(updatedTask.localStatus).toBe('UPDATED');

      // Verify stored task
      const storedTask = await store.getTask(task.id);
      expect(storedTask?.tags).toEqual([tag.id]);

      // Check mutation
      const pending = await store.listPendingMutations(10);
      const attachMutation = pending.find(
        (m) => m.entityId === task.id && m.operation === 'UPDATE'
      );
      expect(attachMutation).toBeDefined();
      expect(attachMutation?.payload).toEqual({ tags: [tag.id] });
      expect(attachMutation?.fieldTimestamps.tags).toBeDefined();
    });

    it('is idempotent when attaching an already attached tag', async () => {
      const { store, userId } = createTestEnv();
      const task = await createTask(
        { title: 'ارسال ایمیل', tags: ['tag-1'] },
        { store, userId }
      );

      const result = await attachTagToTask(task.id, 'tag-1', { store, userId });
      expect(result.tags).toEqual(['tag-1']);
      expect(result.version).toBe(task.version); // No change
    });

    it('detaches a tag from a task and emits atomic mutation', async () => {
      const { store, userId } = createTestEnv();
      const task = await createTask(
        { title: 'بررسی کدها', tags: ['code', 'review', 'priority'] },
        { store, userId }
      );

      const updated = await detachTagFromTask(task.id, 'review', { store, userId });
      expect(updated.tags).toEqual(['code', 'priority']);
      expect(updated.version).toBe(task.version + 1);

      const stored = await store.getTask(task.id);
      expect(stored?.tags).toEqual(['code', 'priority']);
    });

    it('is idempotent when detaching a non-existent tag from task', async () => {
      const { store, userId } = createTestEnv();
      const task = await createTask(
        { title: 'بررسی لاگ‌ها', tags: ['infra'] },
        { store, userId }
      );

      const result = await detachTagFromTask(task.id, 'security', { store, userId });
      expect(result.tags).toEqual(['infra']);
      expect(result.version).toBe(task.version);
    });

    it('sets task tags in bulk with automatic deduplication', async () => {
      const { store, userId } = createTestEnv();
      const task = await createTask({ title: 'جلسه بازخورد' }, { store, userId });

      const updated = await setTaskTags(
        task.id,
        ['tag-a', 'tag-b', 'tag-a'],
        { store, userId }
      );

      expect(updated.tags).toEqual(['tag-a', 'tag-b']);
      expect(updated.version).toBe(task.version + 1);
    });
  });
});
