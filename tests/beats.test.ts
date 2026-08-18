import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { heartsBeating, recentBeats, recordBeat } from "@/lib/beats";

// Simulates the Upstash REST endpoint with a tiny in-memory ZSET so the real
// command construction and response parsing in beats.ts + redis.ts run.

const zsets = new Map<string, Map<string, number>>(); // key → member → score

function fakeUpstash(input: RequestInfo | URL, init?: RequestInit) {
  const [cmd, key, ...args] = JSON.parse(init?.body as string) as string[];
  const zset = zsets.get(key) ?? zsets.set(key, new Map()).get(key)!;
  let result: unknown = null;
  if (cmd === "ZADD") {
    zset.set(args[1], Number(args[0]));
    result = 1;
  } else if (cmd === "ZCOUNT") {
    const min = Number(args[0]);
    result = [...zset.values()].filter((s) => s >= min).length;
  } else if (cmd === "ZCARD") {
    result = zset.size;
  } else if (cmd === "ZRANGE") {
    // shape used by recentBeats: ZRANGE key +inf -inf BYSCORE REV LIMIT 0 n
    const limit = Number(args[6]);
    result = [...zset.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([member]) => member);
  }
  return Promise.resolve(Response.json({ result }));
}

describe("beats (redis-backed)", () => {
  beforeEach(() => {
    zsets.clear();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn(fakeUpstash));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("counts distinct subjects, not repeat renders", async () => {
    await recordBeat("u", "Alice");
    await recordBeat("u", "alice"); // same heart, different casing
    await recordBeat("r", "alice/app");
    expect(await heartsBeating()).toEqual({ week: 2, allTime: 2, durable: true });
  });

  it("drops hearts out of the weekly count after 7 days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    await recordBeat("u", "sleeper");
    vi.setSystemTime(new Date("2026-08-09T00:00:00Z"));
    await recordBeat("u", "fresh");
    expect(await heartsBeating()).toEqual({ week: 1, allTime: 2, durable: true });
  });

  it("a repeat render refreshes last-seen", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    await recordBeat("u", "regular");
    vi.setSystemTime(new Date("2026-08-09T00:00:00Z"));
    await recordBeat("u", "regular");
    expect((await heartsBeating()).week).toBe(1);
  });

  it("lists only wall opt-ins, newest first, parsed by kind", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    await recordBeat("u", "older", { wall: true });
    vi.setSystemTime(new Date("2026-08-02T00:00:00Z"));
    await recordBeat("r", "owner/repo", { wall: true });
    vi.setSystemTime(new Date("2026-08-03T00:00:00Z"));
    await recordBeat("vs", "a/b", { wall: true });
    await recordBeat("u", "bystander"); // rendered by someone else — counted, never shown
    expect(await recentBeats(2)).toEqual([
      { kind: "vs", subject: "a/b" },
      { kind: "r", subject: "owner/repo" },
    ]);
    expect(await recentBeats(10)).not.toContainEqual({
      kind: "u",
      subject: "bystander",
    });
    expect((await heartsBeating()).allTime).toBe(4);
  });

  it("is honest when redis is missing", async () => {
    vi.unstubAllEnvs();
    await recordBeat("u", "ghost");
    expect(await heartsBeating()).toEqual({
      week: 0,
      allTime: 0,
      durable: false,
    });
    expect(await recentBeats(10)).toEqual([]);
  });
});
