export interface DayCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface GithubData {
  login: string;
  name: string | null;
  days: DayCount[]; // oldest → newest
  totalContributions: number;
  topLanguages: { name: string; pct: number }[];
  stars: number;
  followers: number;
  prs: number;
  issues: number;
  reviews: number;
  /** true when built from the unauthenticated REST fallback (recent events only) */
  partial: boolean;
}

export class UserNotFoundError extends Error {
  constructor(login: string) {
    super(`GitHub user not found: ${login}`);
    this.name = "UserNotFoundError";
  }
}

import { cachedFetch } from "./cache";
import { CACHE_SECONDS } from "./options";

const API = "https://api.github.com";
const UA = "github-pulse (https://github.com/pouyashahrdami/github-pulse)";
const REVALIDATE = CACHE_SECONDS;

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": UA,
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: headers(),
    next: { revalidate: REVALIDATE },
  });
  if (res.status === 404) {
    throw new UserNotFoundError(path);
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

interface GraphQLCalendarDay {
  date: string;
  contributionCount: number;
}

interface GraphQLResponse {
  data?: {
    user: {
      login: string;
      name: string | null;
      followers: { totalCount: number };
      contributionsCollection: {
        totalPullRequestContributions: number;
        totalIssueContributions: number;
        totalPullRequestReviewContributions: number;
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: GraphQLCalendarDay[] }[];
        };
      };
      repositories: {
        nodes: {
          primaryLanguage: { name: string } | null;
          stargazerCount: number;
        }[];
      };
    } | null;
  };
  errors?: { type?: string; message: string }[];
}

const GRAPHQL_QUERY = `
query ($login: String!) {
  user(login: $login) {
    login
    name
    followers { totalCount }
    contributionsCollection {
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        primaryLanguage { name }
        stargazerCount
      }
    }
  }
}`;

function languagesFrom(langs: (string | null | undefined)[]): { name: string; pct: number }[] {
  const tally = new Map<string, number>();
  for (const l of langs) {
    if (!l) continue;
    tally.set(l, (tally.get(l) ?? 0) + 1);
  }
  const total = [...tally.values()].reduce((a, b) => a + b, 0) || 1;
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, pct: Math.round((n / total) * 100) }));
}

async function fetchViaGraphQL(login: string): Promise<GithubData> {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { login } }),
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL ${res.status}`);
  }
  const json = (await res.json()) as GraphQLResponse;
  const user = json.data?.user;
  if (!user) {
    if (json.errors?.some((e) => e.type === "NOT_FOUND")) {
      throw new UserNotFoundError(login);
    }
    throw new Error(json.errors?.[0]?.message ?? "GraphQL returned no user");
  }

  const days = user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    login: user.login,
    name: user.name,
    days,
    totalContributions:
      user.contributionsCollection.contributionCalendar.totalContributions,
    topLanguages: languagesFrom(
      user.repositories.nodes.map((r) => r.primaryLanguage?.name),
    ),
    stars: user.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0),
    followers: user.followers.totalCount,
    prs: user.contributionsCollection.totalPullRequestContributions,
    issues: user.contributionsCollection.totalIssueContributions,
    reviews: user.contributionsCollection.totalPullRequestReviewContributions,
    partial: false,
  };
}

interface RestUser {
  login: string;
  name: string | null;
  followers: number;
}

interface RestRepo {
  language: string | null;
  stargazers_count: number;
  fork: boolean;
}

interface RestEvent {
  type: string;
  created_at: string;
  payload?: { commits?: unknown[] };
}

const FALLBACK_WINDOW_DAYS = 60;

async function fetchViaRest(login: string): Promise<GithubData> {
  const [user, repos, events] = await Promise.all([
    rest<RestUser>(`/users/${login}`),
    rest<RestRepo[]>(`/users/${login}/repos?per_page=100&sort=pushed`),
    rest<RestEvent[]>(`/users/${login}/events/public?per_page=100`),
  ]);

  // Build a daily-count window from recent public push events.
  const counts = new Map<string, number>();
  for (const ev of events) {
    if (ev.type !== "PushEvent") continue;
    const date = ev.created_at.slice(0, 10);
    const commits = ev.payload?.commits?.length ?? 1;
    counts.set(date, (counts.get(date) ?? 0) + commits);
  }

  const days: DayCount[] = [];
  const today = new Date();
  for (let i = FALLBACK_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    days.push({ date, count: counts.get(date) ?? 0 });
  }

  const own = repos.filter((r) => !r.fork);
  const countType = (type: string) =>
    events.filter((e) => e.type === type).length;
  return {
    login: user.login,
    name: user.name,
    days,
    totalContributions: days.reduce((a, d) => a + d.count, 0),
    topLanguages: languagesFrom(own.map((r) => r.language)),
    stars: own.reduce((a, r) => a + r.stargazers_count, 0),
    followers: user.followers,
    prs: countType("PullRequestEvent"),
    issues: countType("IssuesEvent"),
    reviews: countType("PullRequestReviewEvent"),
    partial: true,
  };
}

/** Not-found is a definitive answer, not an outage — never mask it with stale data. */
const staleUnlessNotFound = (err: unknown) => !(err instanceof UserNotFoundError);

export async function fetchGithubData(login: string): Promise<GithubData> {
  return cachedFetch(
    `gh:u:${login.toLowerCase()}`,
    CACHE_SECONDS,
    () =>
      process.env.GITHUB_TOKEN ? fetchViaGraphQL(login) : fetchViaRest(login),
    staleUnlessNotFound,
  );
}

// ---------------------------------------------------------------------------
// Repo cards: /r/<owner>/<repo> — same GithubData shape, fed by commit history
// on the default branch instead of a user's contribution calendar.

const REPO_WINDOW_DAYS = 35;

const REPO_GRAPHQL_QUERY = `
query ($owner: String!, $name: String!, $since: GitTimestamp!, $sinceYear: GitTimestamp!) {
  repository(owner: $owner, name: $name) {
    name
    stargazerCount
    primaryLanguage { name }
    issues(states: OPEN) { totalCount }
    pullRequests(states: OPEN) { totalCount }
    defaultBranchRef {
      target {
        ... on Commit {
          year: history(since: $sinceYear) { totalCount }
          recent: history(first: 100, since: $since) {
            totalCount
            nodes { committedDate }
          }
        }
      }
    }
  }
}`;

interface RepoGraphQLResponse {
  data?: {
    repository: {
      name: string;
      stargazerCount: number;
      primaryLanguage: { name: string } | null;
      issues: { totalCount: number };
      pullRequests: { totalCount: number };
      defaultBranchRef: {
        target: {
          year: { totalCount: number };
          recent: { totalCount: number; nodes: { committedDate: string }[] };
        };
      } | null;
    } | null;
  };
  errors?: { type?: string; message: string }[];
}

/** oldest → newest window of the last REPO_WINDOW_DAYS, filled from commit dates. */
function daysFromCommitDates(dates: string[]): DayCount[] {
  const counts = new Map<string, number>();
  for (const iso of dates) {
    const date = iso.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  const days: DayCount[] = [];
  const today = new Date();
  for (let i = REPO_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    days.push({ date, count: counts.get(date) ?? 0 });
  }
  return days;
}

async function fetchRepoViaGraphQL(
  owner: string,
  repo: string,
): Promise<GithubData> {
  const now = Date.now();
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      query: REPO_GRAPHQL_QUERY,
      variables: {
        owner,
        name: repo,
        since: new Date(now - REPO_WINDOW_DAYS * 86_400_000).toISOString(),
        sinceYear: new Date(now - 365 * 86_400_000).toISOString(),
      },
    }),
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL ${res.status}`);
  }
  const json = (await res.json()) as RepoGraphQLResponse;
  const r = json.data?.repository;
  if (!r) {
    if (json.errors?.some((e) => e.type === "NOT_FOUND")) {
      throw new UserNotFoundError(`${owner}/${repo}`);
    }
    throw new Error(json.errors?.[0]?.message ?? "GraphQL returned no repository");
  }
  const history = r.defaultBranchRef?.target;
  return {
    login: `${owner}/${r.name}`,
    name: r.name,
    days: daysFromCommitDates(
      history?.recent.nodes.map((n) => n.committedDate) ?? [],
    ),
    totalContributions: history?.year.totalCount ?? 0,
    topLanguages: r.primaryLanguage ? [{ name: r.primaryLanguage.name, pct: 100 }] : [],
    stars: r.stargazerCount,
    followers: 0,
    prs: r.pullRequests.totalCount,
    issues: r.issues.totalCount,
    reviews: 0,
    // the wave truncates when the window had more commits than one page
    partial: (history?.recent.totalCount ?? 0) > 100,
  };
}

interface RestRepoMeta {
  name: string;
  stargazers_count: number;
  language: string | null;
  open_issues_count: number;
}

interface RestCommit {
  commit: { committer: { date: string } | null; author: { date: string } | null };
}

async function fetchRepoViaRest(
  owner: string,
  repo: string,
): Promise<GithubData> {
  const since = new Date(
    Date.now() - REPO_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const [meta, commits] = await Promise.all([
    rest<RestRepoMeta>(`/repos/${owner}/${repo}`),
    // empty repos 409 on the commits endpoint — treat as no commits
    rest<RestCommit[]>(
      `/repos/${owner}/${repo}/commits?since=${since}&per_page=100`,
    ).catch(() => [] as RestCommit[]),
  ]);
  return {
    login: `${owner}/${meta.name}`,
    name: meta.name,
    days: daysFromCommitDates(
      commits.map((c) => c.commit.committer?.date ?? c.commit.author?.date ?? ""),
    ),
    totalContributions: commits.length,
    topLanguages: meta.language ? [{ name: meta.language, pct: 100 }] : [],
    stars: meta.stargazers_count,
    followers: 0,
    prs: 0,
    issues: meta.open_issues_count,
    reviews: 0,
    partial: true,
  };
}

// ---------------------------------------------------------------------------
// Org cards: /o/<org> — the organization's aggregate heartbeat, built from
// org-wide public push events (same technique as the user REST fallback).

interface RestOrg {
  login: string;
  name: string | null;
  public_repos: number;
  followers: number;
}

export async function fetchOrgData(org: string): Promise<GithubData> {
  return cachedFetch(
    `gh:o:${org.toLowerCase()}`,
    CACHE_SECONDS,
    () => fetchOrgUncached(org),
    staleUnlessNotFound,
  );
}

async function fetchOrgUncached(org: string): Promise<GithubData> {
  const [meta, repos, events] = await Promise.all([
    rest<RestOrg>(`/orgs/${org}`),
    rest<RestRepo[]>(`/orgs/${org}/repos?per_page=100&sort=pushed`),
    rest<RestEvent[]>(`/orgs/${org}/events?per_page=100`).catch(
      () => [] as RestEvent[],
    ),
  ]);

  const counts = new Map<string, number>();
  for (const ev of events) {
    if (ev.type !== "PushEvent") continue;
    const date = ev.created_at.slice(0, 10);
    const commits = ev.payload?.commits?.length ?? 1;
    counts.set(date, (counts.get(date) ?? 0) + commits);
  }
  const days: DayCount[] = [];
  const today = new Date();
  for (let i = FALLBACK_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    days.push({ date, count: counts.get(date) ?? 0 });
  }

  const own = repos.filter((r) => !r.fork);
  const countType = (type: string) =>
    events.filter((e) => e.type === type).length;
  return {
    login: meta.login,
    name: meta.name,
    days,
    totalContributions: days.reduce((a, d) => a + d.count, 0),
    topLanguages: languagesFrom(own.map((r) => r.language)),
    stars: own.reduce((a, r) => a + r.stargazers_count, 0),
    followers: meta.followers,
    prs: countType("PullRequestEvent"),
    issues: countType("IssuesEvent"),
    reviews: countType("PullRequestReviewEvent"),
    partial: true,
  };
}

// ---------------------------------------------------------------------------
// Holter cards: /holter/<user> — hour-of-day histogram from public events.
// Works identically with or without a token (the events API is REST-only);
// three pages ≈ the API's full 300-event / 90-day memory.

const HOLTER_PAGES = 3;

export interface HolterSample {
  /** activity per UTC hour-of-day, 24 buckets */
  utcHours: number[];
  totalEvents: number;
  oldest: string | null; // ISO timestamps bounding the sample
  newest: string | null;
}

export async function fetchHolterSample(login: string): Promise<HolterSample> {
  return cachedFetch(
    `gh:h:${login.toLowerCase()}`,
    CACHE_SECONDS,
    () => fetchHolterUncached(login),
    staleUnlessNotFound,
  );
}

async function fetchHolterUncached(login: string): Promise<HolterSample> {
  const utcHours = new Array<number>(24).fill(0);
  let totalEvents = 0;
  let oldest: string | null = null;
  let newest: string | null = null;
  for (let page = 1; page <= HOLTER_PAGES; page++) {
    // newest-first; every event type counts — any activity means awake
    const events = await rest<RestEvent[]>(
      `/users/${login}/events/public?per_page=100&page=${page}`,
    );
    for (const ev of events) {
      utcHours[new Date(ev.created_at).getUTCHours()]++;
      totalEvents++;
      newest ??= ev.created_at;
      oldest = ev.created_at;
    }
    if (events.length < 100) break;
  }
  return { utcHours, totalEvents, oldest, newest };
}

export async function fetchRepoData(
  owner: string,
  repo: string,
): Promise<GithubData> {
  return cachedFetch(
    `gh:r:${owner.toLowerCase()}/${repo.toLowerCase()}`,
    CACHE_SECONDS,
    () =>
      process.env.GITHUB_TOKEN
        ? fetchRepoViaGraphQL(owner, repo)
        : fetchRepoViaRest(owner, repo),
    staleUnlessNotFound,
  );
}
