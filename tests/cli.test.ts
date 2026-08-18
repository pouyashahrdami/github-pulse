import { describe, expect, it } from "vitest";
import {
  fmtCount,
  renderVitals,
  sparkline,
  type Vitals,
} from "../packages/cli/src/render";

const vitals = (over: Partial<Vitals> = {}): Vitals => ({
  login: "alice",
  state: "radiant",
  bpm: 72,
  streak: 12,
  daysSinceBeat: 0,
  lastBeatDate: "2026-08-18",
  bloodType: "TS+",
  dayCounts: [0, 1, 3, 0, 5, 2, 1],
  totalContributions: 5431,
  stars: 340,
  pacemaker: false,
  partial: false,
  ...over,
});

describe("sparkline", () => {
  it("maps zero to the floor and the max to the peak", () => {
    const line = sparkline([0, 1, 4]);
    expect(line).toHaveLength(3);
    expect(line[0]).toBe("▁");
    expect(line[2]).toBe("█");
  });

  it("stays on the floor when everything is zero", () => {
    expect(sparkline([0, 0, 0])).toBe("▁▁▁");
  });
});

describe("fmtCount", () => {
  it("abbreviates thousands and millions", () => {
    expect(fmtCount(999)).toBe("999");
    expect(fmtCount(5431)).toBe("5.4k");
    expect(fmtCount(1_200_000)).toBe("1.2M");
  });
});

describe("renderVitals", () => {
  it("renders head, wave, and stats without ANSI when color is off", () => {
    const out = renderVitals(vitals(), false);
    expect(out).not.toContain("\x1b");
    const [head, wave, stats] = out.split("\n");
    expect(head).toContain("@alice");
    expect(head).toContain("RADIANT");
    expect(head).toContain("72 bpm");
    expect(wave).toContain("7d");
    expect(stats).toContain("streak 12d");
    expect(stats).toContain("5.4k beats/yr");
  });

  it("renders a flatline as a flat trace with time of death", () => {
    const out = renderVitals(
      vitals({
        state: "flatline",
        bpm: 0,
        streak: 0,
        daysSinceBeat: 34,
        lastBeatDate: "2026-07-15",
        dayCounts: [0, 0, 0, 0, 0, 0, 0],
      }),
      false,
    );
    expect(out).toContain("─".repeat(7));
    expect(out).toContain("last beat 2026-07-15");
    expect(out).toContain("34d silent");
  });

  it("emits ANSI codes when color is on", () => {
    expect(renderVitals(vitals(), true)).toContain("\x1b[92m");
  });
});
