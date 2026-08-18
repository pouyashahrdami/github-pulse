import { describe, expect, it } from "vitest";
import { detectPacemaker, computePulse } from "@/lib/pulse";
import type { GithubData } from "@/lib/github";

describe("detectPacemaker", () => {
  it("flags a classic daily cron", () => {
    expect(detectPacemaker(Array(14).fill(1))).toBe(true);
  });
  it("flags a near-perfect bot with one rest day", () => {
    expect(detectPacemaker([...Array(13).fill(2), 0])).toBe(true);
  });
  it("passes a human rhythm", () => {
    expect(detectPacemaker([3, 0, 7, 1, 0, 12, 4, 2, 0, 5, 1, 8, 0, 2])).toBe(
      false,
    );
  });
  it("passes heavy-but-regular output (mode above 4)", () => {
    expect(detectPacemaker(Array(14).fill(20))).toBe(false);
  });
  it("ignores short and sparse windows", () => {
    expect(detectPacemaker([1, 1, 1])).toBe(false);
    expect(detectPacemaker([1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0])).toBe(
      false,
    );
  });
});

function dataWith(days: { date: string; count: number }[]): GithubData {
  return {
    login: "test",
    name: "Test",
    days,
    totalContributions: days.reduce((a, d) => a + d.count, 0),
    topLanguages: [{ name: "TypeScript", pct: 100 }],
    stars: 0,
    followers: 0,
    prs: 0,
    issues: 0,
    reviews: 0,
    partial: false,
  };
}

function daysEndingToday(counts: number[]): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = counts.length - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      count: counts[counts.length - 1 - i],
    });
  }
  return out;
}

describe("computePulse", () => {
  it("keeps raw dayCounts alongside normalized beats", () => {
    const p = computePulse(dataWith(daysEndingToday([0, 2, 4])), new Date(), 3);
    expect(p.dayCounts).toEqual([0, 2, 4]);
    expect(p.beats).toEqual([0, 0.5, 1]);
  });
  it("flatlines after a long silence", () => {
    const counts = [...Array(20).fill(0)];
    counts[0] = 5; // one beat 19 days ago
    const p = computePulse(dataWith(daysEndingToday(counts)), new Date(), 14);
    expect(p.state).toBe("flatline");
    expect(p.bpm).toBe(0);
  });
});
