/**
 * Fractional Indexing (LexoRank) Reordering Engine
 *
 * Implements pure string-based lexicographical rank generation without numeric
 * floating-point precision loss.
 */

export const LEXO_CHARSET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const MIN_CHAR = LEXO_CHARSET[0]!; // '0'
const MAX_CHAR = LEXO_CHARSET[LEXO_CHARSET.length - 1]!; // 'z'
const MID_CHAR = 'V'; // index 31, midpoint of 62 chars
const INITIAL_DEFAULT_RANK = 'a0';

function getCharIndex(c: string): number {
  const idx = LEXO_CHARSET.indexOf(c);
  return idx >= 0 ? idx : 0;
}

/**
 * Returns a rank lexicographically strictly smaller than `next`.
 */
export function getLexoRankBefore(next: string): string {
  if (!next) return INITIAL_DEFAULT_RANK;

  // Find first character that is not MIN_CHAR
  for (let i = 0; i < next.length; i++) {
    const char = next[i]!;
    const charIdx = getCharIndex(char);

    if (charIdx > 0) {
      const prefix = next.slice(0, i);
      const midIdx = Math.floor(charIdx / 2);

      if (midIdx > 0) {
        return prefix + LEXO_CHARSET[midIdx];
      }
      // If charIdx is 1 ('1'), midpoint with 0 is 0, so append MID_CHAR
      return prefix + MIN_CHAR + MID_CHAR;
    }
  }

  // If next is all MIN_CHARs (e.g., '0' or '00'), prepend or append smaller
  return MIN_CHAR + next + MID_CHAR;
}

/**
 * Returns a rank lexicographically strictly greater than `prev`.
 */
export function getLexoRankAfter(prev: string): string {
  if (!prev) return INITIAL_DEFAULT_RANK;

  const firstChar = prev[0]!;
  const firstIdx = getCharIndex(firstChar);

  // If first character can be stepped towards MAX_CHAR
  if (firstIdx < LEXO_CHARSET.length - 1) {
    const midIdx = Math.floor((firstIdx + LEXO_CHARSET.length) / 2);
    if (midIdx > firstIdx && midIdx < LEXO_CHARSET.length) {
      return LEXO_CHARSET[midIdx]!;
    }
  }

  // Otherwise append MID_CHAR
  return prev + MID_CHAR;
}

/**
 * Generates a string rank strictly between `prevRank` and `nextRank`.
 * If prevRank is null/undefined, generates a rank before nextRank.
 * If nextRank is null/undefined, generates a rank after prevRank.
 * If both are null/undefined, returns initial default rank.
 */
export function generateLexoRank(
  prevRank?: string | null,
  nextRank?: string | null
): string {
  const p = prevRank?.trim() || null;
  const n = nextRank?.trim() || null;

  if (p === null && n === null) {
    return INITIAL_DEFAULT_RANK;
  }

  if (p === null && n !== null) {
    return getLexoRankBefore(n);
  }

  if (p !== null && n === null) {
    return getLexoRankAfter(p);
  }

  // Both p and n are present
  const prev = p!;
  const next = n!;

  if (prev >= next) {
    // If input ordering is invalid or identical, resolve by appending MID_CHAR to prev
    return prev + MID_CHAR;
  }

  // Find common prefix
  let commonLen = 0;
  const minLen = Math.min(prev.length, next.length);
  while (commonLen < minLen && prev[commonLen] === next[commonLen]) {
    commonLen++;
  }

  const commonPrefix = prev.slice(0, commonLen);

  if (commonLen < prev.length && commonLen < next.length) {
    const prevChar = prev[commonLen]!;
    const nextChar = next[commonLen]!;
    const prevIdx = getCharIndex(prevChar);
    const nextIdx = getCharIndex(nextChar);

    if (nextIdx - prevIdx > 1) {
      const midIdx = Math.floor((prevIdx + nextIdx) / 2);
      return commonPrefix + LEXO_CHARSET[midIdx];
    }

    // Characters are consecutive (e.g. between '0' and '1')
    // We keep prevChar and generate a rank strictly after the remainder of prev
    const prevRest = prev.slice(commonLen + 1);
    if (prevRest.length === 0) {
      return commonPrefix + prevChar + MID_CHAR;
    }

    const nextCharAfter = getLexoRankAfter(prevRest);
    return commonPrefix + prevChar + nextCharAfter;
  }

  if (commonLen === prev.length) {
    // prev is a strict prefix of next (e.g. prev="a0", next="a0V")
    const nextRest = next.slice(commonLen);
    const midBefore = getLexoRankBefore(nextRest);
    return prev + midBefore;
  }

  // Fallback
  return prev + MID_CHAR;
}

/**
 * Rebalances ranks for a given count of items into uniformly-spaced ranks.
 */
export function rebalanceRanks(itemsCount: number): string[] {
  if (itemsCount <= 0) return [];

  const ranks: string[] = [];
  const STEP = 100;

  for (let i = 0; i < itemsCount; i++) {
    // Using base 36 alphanumeric padding to ensure uniform string length and ordering
    const val = (i + 1) * STEP;
    const rank = 'a' + val.toString(36).padStart(6, '0');
    ranks.push(rank);
  }

  return ranks;
}
