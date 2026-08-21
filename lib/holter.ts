import type { HolterSample } from "./github";

/**
 * Holter monitor — 24-hour circadian rhythm from the public-events histogram.
 * Pure math; the card renderer formats it. Hours are local once the caller's
 * tz offset is applied (rounded to whole hours — half-hour zones land within
 * 30 minutes, which is close enough for a diagnosis stamp).
 */

export type Chronotype =
  | "nocturnal" // night-dominant: 22:00–05:59
  | "early bird" // morning-dominant: 06:00–11:59
  | "daywalker" // afternoon-dominant: 12:00–17:59
  | "after hours" // evening-dominant: 18:00–21:59
  | "arrhythmic" // no dominant window
  | "inconclusive"; // too few events to call

export interface HolterStats {
  /** activity per local hour-of-day, 24 buckets */
  hours: number[];
  totalEvents: number;
  /** span the sample covers, in whole days (≥1 when any events exist) */
  windowDays: number;
  peakHour: number | null;
  /** share of activity between 22:00 and 05:59, 0..100 */
  nightPct: number;
  /** longest quiet stretch ≥4h: [from, to) local hours, wraps midnight */
  sleep: { from: number; to: number; hours: number } | null;
  chronotype: Chronotype;
  tzMinutes: number;
}

const NIGHT = [22, 23, 0, 1, 2, 3, 4, 5];
const MORNING = [6, 7, 8, 9, 10, 11];
const AFTERNOON = [12, 13, 14, 15, 16, 17];
const EVENING = [18, 19, 20, 21];

/** minimum sample size for any diagnosis beyond "inconclusive" */
const MIN_EVENTS = 20;
/** a window dominates when its share is ≥1.4× what a flat rhythm would give */
const DOMINANCE = 1.4;

function share(hours: number[], window: number[], total: number): number {
  const n = window.reduce((a, h) => a + hours[h], 0);
  return total ? (100 * n) / total : 0;
}

function diagnose(hours: number[], total: number): Chronotype {
  if (total < MIN_EVENTS) return "inconclusive";
  const windows: { type: Chronotype; window: number[] }[] = [
    { type: "nocturnal", window: NIGHT },
    { type: "early bird", window: MORNING },
    { type: "daywalker", window: AFTERNOON },
    { type: "after hours", window: EVENING },
  ];
  let best: Chronotype = "arrhythmic";
  let bestScore = DOMINANCE;
  for (const { type, window } of windows) {
    const uniform = (100 * window.length) / 24;
    const score = share(hours, window, total) / uniform;
    if (score >= bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return best;
}

/** longest circular run of quiet hours — the rhythm's suspected sleep. */
function sleepWindow(
  hours: number[],
  total: number,
): HolterStats["sleep"] {
  if (!total) return null;
  const quietCeiling = Math.max(1, Math.floor(total * 0.01));
  const quiet = hours.map((c) => c <= quietCeiling);
  let best = { from: 0, len: 0 };
  let run = 0;
  // walk two laps so runs crossing midnight are seen whole
  for (let i = 0; i < 48; i++) {
    if (quiet[i % 24]) {
      run = Math.min(run + 1, 24);
      if (run > best.len) best = { from: (i - run + 1 + 24) % 24, len: run };
    } else {
      run = 0;
    }
  }
  if (best.len < 4) return null;
  return {
    from: best.from,
    to: (best.from + best.len) % 24,
    hours: best.len,
  };
}

export function computeHolter(
  sample: HolterSample,
  tzMinutes = 0,
): HolterStats {
  const shift = Math.round(tzMinutes / 60);
  const hours = sample.utcHours.map(
    (_, i) => sample.utcHours[(((i - shift) % 24) + 24) % 24],
  );
  const total = sample.totalEvents;

  let peakHour: number | null = null;
  for (let h = 0; h < 24; h++) {
    if (hours[h] > 0 && (peakHour === null || hours[h] > hours[peakHour])) {
      peakHour = h;
    }
  }

  const windowDays =
    sample.oldest && sample.newest
      ? Math.max(
          1,
          Math.round(
            (Date.parse(sample.newest) - Date.parse(sample.oldest)) /
              86_400_000,
          ),
        )
      : 0;

  return {
    hours,
    totalEvents: total,
    windowDays,
    peakHour,
    nightPct: Math.round(share(hours, NIGHT, total)),
    sleep: sleepWindow(hours, total),
    chronotype: diagnose(hours, total),
    tzMinutes,
  };
}
