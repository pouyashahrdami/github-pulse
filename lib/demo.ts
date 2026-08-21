import type { DayCount, HolterSample } from "./github";
import type { Pulse, PulseState } from "./pulse";

/**
 * Synthetic patients for the builder's live demo and the committed README
 * samples. Deterministic (seeded RNG), and never real accounts — showcasing a
 * person requires their opt-in, so the demo ward is staffed by fiction.
 */

/** mulberry32 — tiny seeded RNG so demos are reproducible. */
export function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoPatient(
  login: string,
  state: PulseState,
  bpm: number,
  seed: number,
  activity: number,
): Pulse {
  const r = rng(seed);
  const beats =
    state === "flatline"
      ? Array.from({ length: 14 }, () => 0)
      : Array.from({ length: 14 }, () => (r() < activity ? 0.2 + r() * 0.8 : 0));
  const alive = state !== "flatline";
  return {
    login,
    name: login,
    state,
    bpm,
    weekly: alive ? Math.round(bpm / 12) : 0,
    streak: alive ? 2 + Math.floor(r() * 9) : 0,
    daysSinceBeat: alive ? 0 : 21,
    lastBeatDate: null,
    bloodType: "TS+",
    beats,
    dayCounts: beats.map((b) => Math.round(b * 8)),
    totalContributions: alive ? 800 + Math.floor(r() * 1900) : 240,
    stars: 12 + Math.floor(r() * 120),
    prs: Math.floor(r() * 40),
    issues: Math.floor(r() * 25),
    reviews: Math.floor(r() * 30),
    fingerprint: { jitter: r(), tWave: r(), pWave: r() },
    pacemaker: false,
    partial: false,
  };
}

/** A believable year: one winter flatline, lighter weekends, one heroic day. */
export function demoYear(): DayCount[] {
  const r = rng(42);
  const end = Date.UTC(2026, 7, 18);
  const days: DayCount[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    let count = 0;
    if (date >= "2026-01-04" && date <= "2026-01-21") count = 0;
    else if (date === "2026-03-14") count = 47;
    else if (r() < (weekend ? 0.35 : 0.78)) count = 1 + Math.floor(r() * 11);
    days.push({ date, count });
  }
  return days;
}

/** A committed night owl: loud 22:00–04:59, silent 06:00–13:59. */
export function demoHolterSample(): HolterSample {
  const r = rng(13);
  const utcHours = Array.from({ length: 24 }, (_, h) => {
    if (h >= 22 || h < 5) return 18 + Math.floor(r() * 14);
    if (h >= 6 && h < 14) return 0;
    return Math.floor(r() * 5);
  });
  return {
    utcHours,
    totalEvents: utcHours.reduce((a, b) => a + b, 0),
    oldest: "2026-07-21T02:11:00Z",
    newest: "2026-08-18T03:40:00Z",
  };
}
