import type { GithubData } from "./github";

export type PulseState =
  | "radiant"
  | "steady"
  | "fading"
  | "critical"
  | "flatline"
  | "revived";

export interface Pulse {
  login: string;
  name: string;
  state: PulseState;
  /** 0 when flatlined */
  bpm: number;
  weekly: number;
  streak: number;
  daysSinceBeat: number;
  lastBeatDate: string | null;
  bloodType: string;
  /** last 14 days, normalized 0..1 (0 = no commits that day) */
  beats: number[];
  /** same window as beats, raw contribution counts */
  dayCounts: number[];
  totalContributions: number;
  stars: number;
  prs: number;
  issues: number;
  reviews: number;
  /** deterministic per-user fingerprint seed, 0..1 values */
  fingerprint: { jitter: number; tWave: number; pWave: number };
  /** true when the rhythm looks machine-regular (cron bot, not a heart) */
  pacemaker: boolean;
  partial: boolean;
}

const FLATLINE_DAYS = 14;
const REVIVED_WINDOW_DAYS = 2;
export const DEFAULT_BEAT_WINDOW = 14;
export const MIN_BEAT_WINDOW = 7;
export const MAX_BEAT_WINDOW = 30;

const LANG_ABBREV: Record<string, string> = {
  TypeScript: "TS",
  JavaScript: "JS",
  Python: "PY",
  Rust: "RS",
  Go: "GO",
  Swift: "SW",
  Kotlin: "KT",
  Java: "JV",
  "C#": "CS",
  "C++": "CPP",
  C: "C",
  Ruby: "RB",
  PHP: "PHP",
  Dart: "DR",
  Elixir: "EX",
  Haskell: "HS",
  Lua: "LU",
  Scala: "SC",
  Shell: "SH",
  Zig: "ZG",
  HTML: "HT",
  CSS: "CSS",
  Vue: "VUE",
  Svelte: "SV",
  "Jupyter Notebook": "NB",
  "Objective-C": "OC",
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(`${isoA}T00:00:00Z`).getTime();
  const b = new Date(`${isoB}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export const PULSE_STATES: PulseState[] = [
  "radiant",
  "steady",
  "fading",
  "critical",
  "flatline",
  "revived",
];

/** Force a display state — used by the ?state= preview param so people can see
 *  FLATLINE/REVIVED without actually dying for two weeks. */
export function forceState(pulse: Pulse, state: PulseState): Pulse {
  const forced: Pulse = { ...pulse, state };
  switch (state) {
    case "flatline":
      forced.bpm = 0;
      forced.daysSinceBeat = Math.max(pulse.daysSinceBeat, 16);
      break;
    case "revived":
      forced.bpm = Math.max(pulse.bpm, 72);
      forced.daysSinceBeat = 0;
      break;
    case "radiant":
      forced.bpm = Math.max(pulse.bpm, 96);
      forced.daysSinceBeat = 0;
      break;
    case "steady":
      forced.daysSinceBeat = Math.min(Math.max(pulse.daysSinceBeat, 2), 3);
      break;
    case "fading":
      forced.daysSinceBeat = Math.min(Math.max(pulse.daysSinceBeat, 5), 7);
      break;
    case "critical":
      forced.daysSinceBeat = Math.min(Math.max(pulse.daysSinceBeat, 9), 13);
      break;
  }
  if (state !== "flatline" && forced.bpm === 0) forced.bpm = 60;
  if (state !== "flatline" && forced.beats.every((b) => b === 0)) {
    forced.beats = [0.5, 0, 0.8, 0.4, 0, 1, 0.6, 0, 0.7, 0.3, 0, 0.9, 0.5, 0.8];
  }
  return forced;
}

/**
 * A real heart has variance. A cron bot commits the same small number of times
 * nearly every single day — flag that rhythm as machine-paced. Conservative on
 * purpose: needs a near-full window of active days AND one dominant small count.
 */
export function detectPacemaker(counts: number[]): boolean {
  if (counts.length < 10) return false;
  const active = counts.filter((c) => c > 0);
  if (active.length < 10 || active.length / counts.length < 0.9) return false;
  const freq = new Map<number, number>();
  for (const c of active) freq.set(c, (freq.get(c) ?? 0) + 1);
  const [mode, modeCount] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  return mode <= 4 && modeCount / active.length >= 0.85;
}

export function computePulse(
  data: GithubData,
  now = new Date(),
  beatWindow = DEFAULT_BEAT_WINDOW,
): Pulse {
  const today = now.toISOString().slice(0, 10);
  const days = data.days;

  const activeDays = days.filter((d) => d.count > 0);
  const lastActive = activeDays.at(-1) ?? null;
  const daysSinceBeat = lastActive
    ? Math.max(0, daysBetween(lastActive.date, today))
    : Number.POSITIVE_INFINITY;

  // Revived: beating again within the last 2 days after a gap of >= FLATLINE_DAYS.
  let revived = false;
  if (lastActive && daysSinceBeat <= REVIVED_WINDOW_DAYS && activeDays.length >= 2) {
    const previous = activeDays.at(-2);
    if (previous && daysBetween(previous.date, lastActive.date) >= FLATLINE_DAYS) {
      revived = true;
    }
  }

  let state: PulseState;
  if (revived) state = "revived";
  else if (daysSinceBeat <= 1) state = "radiant";
  else if (daysSinceBeat <= 3) state = "steady";
  else if (daysSinceBeat <= 7) state = "fading";
  else if (daysSinceBeat < FLATLINE_DAYS) state = "critical";
  else state = "flatline";

  const weekly = days.slice(-7).reduce((a, d) => a + d.count, 0);
  const bpm =
    state === "flatline"
      ? 0
      : Math.min(180, Math.max(36, Math.round(36 + weekly * 3)));

  // Streak of consecutive active days, allowed to end today or yesterday.
  let streak = 0;
  if (daysSinceBeat <= 1 && days.length > 0) {
    for (let i = days.length - 1; i >= 0; i--) {
      const d = days[i];
      if (daysBetween(d.date, today) < daysSinceBeat) continue;
      if (d.count > 0) streak++;
      else break;
    }
  }

  const topLang = data.topLanguages[0]?.name;
  const abbrev = topLang
    ? (LANG_ABBREV[topLang] ?? topLang.slice(0, 2).toUpperCase())
    : "??";
  const bloodType = `${abbrev}${weekly > 0 ? "+" : "-"}`;

  const window = days.slice(-beatWindow);
  const max = Math.max(1, ...window.map((d) => d.count));
  const beats = window.map((d) => (d.count === 0 ? 0 : d.count / max));

  const seed = hashString(data.login.toLowerCase());
  const fingerprint = {
    jitter: ((seed & 0xff) / 255) * 0.8 + 0.2,
    tWave: (((seed >> 8) & 0xff) / 255) * 0.9 + 0.1,
    pWave: (((seed >> 16) & 0xff) / 255) * 0.9 + 0.1,
  };

  return {
    login: data.login,
    name: data.name ?? data.login,
    state,
    bpm,
    weekly,
    streak,
    daysSinceBeat: Number.isFinite(daysSinceBeat) ? daysSinceBeat : 999,
    lastBeatDate: lastActive?.date ?? null,
    bloodType,
    beats,
    dayCounts: window.map((d) => d.count),
    totalContributions: data.totalContributions,
    stars: data.stars,
    prs: data.prs,
    issues: data.issues,
    reviews: data.reviews,
    fingerprint,
    pacemaker: detectPacemaker(window.map((d) => d.count)),
    partial: data.partial,
  };
}
