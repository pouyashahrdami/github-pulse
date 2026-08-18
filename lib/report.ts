import type { DayCount } from "./github";

/**
 * Annual cardiology report — whole-window stats computed from the raw daily
 * calendar (365 days with a token, whatever the fallback window gives without
 * one). Pure math; the card renderer formats it.
 */

export interface ReportStats {
  windowDays: number;
  totalBeats: number;
  activeDays: number;
  longestStreak: number;
  longestFlatline: { days: number; from: string | null; to: string | null };
  busiest: { date: string; count: number } | null;
  /** share of beats landing on Sat/Sun, 0..100 */
  weekendPct: number;
  /** oldest → newest, for the year strip */
  counts: number[];
}

export function computeReport(days: DayCount[]): ReportStats {
  let totalBeats = 0;
  let activeDays = 0;
  let streak = 0;
  let longestStreak = 0;
  let gap = 0;
  let gapStart = -1;
  let longestFlatline: ReportStats["longestFlatline"] = {
    days: 0,
    from: null,
    to: null,
  };
  let busiest: ReportStats["busiest"] = null;
  let weekendBeats = 0;

  days.forEach((d, i) => {
    totalBeats += d.count;
    if (d.count > 0) {
      activeDays++;
      streak++;
      longestStreak = Math.max(longestStreak, streak);
      gap = 0;
      if (!busiest || d.count > busiest.count) {
        busiest = { date: d.date, count: d.count };
      }
      const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) weekendBeats += d.count;
    } else {
      if (gap === 0) gapStart = i;
      gap++;
      if (gap > longestFlatline.days) {
        longestFlatline = {
          days: gap,
          from: days[gapStart].date,
          to: d.date,
        };
      }
      streak = 0;
    }
  });

  return {
    windowDays: days.length,
    totalBeats,
    activeDays,
    longestStreak,
    longestFlatline,
    busiest,
    weekendPct: totalBeats
      ? Math.round((100 * weekendBeats) / totalBeats)
      : 0,
    counts: days.map((d) => d.count),
  };
}
