import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedFetch } from "@/lib/cache";

// No UPSTASH_* env in tests → exercises the in-memory fallback path.

let seq = 0;
const key = () => `test:${++seq}`;

afterEach(() => {
  vi.useRealTimers();
});

describe("cachedFetch", () => {
  it("serves a fresh entry without refetching", async () => {
    const k = key();
    const fetcher = vi.fn().mockResolvedValue("a");
    expect(await cachedFetch(k, 60, fetcher)).toBe("a");
    expect(await cachedFetch(k, 60, fetcher)).toBe("a");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches after the TTL expires", async () => {
    vi.useFakeTimers();
    const k = key();
    const fetcher = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");
    expect(await cachedFetch(k, 60, fetcher)).toBe("old");
    vi.advanceTimersByTime(61_000);
    expect(await cachedFetch(k, 60, fetcher)).toBe("new");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("serves stale on fetch failure", async () => {
    vi.useFakeTimers();
    const k = key();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("stale")
      .mockRejectedValueOnce(new Error("rate limited"));
    expect(await cachedFetch(k, 60, fetcher)).toBe("stale");
    vi.advanceTimersByTime(61_000);
    expect(await cachedFetch(k, 60, fetcher)).toBe("stale");
  });

  it("rethrows when staleIfError rejects the error", async () => {
    vi.useFakeTimers();
    const k = key();
    const gone = new Error("not found");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("stale")
      .mockRejectedValueOnce(gone);
    await cachedFetch(k, 60, fetcher, () => false);
    vi.advanceTimersByTime(61_000);
    await expect(cachedFetch(k, 60, fetcher, () => false)).rejects.toBe(gone);
  });

  it("rethrows when there is nothing cached", async () => {
    const boom = new Error("boom");
    await expect(
      cachedFetch(key(), 60, vi.fn().mockRejectedValue(boom)),
    ).rejects.toBe(boom);
  });
});
