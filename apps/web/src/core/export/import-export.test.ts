import { describe, expect, it } from 'vitest';
import type { TagEntity, TaskEntity } from '@orbit/shared-types';
import { exportTasksToJson, importTasksFromJson } from './import-export';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 't-1',
    projectId: 'inbox',
    userId: 'u-1',
    title: 'تسک برای اکسپورت',
    content: 'توضیحات تکمیلی',
    kind: 'TASK',
    priority: 3,
    isAllDay: true,
    timeZone: 'Asia/Tehran',
    reminders: [],
    tags: ['work'],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides
  };
}

describe('Import and Export Engine (P5-BLK-001)', () => {
  it('exports tasks and tags to valid JSON string', () => {
    const task = makeTask();
    const tag: TagEntity = {
      id: 'tag-1',
      userId: 'u-1',
      name: 'پروژه آلفا',
      color: '#6366f1',
      order: 0,
      version: 1,
      localStatus: 'SYNCED',
      createdAt: '2026-10-15T08:00:00.000Z',
      updatedAt: '2026-10-15T08:00:00.000Z'
    };

    const json = exportTasksToJson([task], [tag]);
    expect(json).toBeTypeOf('string');

    const parsed = JSON.parse(json);
    expect(parsed.orbitVersion).toBe('1.0.0');
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tags).toHaveLength(1);
    expect(parsed.tasks[0].title).toBe('تسک برای اکسپورت');
  });

  it('imports native Orbit backup correctly', () => {
    const backupJson = JSON.stringify({
      orbitVersion: '1.0.0',
      exportedAt: '2026-10-15T08:00:00.000Z',
      tasks: [
        { title: 'تسک اوربیت ۱', priority: 5, tags: ['urgent'] },
        { title: 'تسک اوربیت ۲', priority: 1, tags: [] }
      ]
    });

    const result = importTasksFromJson(backupJson);
    expect(result.format).toBe('ORBIT');
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0]?.title).toBe('تسک اوربیت ۱');
    expect(result.tasks[0]?.priority).toBe(5);
  });

  it('detects and converts Todoist backup format', () => {
    const todoistJson = JSON.stringify([
      {
        content: 'جلسه با تیم دیزاین',
        description: 'بررسی فیگما',
        priority: 4, // Todoist 4 -> Orbit 5
        due: { date: '2026-10-20' },
        labels: ['meeting', 'ui'],
        checked: false
      },
      {
        content: 'خرید قهوه',
        priority: 1, // Todoist 1 -> Orbit 0
        checked: true
      }
    ]);

    const result = importTasksFromJson(todoistJson);
    expect(result.format).toBe('TODOIST');
    expect(result.tasks).toHaveLength(2);

    expect(result.tasks[0]?.title).toBe('جلسه با تیم دیزاین');
    expect(result.tasks[0]?.priority).toBe(5);
    expect(result.tasks[0]?.tags).toEqual(['meeting', 'ui']);
    expect(result.tasks[0]?.completedAt).toBeNull();

    expect(result.tasks[1]?.title).toBe('خرید قهوه');
    expect(result.tasks[1]?.priority).toBe(0);
    expect(result.tasks[1]?.completedAt).toBeDefined();
  });

  it('detects and converts TickTick backup format', () => {
    const ticktickJson = JSON.stringify({
      tasks: [
        {
          title: 'ارسال گزارش هفتگی',
          desc: 'شامل تحلیل فاز ۵',
          priority: 3,
          dueDate: '2026-10-18T14:00:00.000Z',
          tags: ['report'],
          completedTime: null
        }
      ]
    });

    const result = importTasksFromJson(ticktickJson);
    expect(result.format).toBe('TICKTICK');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]?.title).toBe('ارسال گزارش هفتگی');
    expect(result.tasks[0]?.priority).toBe(3);
    expect(result.tasks[0]?.content).toBe('شامل تحلیل فاز ۵');
  });

  it('throws an error for invalid JSON or unrecognized format', () => {
    expect(() => importTasksFromJson('invalid-json')).toThrow();
    expect(() => importTasksFromJson(JSON.stringify({ unknownField: true }))).toThrow();
  });
});
