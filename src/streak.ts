import type { ContributionDay } from "./github.js";

export type StreakRange = {
  length: number;
  start: string | null;
  end: string | null;
};

export type StreakStats = {
  current: StreakRange;
  longest: StreakRange;
  total: number;
  since: string | null;
};

function utcYmd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addUtcDays(isoDate: string, delta: number): string {
  const parts = isoDate.split("-");
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  date.setUTCDate(date.getUTCDate() + delta);
  return utcYmd(date);
}

function emptyRange(): StreakRange {
  return { length: 0, start: null, end: null };
}

function currentStreak(counts: ReadonlyMap<string, number>, today: string): StreakRange {
  let end = today;
  if ((counts.get(today) ?? 0) === 0) {
    end = addUtcDays(today, -1);
  }
  if ((counts.get(end) ?? 0) === 0) {
    return emptyRange();
  }

  let start = end;
  let length = 1;
  while ((counts.get(addUtcDays(start, -1)) ?? 0) > 0) {
    start = addUtcDays(start, -1);
    length += 1;
  }
  return { length, start, end };
}

function longestStreak(
  days: readonly ContributionDay[],
  counts: ReadonlyMap<string, number>,
): StreakRange {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) {
    return emptyRange();
  }

  let best = emptyRange();
  let runStart: string | null = null;
  let runLength = 0;

  for (let cursor = first.date; cursor <= last.date; cursor = addUtcDays(cursor, 1)) {
    if ((counts.get(cursor) ?? 0) > 0) {
      if (runStart === null) {
        runStart = cursor;
      }
      runLength += 1;
      if (runLength >= best.length) {
        best = { length: runLength, start: runStart, end: cursor };
      }
    } else {
      runStart = null;
      runLength = 0;
    }
  }

  return best;
}

export function computeStreak(days: readonly ContributionDay[], now = new Date()): StreakStats {
  const counts = new Map<string, number>();
  let total = 0;
  let since: string | null = null;
  for (const day of days) {
    counts.set(day.date, day.contributionCount);
    total += day.contributionCount;
    if (since === null && day.contributionCount > 0) {
      since = day.date;
    }
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return {
    current: currentStreak(counts, utcYmd(now)),
    longest: longestStreak(sorted, counts),
    total,
    since,
  };
}
