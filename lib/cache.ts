import { redis, redisConfigured } from "./redis";

/**
 * Shared fetch cache for GitHub data, keyed per subject (user/repo/org), so
 * every param variant of a card costs one upstream call. Next's data cache
 * can't provide this for the GraphQL requests — POSTs are never cached — and
 * the in-memory fallback only survives warm lambda reuse; Upstash makes it
 * fleet-wide. Entries are kept well past their freshness TTL and served stale
 * when the upstream fetch fails, so rate-limit spikes degrade cards to
 * slightly-old vitals instead of an error card.
 */

interface Entry<T> {
  v: T;
  at: number; // epoch ms when fetched
}

const memory = new Map<string, Entry<unknown>>();
const MEMORY_MAX_KEYS = 1000;
const HARD_TTL_SECONDS = 604_800; // stale copies stay available for 7 days

async function load<T>(key: string): Promise<Entry<T> | undefined> {
  if (!redisConfigured()) return memory.get(key) as Entry<T> | undefined;
  try {
    const raw = await redis(["GET", key]);
    return typeof raw === "string" ? (JSON.parse(raw) as Entry<T>) : undefined;
  } catch {
    // a Redis outage must never break a render — fall back to instance memory
    return memory.get(key) as Entry<T> | undefined;
  }
}

async function save<T>(key: string, entry: Entry<T>): Promise<void> {
  if (!memory.has(key) && memory.size >= MEMORY_MAX_KEYS) {
    memory.delete(memory.keys().next().value as string);
  }
  memory.set(key, entry);
  if (!redisConfigured()) return;
  try {
    await redis([
      "SET",
      key,
      JSON.stringify(entry),
      "EX",
      String(HARD_TTL_SECONDS),
    ]);
  } catch {
    // same: cache writes are best-effort
  }
}

/**
 * Return the cached value for `key` if fresher than `ttlSeconds`, else run
 * `fetcher` and cache the result. On fetch failure a stale entry is served
 * when `staleIfError(err)` allows it (default: always) — pass a predicate to
 * exclude definitive answers like not-found from outage fallback.
 */
export async function cachedFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  staleIfError: (err: unknown) => boolean = () => true,
): Promise<T> {
  const entry = await load<T>(key);
  if (entry && Date.now() - entry.at < ttlSeconds * 1000) return entry.v;
  try {
    const v = await fetcher();
    await save(key, { v, at: Date.now() });
    return v;
  } catch (err) {
    if (entry && staleIfError(err)) return entry.v;
    throw err;
  }
}
