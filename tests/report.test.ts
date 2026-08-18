import { describe, expect, it } from "vitest";
import { renderReportCard } from "@/lib/card";
import type { DayCount } from "@/lib/github";
import { parseOptions } from "@/lib/options";
import type { Pulse } from "@/lib/pulse";
import { computeReport } from "@/lib/report";
import { THEMES } from "@/lib/themes";

// Mon 2026-06-01 .. — a week with a weekend at indices 5 (Sat) and 6 (Sun).
const week = (counts: number[]): DayCount[] =>
  counts.map((count, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    count,
  }));

describe("computeReport", () => {
  it("finds streaks, flatlines, and the busiest day", () => {
    const stats = computeReport(week([2, 3, 0, 0, 0, 7, 1]));
    expect(stats.totalBeats).toBe(13);
    expect(stats.activeDays).toBe(4);
    expect(stats.longestStreak).toBe(2);
    expect(stats.longestFlatline).toEqual({
      days: 3,
      from: "2026-06-03",
      to: "2026-06-05",
    });
    expect(stats.busiest).toEqual({ date: "2026-06-06", count: 7 });
  });

  it("attributes weekend load by UTC day-of-week", () => {
    // 2026-06-06 is a Saturday, 06-07 a Sunday: 8 of 13 beats → 62%
    const stats = computeReport(week([2, 3, 0, 0, 0, 7, 1]));
    expect(stats.weekendPct).toBe(62);
  });

  it("handles an empty and an all-zero window", () => {
    expect(computeReport([]).totalBeats).toBe(0);
    const dead = computeReport(week([0, 0, 0, 0, 0, 0, 0]));
    expect(dead.longestFlatline.days).toBe(7);
    expect(dead.busiest).toBeNull();
    expect(dead.weekendPct).toBe(0);
  });
});

describe("renderReportCard", () => {
  it("prints the chart with patient line and stats", () => {
    const pulse = {
      login: "alice",
      state: "steady",
      bloodType: "TS+",
    } as Pulse;
    const svg = renderReportCard(
      pulse,
      computeReport(week([2, 3, 0, 0, 0, 7, 1])),
      THEMES.paper,
      parseOptions(new URLSearchParams("")),
      "2026-08-18",
    );
    expect(svg).toContain("CARDIOLOGY REPORT");
    expect(svg).toContain("printed 2026-08-18");
    expect(svg).toContain("@alice");
    expect(svg).toContain("LONGEST FLATLINE");
    expect(svg).toContain("2026-06-06 · 7");
    expect(svg).toContain("<polyline");
  });
});
