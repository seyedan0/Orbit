import { describe, expect, it } from 'vitest';
import type { FilterRule } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import {
  createSmartFilter,
  deleteSmartFilter,
  FilterNotFoundError,
  FilterValidationError,
  getSmartFilter,
  getSystemFilterById,
  isSystemFilterId,
  listAllSmartFilters,
  listUserSmartFilters,
  SYSTEM_FILTER_PRESETS,
  SYSTEM_HIGH_PRIORITY_FILTER_ID,
  SYSTEM_NO_DATE_FILTER_ID,
  SYSTEM_OVERDUE_FILTER_ID,
  SYSTEM_THIS_WEEK_FILTER_ID,
  SYSTEM_TODAY_FILTER_ID,
  SystemFilterModificationError,
  updateSmartFilter
} from './filter-service';

describe('filter-service (P5-SMT-001)', () => {
  const USER_ID = 'test-user-1';
  const FIXED_DATE = new Date('2026-10-15T10:00:00.000Z');

  const createDeps = (store = new MemoryLocalStore(() => FIXED_DATE)) => ({
    store,
    userId: USER_ID,
    newId: (() => {
      let counter = 100;
      return () => `id-${counter++}`;
    })(),
    now: () => FIXED_DATE
  });

  const sampleRule: FilterRule = {
    operator: 'AND',
    rules: [
      { field: 'priority', operator: 'gte', value: 3 },
      { field: 'isCompleted', operator: 'eq', value: false }
    ]
  };

  describe('System Filter Presets', () => {
    it('defines standard system presets with correct IDs and properties', () => {
      expect(SYSTEM_FILTER_PRESETS.length).toBe(5);
      const ids = SYSTEM_FILTER_PRESETS.map((p) => p.id);
      expect(ids).toContain(SYSTEM_OVERDUE_FILTER_ID);
      expect(ids).toContain(SYSTEM_HIGH_PRIORITY_FILTER_ID);
      expect(ids).toContain(SYSTEM_NO_DATE_FILTER_ID);
      expect(ids).toContain(SYSTEM_TODAY_FILTER_ID);
      expect(ids).toContain(SYSTEM_THIS_WEEK_FILTER_ID);

      for (const preset of SYSTEM_FILTER_PRESETS) {
        expect(preset.userId).toBe('system');
        expect(preset.rule).toBeDefined();
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.color).toBeDefined();
        expect(preset.deletedAt).toBeNull();
      }
    });

    it('identifies system filter IDs accurately with isSystemFilterId', () => {
      expect(isSystemFilterId(SYSTEM_OVERDUE_FILTER_ID)).toBe(true);
      expect(isSystemFilterId(SYSTEM_HIGH_PRIORITY_FILTER_ID)).toBe(true);
      expect(isSystemFilterId(SYSTEM_NO_DATE_FILTER_ID)).toBe(true);
      expect(isSystemFilterId('custom-filter-123')).toBe(false);
    });

    it('returns a clone of system preset with getSystemFilterById', () => {
      const preset = getSystemFilterById(SYSTEM_OVERDUE_FILTER_ID);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('سررسید گذشته');
      expect(preset?.id).toBe(SYSTEM_OVERDUE_FILTER_ID);

      // Verify clone isolation
      if (preset) {
        preset.name = 'Changed';
        expect(getSystemFilterById(SYSTEM_OVERDUE_FILTER_ID)?.name).toBe('سررسید گذشته');
      }
    });

    it('prevents updating system filter presets with SystemFilterModificationError', async () => {
      const deps = createDeps();
      await expect(
        updateSmartFilter(SYSTEM_OVERDUE_FILTER_ID, { name: 'نام جدید' }, deps)
      ).rejects.toThrow(SystemFilterModificationError);
    });

    it('prevents deleting system filter presets with SystemFilterModificationError', async () => {
      const deps = createDeps();
      await expect(
        deleteSmartFilter(SYSTEM_HIGH_PRIORITY_FILTER_ID, deps)
      ).rejects.toThrow(SystemFilterModificationError);
    });
  });

  describe('createSmartFilter', () => {
    it('creates a user smart filter with atomic CREATE mutation and LWW timestamps', async () => {
      const deps = createDeps();
      const filter = await createSmartFilter(
        {
          name: 'تسک‌های فوری سرور',
          rule: sampleRule,
          color: '#10b981',
          icon: 'server',
          order: 5
        },
        deps
      );

      expect(filter.id).toBe('id-100');
      expect(filter.userId).toBe(USER_ID);
      expect(filter.name).toBe('تسک‌های فوری سرور');
      expect(filter.color).toBe('#10b981');
      expect(filter.icon).toBe('server');
      expect(filter.order).toBe(5);
      expect(filter.version).toBe(0);
      expect(filter.localStatus).toBe('CREATED');
      expect(filter.createdAt).toBe(FIXED_DATE.toISOString());
      expect(filter.updatedAt).toBe(FIXED_DATE.toISOString());

      // Verify stored in atomic store
      const stored = await deps.store.getSmartFilter(filter.id);
      expect(stored).toEqual(filter);

      // Verify mutation in queue
      const pending = await deps.store.listPendingMutations(10);
      expect(pending).toHaveLength(1);
      const mutation = pending[0]!;
      expect(mutation.id).toBe('id-101');
      expect(mutation.entityType).toBe('SMART_FILTER');
      expect(mutation.entityId).toBe(filter.id);
      expect(mutation.operation).toBe('CREATE');
      expect(mutation.payloadType).toBe('FULL');
      expect(mutation.baseVersion).toBe(0);
      expect(mutation.fieldTimestamps.name).toBe(FIXED_DATE.toISOString());
      expect(mutation.fieldTimestamps.rule).toBe(FIXED_DATE.toISOString());
    });

    it('validates name cannot be empty', async () => {
      const deps = createDeps();
      await expect(
        createSmartFilter({ name: '   ', rule: sampleRule }, deps)
      ).rejects.toThrow(FilterValidationError);
    });

    it('validates rule is provided and valid object', async () => {
      const deps = createDeps();
      await expect(
        createSmartFilter({ name: 'بدون شرط', rule: null as unknown as FilterRule }, deps)
      ).rejects.toThrow(FilterValidationError);
    });
  });

  describe('updateSmartFilter', () => {
    it('updates user filter fields with atomic UPDATE mutation and incremented version', async () => {
      const deps = createDeps();
      const created = await createSmartFilter(
        { name: 'فیلتر تست', rule: sampleRule, color: '#f59e0b' },
        deps
      );

      const updatedRule: FilterRule = {
        operator: 'OR',
        rules: [{ field: 'kind', operator: 'eq', value: 'NOTE' }]
      };

      const updated = await updateSmartFilter(
        created.id,
        {
          name: 'فیلتر به‌روزرسانی شده',
          rule: updatedRule,
          color: '#3b82f6',
          order: 20
        },
        deps
      );

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('فیلتر به‌روزرسانی شده');
      expect(updated.color).toBe('#3b82f6');
      expect(updated.order).toBe(20);
      expect(updated.version).toBe(1);
      expect(updated.localStatus).toBe('UPDATED');

      // Verify pending mutation
      const pending = await deps.store.listPendingMutations(10);
      expect(pending).toHaveLength(2); // CREATE + UPDATE
      const updateMutation = pending[1]!;
      expect(updateMutation.operation).toBe('UPDATE');
      expect(updateMutation.payloadType).toBe('PARTIAL');
      expect(updateMutation.idempotencyKey).toBe(`${created.id}-1`);
      expect(updateMutation.fieldTimestamps.name).toBe(FIXED_DATE.toISOString());
      expect(updateMutation.fieldTimestamps.color).toBe(FIXED_DATE.toISOString());
      expect(updateMutation.fieldTimestamps.rule).toBe(FIXED_DATE.toISOString());
    });

    it('throws FilterNotFoundError for non-existent filter', async () => {
      const deps = createDeps();
      await expect(
        updateSmartFilter('non-existent', { name: 'نام جدید' }, deps)
      ).rejects.toThrow(FilterNotFoundError);
    });

    it('returns existing unchanged filter if no fields were modified', async () => {
      const deps = createDeps();
      const created = await createSmartFilter(
        { name: 'فیلتر تست', rule: sampleRule, color: '#6366f1' },
        deps
      );

      const res = await updateSmartFilter(created.id, { name: 'فیلتر تست' }, deps);
      expect(res.version).toBe(0); // Version not bumped
    });
  });

  describe('deleteSmartFilter', () => {
    it('soft deletes a user smart filter with atomic DELETE mutation', async () => {
      const deps = createDeps();
      const created = await createSmartFilter({ name: 'فیلتر حذفی', rule: sampleRule }, deps);

      const deleted = await deleteSmartFilter(created.id, deps);
      expect(deleted.deletedAt).toBe(FIXED_DATE.toISOString());
      expect(deleted.localStatus).toBe('DELETED');
      expect(deleted.version).toBe(1);

      // getSmartFilter should return undefined after deletion
      const fetched = await getSmartFilter(created.id, deps);
      expect(fetched).toBeUndefined();

      // Mutation queued
      const pending = await deps.store.listPendingMutations(10);
      const deleteMutation = pending.find((m) => m.operation === 'DELETE');
      expect(deleteMutation).toBeDefined();
      expect(deleteMutation?.entityId).toBe(created.id);
      expect(deleteMutation?.payload).toEqual({ deletedAt: FIXED_DATE.toISOString() });
    });

    it('throws FilterNotFoundError when attempting to delete non-existent or already deleted filter', async () => {
      const deps = createDeps();
      const created = await createSmartFilter({ name: 'فیلتر اول', rule: sampleRule }, deps);
      await deleteSmartFilter(created.id, deps);

      // Second deletion attempt throws
      await expect(deleteSmartFilter(created.id, deps)).rejects.toThrow(FilterNotFoundError);
    });
  });

  describe('getSmartFilter and list operations', () => {
    it('returns system filter by ID transparently', async () => {
      const deps = createDeps();
      const filter = await getSmartFilter(SYSTEM_OVERDUE_FILTER_ID, deps);
      expect(filter).toBeDefined();
      expect(filter?.id).toBe(SYSTEM_OVERDUE_FILTER_ID);
      expect(filter?.name).toBe('سررسید گذشته');
    });

    it('lists user smart filters excluding soft-deleted ones', async () => {
      const deps = createDeps();
      const f1 = await createSmartFilter({ name: 'الف', rule: sampleRule, order: 2 }, deps);
      const f2 = await createSmartFilter({ name: 'ب', rule: sampleRule, order: 1 }, deps);
      const f3 = await createSmartFilter({ name: 'ج', rule: sampleRule, order: 3 }, deps);

      await deleteSmartFilter(f2.id, deps);

      const userFilters = await listUserSmartFilters(deps);
      expect(userFilters.map((f) => f.id)).toEqual([f1.id, f3.id]);

      const allWithDeleted = await listUserSmartFilters(deps, { includeDeleted: true });
      expect(allWithDeleted.map((f) => f.id)).toContain(f2.id);
    });

    it('listAllSmartFilters includes system presets followed by sorted user filters', async () => {
      const deps = createDeps();
      await createSmartFilter({ name: 'تسک‌های پروژه', rule: sampleRule, order: 10 }, deps);

      const all = await listAllSmartFilters(deps);
      expect(all.length).toBe(6); // 5 system presets + 1 user filter
      expect(all[0]!.id).toBe(SYSTEM_OVERDUE_FILTER_ID);
      expect(all[5]!.name).toBe('تسک‌های پروژه');
    });
  });
});
