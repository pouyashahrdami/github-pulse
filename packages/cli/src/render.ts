export type PulseState =
  | "radiant"
  | "steady"
  | "fading"
  | "critical"
  | "flatline"
  | "revived";

/** The slice of the /api/u and /api/r vitals object the CLI renders. */
export interface Vitals {
  login: string;
  state: PulseState;
  bpm: number;
  streak: number;
  daysSinceBeat: number;
  lastBeatDate: string | null;
  bloodType: string;
  dayCounts: number[];
  totalContributions: number;
  stars: number;
  pacemaker: boolean;
  partial: boolean;
}

const LEVELS = "▁▂▃▄▅▆▇█";

export function sparkline(counts: number[]): string {
  const max = Math.max(...counts, 1);
  return counts
    .map((c) => (c <= 0 ? LEVELS[0] : LEVELS[1 + Math.round((c / max) * 6)]))
    .join("");
}

export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const STATE_COLOR: Record<PulseState, string> = {
  radiant: "\x1b[92m",
  steady: "\x1b[96m",
  fading: "\x1b[93m",
  critical: "\x1b[91m",
  flatline: "\x1b[90m",
  revived: "\x1b[95m",
};

const STATE_ICON: Record<PulseState, string> = {
  radiant: "◉",
  steady: "●",
  fading: "◐",
  critical: "◌",
  flatline: "✝",
  revived: "⚡",
};

export function renderVitals(v: Vitals, color: boolean): string {
  const tint = (s: string, code: string) => (color ? `${code}${s}${RESET}` : s);
  const stateColor = STATE_COLOR[v.state] ?? "";

  const head = [
    `${STATE_ICON[v.state] ?? "●"} ${tint(`@${v.login}`, BOLD)}`,
    tint(v.state.toUpperCase(), stateColor + BOLD),
    `${v.bpm} bpm`,
    v.bloodType,
  ].join(" · ");

  const wave =
    v.state === "flatline"
      ? tint("─".repeat(Math.max(v.dayCounts.length, 1)), STATE_COLOR.flatline)
      : tint(sparkline(v.dayCounts), stateColor) +
        tint(` ${v.dayCounts.length}d`, DIM);

  const stats: string[] = [];
  if (v.state === "flatline") {
    stats.push(
      `last beat ${v.lastBeatDate ?? "never"}`,
      `${v.daysSinceBeat}d silent`,
    );
  } else if (v.streak > 0) {
    stats.push(`streak ${v.streak}d`);
  }
  stats.push(`${fmtCount(v.totalContributions)} beats/yr`, `★ ${fmtCount(v.stars)}`);
  if (v.pacemaker) stats.push("⚙ paced");
  if (v.partial) stats.push(tint("(partial data)", DIM));

  return [head, wave, stats.join(" · ")].join("\n");
}
