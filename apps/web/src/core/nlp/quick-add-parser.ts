import type { TaskPriority } from '@orbit/shared-types';
import { parseNaturalDate } from '../calendar/natural-date';

export interface QuickAddParseOptions {
  defaultProjectId?: string;
  defaultTags?: string[];
  defaultPriority?: TaskPriority;
  defaultDueDate?: string | null;
  referenceDate?: Date;
  availableLists?: Array<{ id: string; name: string }>;
}

export interface QuickAddParseResult {
  title: string;
  rawInput: string;
  tags: string[];
  projectId: string;
  priority: TaskPriority;
  dueDate: string | null;
  isAllDay: boolean;
  matchedTokens: {
    tags: string[];
    listToken?: string | undefined;
    priorityToken?: string | undefined;
    dateToken?: string | undefined;
  };
}

const PRIORITY_MAP: Record<string, TaskPriority> = {
  high: 5,
  h: 5,
  '3': 5,
  medium: 3,
  med: 3,
  m: 3,
  '2': 3,
  low: 1,
  l: 1,
  '1': 1,
  none: 0,
  '0': 0
};

/**
 * Parses quick-add task string with smart NLP extraction for:
 * - Tags: #tag or #برنامه‌نویسی
 * - Priority: !high, !medium, !low, !none or !3, !2, !1, !0
 * - Target List/Project: ~"List Name", ~ListName, ^ListName
 * - Natural Dates: today, tomorrow, فارسی (امروز، فردا، ساعت ۱۰، ...)
 */
export function parseQuickAddInput(
  rawInput: string,
  options: QuickAddParseOptions = {}
): QuickAddParseResult {
  const {
    defaultProjectId = 'inbox',
    defaultTags = [],
    defaultPriority = 0,
    defaultDueDate = null,
    referenceDate = new Date(),
    availableLists = []
  } = options;

  if (!rawInput || !rawInput.trim()) {
    return {
      title: '',
      rawInput: rawInput ?? '',
      tags: [...defaultTags],
      projectId: defaultProjectId,
      priority: defaultPriority,
      dueDate: defaultDueDate,
      isAllDay: true,
      matchedTokens: { tags: [] }
    };
  }

  let text = rawInput;
  const matchedTags: string[] = [];
  let matchedListToken: string | undefined;
  let matchedPriorityToken: string | undefined;
  let resolvedPriority: TaskPriority = defaultPriority;
  let resolvedProjectId: string = defaultProjectId;

  // 1. Extract Priority (!high, !medium, !low, !none, !3, !2, !1, !0)
  const priorityRegex = /(?:^|\s)!([a-zA-Z0-9]+)(?=\s|$)/i;
  const priorityMatch = text.match(priorityRegex);
  if (priorityMatch && priorityMatch[1]) {
    const key = priorityMatch[1].toLowerCase();
    if (key in PRIORITY_MAP) {
      resolvedPriority = PRIORITY_MAP[key]!;
      matchedPriorityToken = `!${priorityMatch[1]}`;
      text = text.replace(priorityRegex, ' ');
    }
  }

  // 2. Extract List (~"My List", ~ListName, ^ListName)
  const listRegex = /(?:^|\s)[~^](?:"([^"]+)"|'([^']+)'|([a-zA-Z0-9_\-\u0600-\u06FF]+))(?=\s|$)/u;
  const listMatch = text.match(listRegex);
  if (listMatch) {
    const rawListName = listMatch[1] || listMatch[2] || listMatch[3] || '';
    if (rawListName.trim()) {
      matchedListToken = listMatch[0].trim();
      const trimmedName = rawListName.trim();
      
      // Attempt to resolve against available lists
      const matchedList = availableLists.find(
        (l) =>
          l.id.toLowerCase() === trimmedName.toLowerCase() ||
          l.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (matchedList) {
        resolvedProjectId = matchedList.id;
      } else {
        // Fallback to slugified ID
        resolvedProjectId = trimmedName.toLowerCase().replace(/\s+/g, '-');
      }

      text = text.replace(listRegex, ' ');
    }
  }

  // 3. Extract Tags (#tag, #تکلیف, #work_2026)
  // Supports Unicode letters and numbers across Persian/Arabic/English
  const tagRegex = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    if (tagMatch[1]) {
      const tagName = tagMatch[1].trim();
      if (tagName && !matchedTags.includes(tagName)) {
        matchedTags.push(tagName);
      }
    }
  }
  if (matchedTags.length > 0) {
    text = text.replace(tagRegex, ' ');
  }

  // Combine default tags with extracted tags without duplicates
  const finalTags = Array.from(new Set([...defaultTags, ...matchedTags]));

  // 4. Extract Natural Date & Time using Orbit's natural date engine
  const naturalDateResult = parseNaturalDate(text, referenceDate);
  let resolvedDueDate: string | null = defaultDueDate;
  let isAllDay = true;
  let dateToken: string | undefined;

  if (naturalDateResult.detectedDate) {
    resolvedDueDate = naturalDateResult.detectedDate.toISOString();
    isAllDay = naturalDateResult.isAllDay;
    dateToken = naturalDateResult.matchedText ?? undefined;
    text = naturalDateResult.cleanTitle;
  }

  // 5. Final Title Cleanup
  let cleanTitle = text.replace(/\s+/g, ' ').trim();
  if (!cleanTitle) {
    // If the input was only tokens (e.g. "#tag !high today"), fallback to first token or original
    cleanTitle = rawInput.trim();
  }

  return {
    title: cleanTitle,
    rawInput,
    tags: finalTags,
    projectId: resolvedProjectId,
    priority: resolvedPriority,
    dueDate: resolvedDueDate,
    isAllDay,
    matchedTokens: {
      tags: matchedTags,
      listToken: matchedListToken,
      priorityToken: matchedPriorityToken,
      dateToken
    }
  };
}
