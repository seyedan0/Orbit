import { beforeEach, describe, expect, it } from 'vitest';
import type { TaskEntity } from '@orbit/shared-types';
import {
  clearRecentSearches,
  getRecentSearches,
  groupTasks,
  RECENT_SEARCHES_STORAGE_KEY,
  saveRecentSearch,
  searchTasks,
  sortTasks
} from './search-utils';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 't-1',
    projectId: 'inbox',
    userId: 'u-1',
    title: 'تسک اولیه',
    content: 'توضیحات تکمیلی تسک',
    kind: 'TASK',
    priority: 1,
    isAllDay: false,
    timeZone: 'Asia/Tehran',
    reminders: [],
    tags: ['work', 'important'],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    dueDate: '2026-10-15T12:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    position: 'a0',
    ...overrides
  };
}

const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, val: string) => {
    mockStorage.set(key, String(val));
  },
  removeItem: (key: string) => {
    mockStorage.delete(key);
  },
  clear: () => {
    mockStorage.clear();
  }
};

describe('Search, Sorting & Grouping Utils (P5-SRC-001)', () => {
  beforeEach(() => {
    mockStorage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeLocalStorage,
      configurable: true,
      writable: true
    });
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: fakeLocalStorage,
        configurable: true,
        writable: true
      });
    }
  });

  describe('searchTasks', () => {
    const tasks = [
      makeTask({ id: '1', title: 'خرید کتاب هوش مصنوعی', content: 'از شهر کتاب', tags: ['study'] }),
      makeTask({ id: '2', title: 'جلسه بازبینی کد', content: 'بررسی PR فاز ۵', tags: ['dev', 'orbit'] }),
      makeTask({ id: '3', title: 'پرداخت قبض اینترنت', dueDate: '2026-10-20T10:00:00.000Z', tags: ['finance'] }),
      makeTask({ id: '4', title: 'تسک حذف شده', deletedAt: '2026-10-15T09:00:00.000Z' })
    ];

    it('returns all active tasks when query is empty', () => {
      const results = searchTasks(tasks, '');
      expect(results).toHaveLength(3);
      expect(results.some((t) => t.id === '4')).toBe(false);
    });

    it('matches by title substring (case-insensitive)', () => {
      const results = searchTasks(tasks, 'کتاب');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('1');
    });

    it('matches by content/desc substring', () => {
      const results = searchTasks(tasks, 'فاز ۵');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('2');
    });

    it('matches by tag substring', () => {
      const results = searchTasks(tasks, 'orbit');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('2');
    });

    it('matches by dueDate substring', () => {
      const results = searchTasks(tasks, '2026-10-20');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('3');
    });

    it('never returns soft-deleted tasks', () => {
      const results = searchTasks(tasks, 'تسک حذف شده');
      expect(results).toHaveLength(0);
    });
  });

  describe('sortTasks', () => {
    const tasks = [
      makeTask({ id: '1', title: 'ب تسک', priority: 1, dueDate: '2026-10-15', position: 'a2' }),
      makeTask({ id: '2', title: 'الف تسک', priority: 5, dueDate: '2026-10-12', position: 'a0' }),
      makeTask({ id: '3', title: 'پ تسک', priority: 0, dueDate: null, position: 'a1' })
    ];

    it('sorts by priority ascending and descending', () => {
      const asc = sortTasks(tasks, 'priority', 'asc');
      expect(asc.map((t) => t.priority)).toEqual([0, 1, 5]);

      const desc = sortTasks(tasks, 'priority', 'desc');
      expect(desc.map((t) => t.priority)).toEqual([5, 1, 0]);
    });

    it('sorts by dueDate with nulls placed at the end', () => {
      const asc = sortTasks(tasks, 'dueDate', 'asc');
      expect(asc[0]?.id).toBe('2'); // 2026-10-12
      expect(asc[1]?.id).toBe('1'); // 2026-10-15
      expect(asc[2]?.id).toBe('3'); // null
    });

    it('sorts by title alphabetically (Persian)', () => {
      const asc = sortTasks(tasks, 'title', 'asc');
      expect(asc[0]?.title).toBe('الف تسک');
      expect(asc[1]?.title).toBe('ب تسک');
      expect(asc[2]?.title).toBe('پ تسک');
    });

    it('sorts by LexoRank position string', () => {
      const asc = sortTasks(tasks, 'position', 'asc');
      expect(asc.map((t) => t.position)).toEqual(['a0', 'a1', 'a2']);
    });
  });

  describe('groupTasks', () => {
    const refNow = new Date('2026-10-15T10:00:00.000Z');
    const tasks = [
      makeTask({ id: '1', priority: 5, tags: ['work'], dueDate: '2026-10-14T00:00:00.000Z' }), // overdue
      makeTask({ id: '2', priority: 3, tags: ['work', 'home'], dueDate: '2026-10-15T15:00:00.000Z' }), // today
      makeTask({ id: '3', priority: 1, tags: [], dueDate: '2026-10-16T12:00:00.000Z' }), // tomorrow
      makeTask({ id: '4', priority: 0, tags: ['hobby'], dueDate: '2026-10-25T00:00:00.000Z' }), // upcoming
      makeTask({ id: '5', priority: 0, tags: [], dueDate: null }) // no date
    ];

    it('groups by priority', () => {
      const grouped = groupTasks(tasks, 'priority', refNow);
      expect(grouped['بسیار بالا (P5)']).toHaveLength(1);
      expect(grouped['بالا (P3)']).toHaveLength(1);
      expect(grouped['عادی (P1)']).toHaveLength(1);
      expect(grouped['بدون اولویت (P0)']).toHaveLength(2);
    });

    it('groups by dueDate (overdue, today, tomorrow, upcoming, no_date)', () => {
      const grouped = groupTasks(tasks, 'dueDate', refNow);
      expect(grouped['گذشته / معوق']).toHaveLength(1);
      expect(grouped['امروز']).toHaveLength(1);
      expect(grouped['فردا']).toHaveLength(1);
      expect(grouped['آینده']).toHaveLength(1);
      expect(grouped['بدون تاریخ سررسید']).toHaveLength(1);
    });

    it('groups by tag with fallback for untagged tasks', () => {
      const grouped = groupTasks(tasks, 'tag', refNow);
      expect(grouped['work']).toHaveLength(2);
      expect(grouped['home']).toHaveLength(1);
      expect(grouped['hobby']).toHaveLength(1);
      expect(grouped['بدون برچسب']).toHaveLength(2);
    });

    it('groups by projectId', () => {
      const grouped = groupTasks(tasks, 'projectId', refNow);
      expect(grouped['inbox']).toHaveLength(5);
    });

    it('returns all active tasks when groupBy is none', () => {
      const grouped = groupTasks(tasks, 'none', refNow);
      expect(grouped.all).toHaveLength(5);
    });
  });

  describe('Search History Management (localStorage)', () => {
    it('saves recent search query to localStorage without duplicates and capped at 10', () => {
      saveRecentSearch('تسک اول');
      saveRecentSearch('تسک دوم');
      saveRecentSearch('تسک اول'); // duplicate move to front

      const recent = getRecentSearches();
      expect(recent).toEqual(['تسک اول', 'تسک دوم']);

      for (let i = 3; i <= 15; i++) {
        saveRecentSearch(`جستجو ${i}`);
      }

      const capped = getRecentSearches();
      expect(capped).toHaveLength(10);
      expect(capped[0]).toBe('جستجو 15');
    });

    it('clears recent searches', () => {
      saveRecentSearch('تست');
      expect(getRecentSearches()).toHaveLength(1);

      clearRecentSearches();
      expect(getRecentSearches()).toHaveLength(0);
      expect(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).toBeNull();
    });
  });
});
