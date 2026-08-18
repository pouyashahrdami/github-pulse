import type { Pulse, PulseState } from "./pulse";
import { redis, redisConfigured } from "./redis";

/**
 * Dead man's switch — watch a user, get a webhook POST when they flatline or
 * revive. Watches live in Redis (set per login + an index set); transitions
 * are detected by the daily /api/watch/sweep cron, which compares each watched
 * user's current state against the last swept one. Delivery is at-most-once:
 * a webhook that errors is not retried, the next sweep moves on.
 *
 * Abuse posture: this POSTs to user-supplied URLs, so the shared instance
 * only accepts chat-webhook hosts (Discord/Slack). Self-hosters can open it
 * up with PULSE_WEBHOOK_ALLOW_ANY=1.
 */

const INDEX = "pulse:watch:index";
const MAX_WATCHERS_PER_LOGIN = 3;
const MAX_WATCHED_LOGINS = 500;
const DISPATCH_TIMEOUT_MS = 5_000;

const CHAT_HOSTS = new Set(["discord.com", "discordapp.com", "hooks.slack.com"]);

const watchKey = (login: string) => `pulse:watch:${login.toLowerCase()}`;
const stateKey = (login: string) => `pulse:watchstate:${login.toLowerCase()}`;

/** Returns the normalized URL, or null when it isn't an acceptable webhook target. */
export function validateWebhookUrl(raw: string): string | null {
  if (raw.length > 400) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (
    process.env.PULSE_WEBHOOK_ALLOW_ANY !== "1" &&
    !CHAT_HOSTS.has(u.hostname)
  ) {
    return null;
  }
  return u.toString();
}

export type WatchEvent = "flatline" | "revived";

/** The only transitions worth waking anyone up for. */
export function transitionEvent(
  prev: PulseState | null,
  next: PulseState,
): WatchEvent | null {
  if (prev === null || prev === next) return null;
  if (next === "flatline") return "flatline";
  if (prev === "flatline") return "revived";
  return null;
}

/** Chat hosts get a human one-liner in their native field; anything else gets vitals JSON. */
export function webhookBody(url: string, event: WatchEvent, pulse: Pulse): string {
  const line =
    event === "flatline"
      ? `🖤 @${pulse.login} flatlined — last beat ${pulse.lastBeatDate ?? "unknown"}`
      : `⚡ @${pulse.login} is back from the dead — ${pulse.bpm} bpm`;
  const host = new URL(url).hostname;
  if (host === "discord.com" || host === "discordapp.com") {
    return JSON.stringify({ content: line });
  }
  if (host === "hooks.slack.com") {
    return JSON.stringify({ text: line });
  }
  return JSON.stringify({
    event,
    login: pulse.login,
    state: pulse.state,
    bpm: pulse.bpm,
    daysSinceBeat: pulse.daysSinceBeat,
    lastBeatDate: pulse.lastBeatDate,
  });
}

export type AddResult = "ok" | "invalid" | "full" | "unavailable";

export async function addWatch(login: string, url: string): Promise<AddResult> {
  if (!redisConfigured()) return "unavailable";
  const valid = validateWebhookUrl(url);
  if (!valid) return "invalid";
  const [watchers, watched] = await Promise.all([
    redis(["SCARD", watchKey(login)]),
    redis(["SCARD", INDEX]),
  ]);
  if (Number(watchers) >= MAX_WATCHERS_PER_LOGIN) return "full";
  if (Number(watched) >= MAX_WATCHED_LOGINS) return "full";
  await Promise.all([
    redis(["SADD", watchKey(login), valid]),
    redis(["SADD", INDEX, login.toLowerCase()]),
  ]);
  return "ok";
}

export async function removeWatch(login: string, url: string): Promise<void> {
  if (!redisConfigured()) return;
  await redis(["SREM", watchKey(login), url]);
  const left = await redis(["SCARD", watchKey(login)]);
  if (Number(left) === 0) {
    await Promise.all([
      redis(["SREM", INDEX, login.toLowerCase()]),
      redis(["DEL", stateKey(login)]),
    ]);
  }
}

export async function watcherCount(login: string): Promise<number> {
  if (!redisConfigured()) return 0;
  return Number(await redis(["SCARD", watchKey(login)]));
}

export async function watchedLogins(): Promise<string[]> {
  if (!redisConfigured()) return [];
  const raw = await redis(["SMEMBERS", INDEX]);
  return Array.isArray(raw) ? raw.filter((m): m is string => typeof m === "string") : [];
}

export async function lastSweptState(login: string): Promise<PulseState | null> {
  const raw = await redis(["GET", stateKey(login)]);
  return typeof raw === "string" ? (raw as PulseState) : null;
}

export async function setSweptState(login: string, state: PulseState): Promise<void> {
  await redis(["SET", stateKey(login), state]);
}

/** POST the event to every watcher of this login; returns delivered count. */
export async function dispatch(
  login: string,
  event: WatchEvent,
  pulse: Pulse,
): Promise<number> {
  const raw = await redis(["SMEMBERS", watchKey(login)]);
  const urls = Array.isArray(raw)
    ? raw.filter((m): m is string => typeof m === "string")
    : [];
  let delivered = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: webhookBody(url, event, pulse),
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      });
      if (res.ok) delivered++;
      else console.error(`webhook ${url} responded ${res.status}`);
    } catch (err) {
      console.error(`webhook ${url} failed:`, err);
    }
  }
  return delivered;
}
