import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { heartsBeating, recentBeats, recordBeat } from "@/lib/beats";

// Simulates the Upstash REST endpoint with a tiny in-memory ZSET so the real
// command construction and response parsing in beats.ts + redis.ts run.

const zset = new Map<string, number>(); // member → score

function fakeUpstash(input: RequestInfo | URL, init?: RequestInit) {
  const [cmd, ...args] = JSON.parse(init?.body as string) as string[];
  let result: unknown = null;
  if (cmd === "ZADD") {
    zset.set(args[2], Number(args[1]));
    result = 1;
  } else if (cmd === "ZCOUNT") {
    const min = Number(args[1]);
    result = [...zset.values()].filter((s) => s >= min).length;
  } else if (cmd === "ZCARD") {
    result = zset.size;
  } else if (cmd === "ZRANGE") {
    // shape used by recentBeats: ZRANGE key +inf -inf BYSCORE REV LIMIT 0 n
    const limit = Number(args[7]);
    result = [...zset.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([member]) => member);
  }
  return Promise.resolve(Response.json({ result }));
}

describe("beats (redis-backed)", () => {
  beforeEach(() => {
    zset.clear();
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

  it("lists recent beats newest first, parsed by kind", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    await recordBeat("u", "older");
    vi.setSystemTime(new Date("2026-08-02T00:00:00Z"));
    await recordBeat("r", "owner/repo");
    vi.setSystemTime(new Date("2026-08-03T00:00:00Z"));
    await recordBeat("vs", "a/b");
    expect(await recentBeats(2)).toEqual([
      { kind: "vs", subject: "a/b" },
      { kind: "r", subject: "owner/repo" },
    ]);
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
