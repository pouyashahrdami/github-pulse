import { redis, redisConfigured } from "./redis";

/**
 * Embed telemetry — which cards are actually beating in the wild. One sorted
 * set of subjects scored by last-seen time; "beating this week" is a range
 * count over it. Counted on origin renders only, so CDN/camo cache hits are
 * invisible — the numbers undercount, never inflate.
 *
 * Redis-only by design: card routes and /api/stats are separate bundles (and
 * separate lambdas in prod), so instance memory can't aggregate across them.
 * Without Redis, recording is a no-op and the stat reports durable: false.
 * Best-effort throughout — stats must never touch a render.
 */

export type BeatKind = "u" | "r" | "o" | "vs" | "ward";

const KEY = "pulse:hearts";
const WEEK_SECONDS = 7 * 86_400;

export async function recordBeat(kind: BeatKind, subject: string): Promise<void> {
  if (!redisConfigured()) return;
  const member = `${kind}:${subject.toLowerCase()}`;
  try {
    await redis(["ZADD", KEY, String(Math.floor(Date.now() / 1000)), member]);
  } catch (err) {
    console.error("beat count failed:", err);
  }
}

export interface Hearts {
  week: number; // distinct cards served in the last 7 days
  allTime: number;
  durable: boolean; // false = no Redis configured, counts are not collected
}

export interface RecentBeat {
  kind: BeatKind;
  subject: string; // "login", "owner/repo", "org", or "a/b" for duets
}

/** Most recently served cards, newest first — the Wall of Hearts source. */
export async function recentBeats(limit: number): Promise<RecentBeat[]> {
  if (!redisConfigured()) return [];
  try {
    const raw = await redis([
      "ZRANGE", KEY, "+inf", "-inf", "BYSCORE", "REV",
      "LIMIT", "0", String(limit),
    ]);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((m) => {
      if (typeof m !== "string") return [];
      const i = m.indexOf(":");
      const kind = m.slice(0, i);
      const subject = m.slice(i + 1);
      return (kind === "u" ||
        kind === "r" ||
        kind === "o" ||
        kind === "vs" ||
        kind === "ward") &&
        subject
        ? [{ kind, subject }]
        : [];
    });
  } catch (err) {
    console.error("wall read failed:", err);
    return [];
  }
}

export async function heartsBeating(): Promise<Hearts> {
  if (redisConfigured()) {
    try {
      const since = Math.floor(Date.now() / 1000) - WEEK_SECONDS;
      const [week, allTime] = await Promise.all([
        redis(["ZCOUNT", KEY, String(since), "+inf"]),
        redis(["ZCARD", KEY]),
      ]);
      return { week: Number(week), allTime: Number(allTime), durable: true };
    } catch (err) {
      console.error("hearts read failed:", err);
    }
  }
  return { week: 0, allTime: 0, durable: false };
}
