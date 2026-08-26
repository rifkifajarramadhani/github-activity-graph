export type ContributionDay = {
  date: string;
  contributionCount: number;
};

export type Contributions = {
  days: ContributionDay[];
  total: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  contributions: Contributions;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();

const QUERY = `query ($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function utcDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseContributionDays(weeks: unknown): ContributionDay[] {
  if (!Array.isArray(weeks)) {
    return [];
  }

  const days: ContributionDay[] = [];
  for (const week of weeks) {
    if (!isRecord(week) || !Array.isArray(week.contributionDays)) {
      continue;
    }
    for (const day of week.contributionDays) {
      if (!isRecord(day)) {
        continue;
      }
      if (typeof day.date !== "string" || typeof day.contributionCount !== "number") {
        continue;
      }
      days.push({ date: day.date, contributionCount: day.contributionCount });
    }
  }
  return days;
}

function flattenCalendar(payload: unknown, dayCount: number): Contributions {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.user)) {
    throw new Error("GitHub user not found");
  }

  const collection = payload.data.user.contributionsCollection;
  if (!isRecord(collection) || !isRecord(collection.contributionCalendar)) {
    throw new Error("GitHub contribution calendar missing");
  }

  const parsed = parseContributionDays(collection.contributionCalendar.weeks);
  parsed.sort((a, b) => a.date.localeCompare(b.date));
  const days = parsed.slice(-dayCount);
  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);
  return { days, total };
}

function graphqlMessage(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.errors) || payload.errors.length === 0) {
    return undefined;
  }
  const first = payload.errors[0];
  if (isRecord(first) && typeof first.message === "string") {
    return first.message;
  }
  return "GitHub GraphQL error";
}

async function fetchContributions(args: {
  username: string;
  token: string;
  days: number;
}): Promise<Contributions> {
  const to = startOfUtcDay(new Date());
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (args.days - 1));

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-activity-graph",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        login: args.username,
        from: from.toISOString(),
        to: `${utcDateString(to)}T23:59:59Z`,
      },
    }),
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error(graphqlMessage(payload) ?? `GitHub API HTTP ${response.status}`);
  }
  const message = graphqlMessage(payload);
  if (message) {
    throw new Error(message);
  }
  return flattenCalendar(payload, args.days);
}

function cacheKey(args: { username: string; days: number }): string {
  return `${args.username}:${args.days}`;
}

export async function getContributions(args: {
  username: string;
  token: string;
  days: number;
}): Promise<Contributions> {
  const key = cacheKey(args);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.contributions;
  }

  try {
    const contributions = await fetchContributions(args);
    cache.set(key, { contributions, fetchedAt: now });
    return contributions;
  } catch (error) {
    if (cached) {
      return cached.contributions;
    }
    throw error;
  }
}
