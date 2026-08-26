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

const CREATED_AT_QUERY = `query ($login: String!) {
  user(login: $login) {
    createdAt
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

function userRecord(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.user)) {
    throw new Error("GitHub user not found");
  }
  return payload.data.user;
}

function flattenCalendar(payload: unknown, dayCount: number): Contributions {
  const collection = userRecord(payload).contributionsCollection;
  if (!isRecord(collection) || !isRecord(collection.contributionCalendar)) {
    throw new Error("GitHub contribution calendar missing");
  }

  const parsed = parseContributionDays(collection.contributionCalendar.weeks);
  parsed.sort((a, b) => a.date.localeCompare(b.date));
  const days = parsed.slice(-dayCount);
  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);
  return { days, total };
}

function flattenHistory(
  user: Record<string, unknown>,
  fromDate: string,
  toDate: string,
): Contributions {
  const byDate = new Map<string, number>();
  for (const [key, value] of Object.entries(user)) {
    if (!/^y\d+$/.test(key) || !isRecord(value) || !isRecord(value.contributionCalendar)) {
      continue;
    }
    for (const day of parseContributionDays(value.contributionCalendar.weeks)) {
      if (day.date < fromDate || day.date > toDate) {
        continue;
      }
      byDate.set(day.date, day.contributionCount);
    }
  }
  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, contributionCount]) => ({ date, contributionCount }));
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

async function githubGraphql(args: {
  token: string;
  query: string;
  variables: Record<string, unknown>;
}): Promise<unknown> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-activity-graph",
    },
    body: JSON.stringify({
      query: args.query,
      variables: args.variables,
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
  return payload;
}

function yearWindows(createdAt: Date, today: Date): { from: Date; to: Date }[] {
  const windows: { from: Date; to: Date }[] = [];
  const end = startOfUtcDay(today);
  let from = startOfUtcDay(createdAt);
  while (from <= end) {
    const next = new Date(from);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    next.setUTCDate(next.getUTCDate() - 1);
    const to = next > end ? end : next;
    windows.push({ from, to });
    from = new Date(to);
    from.setUTCDate(from.getUTCDate() + 1);
  }
  return windows;
}

function historyDocument(windowCount: number): string {
  const decls = ["$login: String!"];
  const fields: string[] = [];
  for (let i = 0; i < windowCount; i++) {
    decls.push(`$from${i}: DateTime!`, `$to${i}: DateTime!`);
    fields.push(`y${i}: contributionsCollection(from: $from${i}, to: $to${i}) {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }`);
  }
  return `query (${decls.join(", ")}) {
  user(login: $login) {
    ${fields.join("\n    ")}
  }
}`;
}

async function fetchCreatedAt(args: { username: string; token: string }): Promise<Date> {
  const payload = await githubGraphql({
    token: args.token,
    query: CREATED_AT_QUERY,
    variables: { login: args.username },
  });
  const createdAt = userRecord(payload).createdAt;
  if (typeof createdAt !== "string") {
    throw new Error("GitHub account createdAt missing");
  }
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("GitHub account createdAt invalid");
  }
  return parsed;
}

async function fetchContributions(args: {
  username: string;
  token: string;
  days: number;
}): Promise<Contributions> {
  const to = startOfUtcDay(new Date());
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (args.days - 1));

  const payload = await githubGraphql({
    token: args.token,
    query: QUERY,
    variables: {
      login: args.username,
      from: from.toISOString(),
      to: `${utcDateString(to)}T23:59:59Z`,
    },
  });
  return flattenCalendar(payload, args.days);
}

async function fetchHistoryBatched(args: {
  username: string;
  token: string;
  windows: { from: Date; to: Date }[];
}): Promise<Record<string, unknown>> {
  const variables: Record<string, unknown> = { login: args.username };
  for (let i = 0; i < args.windows.length; i++) {
    const window = args.windows[i];
    if (!window) {
      continue;
    }
    variables[`from${i}`] = window.from.toISOString();
    variables[`to${i}`] = `${utcDateString(window.to)}T23:59:59Z`;
  }
  const payload = await githubGraphql({
    token: args.token,
    query: historyDocument(args.windows.length),
    variables,
  });
  return userRecord(payload);
}

async function fetchHistorySequential(args: {
  username: string;
  token: string;
  windows: { from: Date; to: Date }[];
}): Promise<Record<string, unknown>> {
  const user: Record<string, unknown> = {};
  for (let i = 0; i < args.windows.length; i++) {
    const window = args.windows[i];
    if (!window) {
      continue;
    }
    const payload = await githubGraphql({
      token: args.token,
      query: QUERY,
      variables: {
        login: args.username,
        from: window.from.toISOString(),
        to: `${utcDateString(window.to)}T23:59:59Z`,
      },
    });
    user[`y${i}`] = userRecord(payload).contributionsCollection;
  }
  return user;
}

async function fetchContributionHistory(args: {
  username: string;
  token: string;
}): Promise<Contributions> {
  const createdAt = await fetchCreatedAt(args);
  const today = startOfUtcDay(new Date());
  const windows = yearWindows(createdAt, today);
  if (windows.length === 0) {
    return { days: [], total: 0 };
  }

  let user: Record<string, unknown>;
  try {
    user = await fetchHistoryBatched({ ...args, windows });
  } catch {
    user = await fetchHistorySequential({ ...args, windows });
  }
  return flattenHistory(user, utcDateString(createdAt), utcDateString(today));
}

function cacheKey(args: { username: string; days: number }): string {
  return `${args.username}:${args.days}`;
}

async function cachedContributions(
  key: string,
  load: () => Promise<Contributions>,
): Promise<Contributions> {
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.contributions;
  }

  try {
    const contributions = await load();
    cache.set(key, { contributions, fetchedAt: now });
    return contributions;
  } catch (error) {
    if (cached) {
      return cached.contributions;
    }
    throw error;
  }
}

export async function getContributions(args: {
  username: string;
  token: string;
  days: number;
}): Promise<Contributions> {
  return cachedContributions(cacheKey(args), () => fetchContributions(args));
}

export async function getContributionHistory(args: {
  username: string;
  token: string;
}): Promise<Contributions> {
  return cachedContributions(`${args.username}:history`, () => fetchContributionHistory(args));
}
