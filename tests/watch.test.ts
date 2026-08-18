import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pulse } from "@/lib/pulse";
import {
  addWatch,
  blockWatches,
  removeWatch,
  transitionEvent,
  unblockWatches,
  validateWebhookUrl,
  watcherCount,
  webhookBody,
} from "@/lib/watch";

const DISCORD = "https://discord.com/api/webhooks/123/abc";
const SLACK = "https://hooks.slack.com/services/T/B/x";

describe("validateWebhookUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts https chat hosts and nothing else by default", () => {
    expect(validateWebhookUrl(DISCORD)).toBe(DISCORD);
    expect(validateWebhookUrl(SLACK)).toBe(SLACK);
    expect(validateWebhookUrl("http://discord.com/api/webhooks/1/x")).toBeNull();
    expect(validateWebhookUrl("https://evil.example/hook")).toBeNull();
    expect(validateWebhookUrl("not a url")).toBeNull();
    expect(validateWebhookUrl(`https://discord.com/${"x".repeat(400)}`)).toBeNull();
  });

  it("opens up for self-hosters via PULSE_WEBHOOK_ALLOW_ANY", () => {
    vi.stubEnv("PULSE_WEBHOOK_ALLOW_ANY", "1");
    expect(validateWebhookUrl("https://my-server.example/hook")).toBe(
      "https://my-server.example/hook",
    );
    expect(validateWebhookUrl("http://my-server.example/hook")).toBeNull();
  });
});

describe("transitionEvent", () => {
  it("fires only on death and resurrection", () => {
    expect(transitionEvent(null, "flatline")).toBeNull(); // first sighting
    expect(transitionEvent("radiant", "flatline")).toBe("flatline");
    expect(transitionEvent("critical", "flatline")).toBe("flatline");
    expect(transitionEvent("flatline", "steady")).toBe("revived");
    expect(transitionEvent("flatline", "revived")).toBe("revived");
    expect(transitionEvent("steady", "radiant")).toBeNull();
    expect(transitionEvent("flatline", "flatline")).toBeNull();
  });
});

describe("webhookBody", () => {
  const pulse = {
    login: "alice",
    state: "flatline",
    bpm: 0,
    daysSinceBeat: 14,
    lastBeatDate: "2026-08-01",
  } as Pulse;

  it("shapes the payload per host", () => {
    const discord = JSON.parse(webhookBody(DISCORD, "flatline", pulse));
    expect(discord.content).toContain("@alice flatlined");
    expect(discord.content).toContain("2026-08-01");

    const slack = JSON.parse(webhookBody(SLACK, "revived", pulse));
    expect(slack.text).toContain("@alice is back");

    const generic = JSON.parse(
      webhookBody("https://my-server.example/hook", "flatline", pulse),
    );
    expect(generic).toMatchObject({ event: "flatline", login: "alice" });
  });
});

describe("watch registry (redis-backed)", () => {
  const sets = new Map<string, Set<string>>();
  const strings = new Map<string, string>();

  function fakeUpstash(_input: RequestInfo | URL, init?: RequestInit) {
    const [cmd, key, ...args] = JSON.parse(init?.body as string) as string[];
    let result: unknown = null;
    const set = () => sets.get(key) ?? sets.set(key, new Set()).get(key)!;
    if (cmd === "SADD") result = set().add(args[0]).size;
    else if (cmd === "SISMEMBER") result = set().has(args[0]) ? 1 : 0;
    else if (cmd === "SREM") result = set().delete(args[0]) ? 1 : 0;
    else if (cmd === "SCARD") result = sets.get(key)?.size ?? 0;
    else if (cmd === "SMEMBERS") result = [...(sets.get(key) ?? [])];
    else if (cmd === "DEL") result = sets.delete(key) || strings.delete(key) ? 1 : 0;
    else if (cmd === "SET") { strings.set(key, args[0]); result = "OK"; }
    else if (cmd === "GET") result = strings.get(key) ?? null;
    return Promise.resolve(Response.json({ result }));
  }

  beforeEach(() => {
    sets.clear();
    strings.clear();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn(fakeUpstash));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("adds, counts, caps at three watchers, and removes cleanly", async () => {
    expect(await addWatch("Alice", DISCORD)).toBe("ok");
    expect(await addWatch("alice", `${DISCORD}2`)).toBe("ok");
    expect(await addWatch("alice", `${DISCORD}3`)).toBe("ok");
    expect(await addWatch("alice", `${DISCORD}4`)).toBe("full");
    expect(await watcherCount("ALICE")).toBe(3);
    expect(await addWatch("alice", "https://evil.example/x")).toBe("invalid");

    await removeWatch("alice", DISCORD);
    expect(await watcherCount("alice")).toBe(2);
  });

  it("blocking refuses new watches and purges existing ones", async () => {
    expect(await addWatch("alice", DISCORD)).toBe("ok");
    await blockWatches("Alice");
    expect(await watcherCount("alice")).toBe(0);
    expect(await addWatch("alice", DISCORD)).toBe("blocked");
    await unblockWatches("alice");
    expect(await addWatch("alice", DISCORD)).toBe("ok");
  });

  it("is unavailable without redis", async () => {
    vi.unstubAllEnvs();
    expect(await addWatch("alice", DISCORD)).toBe("unavailable");
    expect(await watcherCount("alice")).toBe(0);
  });
});
