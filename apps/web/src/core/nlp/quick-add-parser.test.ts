import { describe, expect, it } from 'vitest';
import { parseQuickAddInput } from './quick-add-parser';

describe('quick-add-parser (Smart NLP Tokenizer)', () => {
  const refDate = new Date('2026-10-18T10:00:00.000Z');

  it('parses simple task title without tokens', () => {
    const result = parseQuickAddInput('Buy groceries', { referenceDate: refDate });
    expect(result.title).toBe('Buy groceries');
    expect(result.tags).toEqual([]);
    expect(result.priority).toBe(0);
    expect(result.projectId).toBe('inbox');
    expect(result.dueDate).toBeNull();
  });

  it('extracts Persian and English tags (#tag, #درس)', () => {
    const result = parseQuickAddInput('حل تمرین ریاضی #درس #مهم #urgent', {
      referenceDate: refDate
    });
    expect(result.title).toBe('حل تمرین ریاضی');
    expect(result.tags).toContain('درس');
    expect(result.tags).toContain('مهم');
    expect(result.tags).toContain('urgent');
  });

  it('extracts priority flags (!high, !medium, !low, !3, !1)', () => {
    const resHigh = parseQuickAddInput('Urgent bug fix !high', { referenceDate: refDate });
    expect(resHigh.title).toBe('Urgent bug fix');
    expect(resHigh.priority).toBe(5);

    const resMed = parseQuickAddInput('Update docs !medium', { referenceDate: refDate });
    expect(resMed.title).toBe('Update docs');
    expect(resMed.priority).toBe(3);

    const resLow = parseQuickAddInput('Clean desk !1', { referenceDate: refDate });
    expect(resLow.title).toBe('Clean desk');
    expect(resLow.priority).toBe(1);
  });

  it('extracts target list (~"My 2025 Goals", ~work, ^inbox)', () => {
    const availableLists = [
      { id: 'goals-2025', name: 'My 2025 Goals' },
      { id: 'work', name: 'Work' }
    ];

    const resQuoted = parseQuickAddInput('Learn Rust ~"My 2025 Goals"', {
      referenceDate: refDate,
      availableLists
    });
    expect(resQuoted.title).toBe('Learn Rust');
    expect(resQuoted.projectId).toBe('goals-2025');

    const resUnquoted = parseQuickAddInput('Prepare sprint ~work', {
      referenceDate: refDate,
      availableLists
    });
    expect(resUnquoted.title).toBe('Prepare sprint');
    expect(resUnquoted.projectId).toBe('work');

    const resFallback = parseQuickAddInput('New project ~Personal', {
      referenceDate: refDate,
      availableLists
    });
    expect(resFallback.title).toBe('New project');
    expect(resFallback.projectId).toBe('personal');
  });

  it('extracts natural dates in Persian and English', () => {
    const resTomorrow = parseQuickAddInput('Submit project tomorrow', {
      referenceDate: refDate
    });
    expect(resTomorrow.title).toBe('Submit project');
    expect(resTomorrow.dueDate).not.toBeNull();

    const resFarda = parseQuickAddInput('ارسال گزارش فردا', {
      referenceDate: refDate
    });
    expect(resFarda.title).toBe('ارسال گزارش');
    expect(resFarda.dueDate).not.toBeNull();
  });

  it('handles multi-token compound input cleanly', () => {
    const availableLists = [{ id: 'study', name: 'Study' }];
    const result = parseQuickAddInput(
      'تمرین درس هوش مصنوعی #دانشگاه !high ~Study فردا',
      { referenceDate: refDate, availableLists }
    );

    expect(result.title).toBe('تمرین درس هوش مصنوعی');
    expect(result.tags).toEqual(['دانشگاه']);
    expect(result.priority).toBe(5);
    expect(result.projectId).toBe('study');
    expect(result.dueDate).not.toBeNull();
  });

  it('preserves default values if no token overrides', () => {
    const result = parseQuickAddInput('Task with defaults', {
      defaultProjectId: 'my-list',
      defaultTags: ['default-tag'],
      defaultPriority: 3,
      defaultDueDate: '2026-10-20T00:00:00.000Z'
    });

    expect(result.title).toBe('Task with defaults');
    expect(result.projectId).toBe('my-list');
    expect(result.tags).toEqual(['default-tag']);
    expect(result.priority).toBe(3);
    expect(result.dueDate).toBe('2026-10-20T00:00:00.000Z');
  });
});
