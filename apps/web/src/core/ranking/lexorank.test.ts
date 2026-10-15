import { describe, expect, it } from 'vitest';
import {
  generateLexoRank,
  getLexoRankAfter,
  getLexoRankBefore,
  rebalanceRanks
} from './lexorank';
import { MemoryLocalStore } from '../storage/memory-local-store';
import { createTask, reorderTask } from '../../features/tasks/services/task-service';

describe('LexoRank Reordering Engine (P5-RNK-001)', () => {
  describe('generateLexoRank', () => {
    it('returns default initial rank when both prev and next are empty', () => {
      const rank = generateLexoRank(null, null);
      expect(rank).toBe('a0');
    });

    it('generates rank before next when prev is null', () => {
      const rank = generateLexoRank(null, 'a0');
      expect(rank < 'a0').toBe(true);

      const beforeThat = generateLexoRank(null, rank);
      expect(beforeThat < rank).toBe(true);
    });

    it('generates rank after prev when next is null', () => {
      const rank = generateLexoRank('a0', null);
      expect(rank > 'a0').toBe(true);

      const afterThat = generateLexoRank(rank, null);
      expect(afterThat > rank).toBe(true);
    });

    it('generates exact midpoint "a0V" between "a0" and "a1"', () => {
      const mid = generateLexoRank('a0', 'a1');
      expect(mid).toBe('a0V');
      expect(mid > 'a0').toBe(true);
      expect(mid < 'a1').toBe(true);
    });

    it('generates rank between "a0" and "a0V"', () => {
      const mid = generateLexoRank('a0', 'a0V');
      expect(mid > 'a0').toBe(true);
      expect(mid < 'a0V').toBe(true);
    });

    it('supports repeatedly inserting between items without collision', () => {
      let prev = 'a0';
      const next = 'a1';
      const items: string[] = [prev];

      for (let i = 0; i < 20; i++) {
        const mid = generateLexoRank(prev, next);
        expect(mid > prev).toBe(true);
        expect(mid < next).toBe(true);
        items.push(mid);
        prev = mid;
      }

      // Check strict ascending sort
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i]! < items[i + 1]!).toBe(true);
      }
    });

    it('handles fallback gracefully when prev >= next', () => {
      const fallback = generateLexoRank('b0', 'a0');
      expect(fallback > 'b0').toBe(true);
    });
  });

  describe('rebalanceRanks', () => {
    it('returns empty array for non-positive count', () => {
      expect(rebalanceRanks(0)).toEqual([]);
      expect(rebalanceRanks(-5)).toEqual([]);
    });

    it('generates requested number of sorted, unique ranks', () => {
      const count = 50;
      const ranks = rebalanceRanks(count);

      expect(ranks).toHaveLength(count);

      // Check unique
      const set = new Set(ranks);
      expect(set.size).toBe(count);

      // Check sorted order
      for (let i = 0; i < count - 1; i++) {
        expect(ranks[i]! < ranks[i + 1]!).toBe(true);
      }
    });
  });

  describe('reorderTask integration with AtomicTaskStore', () => {
    it('reorders task between two tasks with atomic LWW mutation registration', async () => {
      const store = new MemoryLocalStore();
      const deps = { store, userId: 'user-1' };

      const t1 = await createTask({ title: 'تسک ۱' }, deps);
      const t2 = await createTask({ title: 'تسک ۲' }, deps);
      const t3 = await createTask({ title: 'تسک ۳' }, deps);

      // Set positions manually on t1 and t3
      await store.saveTaskWithMutation(
        { ...t1, position: 'a0' },
        {
          id: 'm1',
          idempotencyKey: 'm1',
          entityType: 'TASK',
          entityId: t1.id,
          operation: 'UPDATE',
          baseVersion: 0,
          payloadType: 'PARTIAL',
          payload: { position: 'a0' },
          fieldTimestamps: { position: new Date().toISOString() },
          createdAt: new Date().toISOString(),
          status: 'PENDING',
          attemptCount: 0,
          nextAttemptAt: new Date().toISOString()
        }
      );

      await store.saveTaskWithMutation(
        { ...t3, position: 'a1' },
        {
          id: 'm3',
          idempotencyKey: 'm3',
          entityType: 'TASK',
          entityId: t3.id,
          operation: 'UPDATE',
          baseVersion: 0,
          payloadType: 'PARTIAL',
          payload: { position: 'a1' },
          fieldTimestamps: { position: new Date().toISOString() },
          createdAt: new Date().toISOString(),
          status: 'PENDING',
          attemptCount: 0,
          nextAttemptAt: new Date().toISOString()
        }
      );

      // Reorder t2 between t1 and t3
      const reordered = await reorderTask(store, t2.id, t1.id, t3.id, deps);

      expect(reordered.position).toBe('a0V');
      expect(reordered.position! > 'a0').toBe(true);
      expect(reordered.position! < 'a1').toBe(true);

      // Verify mutation in queue
      const queue = await store.listPendingMutations(100);
      const t2Mutation = queue.find((m) => m.entityId === t2.id && m.operation === 'UPDATE');
      expect(t2Mutation).toBeDefined();
      expect(t2Mutation?.fieldTimestamps?.position).toBeDefined();
    });
  });
});
