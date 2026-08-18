/**
 * Regenerates the committed README sample SVGs that need deterministic,
 * ideal-looking data (a ward with a flatline in it, a full-year report).
 * Synthetic patients only — no real accounts implied. Run from the repo root:
 *
 *   npx -y tsx scripts/samples.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_OPTIONS, renderReportCard, renderWardCard } from "../lib/card";
import type { DayCount } from "../lib/github";
import type { Pulse, PulseState } from "../lib/pulse";
import { computeReport } from "../lib/report";
import { THEMES } from "../lib/themes";

/** mulberry32 — tiny seeded RNG so samples are reproducible. */
function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function patient(
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
  return {
    login,
    name: login,
    state,
    bpm,
    weekly: 0,
    streak: 0,
    daysSinceBeat: state === "flatline" ? 21 : 0,
    lastBeatDate: null,
    bloodType: "TS+",
    beats,
    dayCounts: beats.map((b) => Math.round(b * 8)),
    totalContributions: 0,
    stars: 0,
    prs: 0,
    issues: 0,
    reviews: 0,
    fingerprint: { jitter: r(), tWave: r(), pWave: r() },
    pacemaker: false,
    partial: false,
  };
}

function yearOfDays(): DayCount[] {
  const r = rng(42);
  const end = Date.UTC(2026, 7, 18);
  const days: DayCount[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    // an 18-day winter flatline, lighter weekends, one heroic spring day
    let count = 0;
    if (date >= "2026-01-04" && date <= "2026-01-21") count = 0;
    else if (date === "2026-03-14") count = 47;
    else if (r() < (weekend ? 0.35 : 0.78)) count = 1 + Math.floor(r() * 11);
    days.push({ date, count });
  }
  return days;
}

const out = (rel: string) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

const ward = renderWardCard(
  [
    patient("nova", "radiant", 172, 7, 0.85),
    patient("lin", "steady", 96, 21, 0.6),
    patient("sam", "fading", 44, 33, 0.3),
    patient("ghost", "flatline", 0, 5, 0),
  ],
  THEMES.phosphor,
  DEFAULT_OPTIONS,
);
writeFileSync(out("assets/sample-ward.svg"), ward);

const days = yearOfDays();
const report = renderReportCard(
  patient("nova", "steady", 84, 11, 0.7),
  computeReport(days),
  THEMES.paper,
  DEFAULT_OPTIONS,
  "2026-08-18",
);
writeFileSync(out("assets/sample-report.svg"), report);

console.log("wrote assets/sample-ward.svg, assets/sample-report.svg");
