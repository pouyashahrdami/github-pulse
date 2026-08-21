import { describe, expect, it } from "vitest";
import type { HolterSample } from "@/lib/github";
import { computeHolter } from "@/lib/holter";

const sample = (
  fill: (hour: number) => number,
  span: { oldest?: string; newest?: string } = {},
): HolterSample => {
  const utcHours = Array.from({ length: 24 }, (_, h) => fill(h));
  return {
    utcHours,
    totalEvents: utcHours.reduce((a, b) => a + b, 0),
    oldest: span.oldest ?? "2026-07-01T00:00:00Z",
    newest: span.newest ?? "2026-08-15T00:00:00Z",
  };
};

describe("computeHolter", () => {
  it("diagnoses a night-dominant rhythm as nocturnal", () => {
    // beats between 23:00 and 03:59, nothing else
    const stats = computeHolter(sample((h) => (h >= 23 || h < 4 ? 10 : 0)));
    expect(stats.chronotype).toBe("nocturnal");
    expect(stats.nightPct).toBe(100);
  });

  it("diagnoses a morning rhythm as early bird", () => {
    const stats = computeHolter(sample((h) => (h >= 6 && h < 11 ? 12 : 1)));
    expect(stats.chronotype).toBe("early bird");
  });

  it("calls a flat rhythm arrhythmic and a thin one inconclusive", () => {
    expect(computeHolter(sample(() => 5)).chronotype).toBe("arrhythmic");
    expect(computeHolter(sample((h) => (h === 23 ? 3 : 0))).chronotype).toBe(
      "inconclusive",
    );
  });

  it("finds the sleep window, wrapping midnight", () => {
    // quiet 23:00–06:59, active the rest of the day
    const stats = computeHolter(sample((h) => (h >= 23 || h < 7 ? 0 : 8)));
    expect(stats.sleep).toEqual({ from: 23, to: 7, hours: 8 });
  });

  it("shifts the histogram by the tz offset", () => {
    // all UTC activity at 20:00 = 23:00 local in UTC+3
    const utc = computeHolter(sample((h) => (h === 20 ? 30 : 0)));
    const tehran = computeHolter(sample((h) => (h === 20 ? 30 : 0)), 180);
    expect(utc.peakHour).toBe(20);
    expect(tehran.peakHour).toBe(23);
    expect(tehran.chronotype).toBe("nocturnal");
  });

  it("measures the sampled window in days", () => {
    const stats = computeHolter(
      sample(() => 2, {
        oldest: "2026-08-01T12:00:00Z",
        newest: "2026-08-15T12:00:00Z",
      }),
    );
    expect(stats.windowDays).toBe(14);
  });

  it("survives an empty sample", () => {
    const stats = computeHolter({
      utcHours: new Array(24).fill(0),
      totalEvents: 0,
      oldest: null,
      newest: null,
    });
    expect(stats.chronotype).toBe("inconclusive");
    expect(stats.peakHour).toBeNull();
    expect(stats.sleep).toBeNull();
    expect(stats.windowDays).toBe(0);
  });
});
