import { describe, expect, it } from "vitest";
import { renderCard, renderDuetCard, renderWardCard } from "@/lib/card";
import { parseOptions } from "@/lib/options";
import { resolveTheme, THEMES } from "@/lib/themes";
import type { Pulse } from "@/lib/pulse";

function pulseWith(over: Partial<Pulse> = {}): Pulse {
  return {
    login: "test",
    name: "Test",
    state: "steady",
    bpm: 90,
    weekly: 5,
    streak: 2,
    daysSinceBeat: 0,
    lastBeatDate: "2026-08-16",
    bloodType: "TS+",
    beats: [0, 0.5, 1],
    dayCounts: [0, 2, 4],
    totalContributions: 100,
    stars: 0,
    prs: 0,
    issues: 0,
    reviews: 0,
    fingerprint: { jitter: 0.5, tWave: 0.5, pWave: 0.5 },
    pacemaker: false,
    partial: false,
    ...over,
  };
}

const render = (q: string, p: Pulse = pulseWith()) =>
  renderCard(p, resolveTheme(new URLSearchParams(q)), parseOptions(new URLSearchParams(q)));

describe("renderCard", () => {
  it("rewrites root width for w and w=full", () => {
    expect(render("w=800")).toMatch(/width="800" height="292"/);
    expect(render("w=full")).toMatch(/width="100%"\n/);
  });

  it("escapes custom state labels", () => {
    const svg = render("labels=steady:<b>x</b>&state=steady");
    expect(svg).not.toContain("<b>x</b>");
    expect(svg).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("draws the goal line with correct hit-rate", () => {
    expect(render("goal=2")).toContain("goal 2 · 2/3d");
    expect(render("")).not.toContain("goal ");
  });

  it("flips beats without mutating the input", () => {
    const p = pulseWith();
    const svg = render("wave=bars&flip=1", p);
    expect(svg).toBeTruthy();
    expect(p.beats[0]).toBe(0);
  });

  it("localizes and falls back", () => {
    expect(render("lang=fa")).toContain("تپش/سال");
    expect(render("lang=xx")).toContain("beats/yr");
  });

  it("shows milestone stamps with precedence and opt-out", () => {
    expect(render("", pulseWith({ totalContributions: 1500 }))).toContain(
      "1K CLUB",
    );
    expect(
      render("", pulseWith({ streak: 120, totalContributions: 9000 })),
    ).toContain("CENTURION");
    expect(
      render("hide=milestone", pulseWith({ streak: 120 })),
    ).not.toContain("CENTURION");
  });

  it("adds scanlines only when asked", () => {
    expect(render("scanlines=1")).toContain("gp-scan");
    expect(render("")).not.toContain("gp-scan");
  });
});

describe("renderDuetCard", () => {
  it("computes rhythm sync as Jaccard of active days", () => {
    const a = pulseWith({ login: "alice", dayCounts: [1, 0, 2, 3, 0, 1, 4] });
    const b = pulseWith({ login: "bob", dayCounts: [0, 0, 2, 1, 0, 0, 4] });
    const svg = renderDuetCard(a, b, THEMES.aura, parseOptions(new URLSearchParams("")));
    expect(svg).toContain("SYNC 60%");
    expect((svg.match(/<path/g) ?? []).length).toBe(2);
  });
});

describe("renderWardCard", () => {
  const ward = (...pulses: Pulse[]) =>
    renderWardCard(pulses, THEMES.aura, parseOptions(new URLSearchParams("")));

  it("sorts patients into triage order (bpm desc)", () => {
    const svg = ward(
      pulseWith({ login: "slow", bpm: 40 }),
      pulseWith({ login: "fast", bpm: 160 }),
      pulseWith({ login: "mid", bpm: 90 }),
    );
    const order = [...svg.matchAll(/@(\w+)</g)].map((m) => m[1]);
    expect(order).toEqual(["fast", "mid", "slow"]);
    expect(svg).toContain("3/3 ALIVE");
    expect(svg).toContain("ward · 3 hearts");
  });

  it("counts flatlines out of the alive tally and grows with members", () => {
    const svg = ward(
      pulseWith({ login: "alive1" }),
      pulseWith({ login: "gone", state: "flatline", bpm: 0 }),
    );
    expect(svg).toContain("1/2 ALIVE");
    expect(svg).toContain("— bpm · FLATLINE");
    const two = Number(svg.match(/height="(\d+)"/)?.[1]);
    const three = Number(
      ward(pulseWith(), pulseWith(), pulseWith()).match(/height="(\d+)"/)?.[1],
    );
    expect(three).toBeGreaterThan(two);
  });
});

describe("resolveTheme", () => {
  it("applies custom gradients after color reset", () => {
    const t = resolveTheme(new URLSearchParams("color=ffffff&gradient=ff0000,00ff00"));
    expect(t.traceGradient).toEqual(["#ff0000", "#00ff00", "#ff0000"]);
  });
  it("ignores junk gradients", () => {
    const t = resolveTheme(new URLSearchParams("theme=nord&gradient=zzz,###"));
    expect(t.traceGradient).toBeUndefined();
  });
  it("random is stable per seed and day", () => {
    const q = new URLSearchParams("theme=random");
    expect(resolveTheme(q, "alice")).toEqual(resolveTheme(q, "alice"));
  });
});
