import type { Pulse, PulseState } from "./pulse";
import type { Theme } from "./themes";

export type CardSize = "card" | "wide" | "compact";

export type HideKey = "pill" | "bpm" | "stats" | "status";
export const HIDE_KEYS: HideKey[] = ["pill", "bpm", "stats", "status"];

export interface CardOptions {
  size: CardSize;
  /** corner radius 0..24 */
  radius: number;
  grid: boolean;
  glow: boolean;
  /** false renders a fully static card (no CSS animation) */
  anim: boolean;
  /** animation speed multiplier 0.25..3 */
  speed: number;
  /** custom header text instead of @login */
  label?: string;
  hide: ReadonlySet<HideKey>;
}

export const DEFAULT_OPTIONS: CardOptions = {
  size: "card",
  radius: 12,
  grid: true,
  glow: true,
  anim: true,
  speed: 1,
  hide: new Set<HideKey>(),
};

interface Layout {
  w: number;
  h: number;
  waveX0: number;
  waveX1: number;
  baseline: number;
  ampMax: number;
  bandTop: number;
  bandH: number;
  headerY: number;
  pillY: number;
  footerY: number;
  /** x where the middle stats string starts; null hides it */
  statsX: number | null;
}

const LAYOUTS: Record<CardSize, Layout> = {
  card: {
    w: 520, h: 190, waveX0: 26, waveX1: 494, baseline: 92, ampMax: 36,
    bandTop: 44, bandH: 84, headerY: 30, pillY: 16, footerY: 168, statsX: 130,
  },
  wide: {
    w: 830, h: 150, waveX0: 26, waveX1: 804, baseline: 74, ampMax: 30,
    bandTop: 38, bandH: 72, headerY: 26, pillY: 12, footerY: 130, statsX: 150,
  },
  compact: {
    w: 340, h: 130, waveX0: 20, waveX1: 320, baseline: 66, ampMax: 22,
    bandTop: 38, bandH: 52, headerY: 26, pillY: 12, footerY: 112, statsX: null,
  },
};

const MONO =
  "ui-monospace,'SF Mono','Cascadia Code',Menlo,Consolas,monospace";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

interface StateLook {
  label: string;
  color: (t: Theme) => string;
}

const STATE_LOOK: Record<PulseState, StateLook> = {
  radiant: { label: "RADIANT", color: (t) => t.trace },
  steady: { label: "STEADY", color: (t) => t.trace },
  fading: { label: "FADING", color: (t) => t.warn },
  critical: { label: "CRITICAL", color: (t) => t.warn },
  flatline: { label: "FLATLINE", color: (t) => t.danger },
  revived: { label: "REVIVED", color: (t) => t.trace },
};

function wavePath(pulse: Pulse, lay: Layout): string {
  const { beats, fingerprint: fp, state } = pulse;
  if (state === "flatline" || beats.length === 0 || beats.every((b) => b === 0)) {
    return `M${lay.waveX0} ${lay.baseline} H${lay.waveX1}`;
  }
  const seg = (lay.waveX1 - lay.waveX0) / beats.length;
  const compact = seg < 30;
  let d = `M${lay.waveX0} ${lay.baseline}`;
  beats.forEach((amp, i) => {
    if (amp === 0) {
      d += ` h${round(seg)}`;
      return;
    }
    const jitter = fp.jitter * (i % 2 === 0 ? 1 : -1) * 2;
    const complex = compact ? 14 : 24;
    const lead = Math.max(0, (seg - complex) / 2 + jitter);
    const tail = Math.max(0, seg - complex - lead);
    const a = round(6 + amp * lay.ampMax);
    d += ` h${round(lead)}`;
    if (!compact) d += ` q3 ${round(-4 * fp.pWave)} 6 0`; // P wave
    d += ` l2 3 l4 ${-a} l4 ${round(a + 8)} l2 -8`; // QRS complex
    if (!compact) d += ` q3 ${round(-7 * fp.tWave)} 6 0`; // T wave
    d += ` h${round(tail)}`;
  });
  return d;
}

function footerRight(pulse: Pulse, theme: Theme): { text: string; color: string } {
  switch (pulse.state) {
    case "radiant":
      return pulse.daysSinceBeat === 0
        ? { text: "● beating now", color: theme.trace }
        : { text: "● beat yesterday", color: theme.trace };
    case "revived":
      return { text: "⚡ back from the dead", color: theme.trace };
    case "flatline":
      return {
        text: pulse.lastBeatDate
          ? `† last beat ${pulse.lastBeatDate}`
          : "† no recorded beats",
        color: theme.danger,
      };
    default:
      return {
        text: `last beat ${pulse.daysSinceBeat}d ago`,
        color: theme.muted,
      };
  }
}

export function renderCard(
  pulse: Pulse,
  theme: Theme,
  options: CardOptions = DEFAULT_OPTIONS,
): string {
  const lay = LAYOUTS[options.size];
  const look = STATE_LOOK[pulse.state];
  const stateColor = look.color(theme);
  const alive = pulse.state !== "flatline";

  const period = alive ? 60 / pulse.bpm / options.speed : 0;
  const sweepDur = alive ? Math.min(12, Math.max(3, period * 6)) : 0;
  const path = wavePath(pulse, lay);
  const right = footerRight(pulse, theme);
  const header = options.label?.trim() || `@${pulse.login}`;

  const strokeRef = theme.traceGradient ? "url(#gp-tg)" : theme.trace;
  const gradientDef = theme.traceGradient
    ? `<linearGradient id="gp-tg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${theme.traceGradient[0]}"/>
        <stop offset="0.5" stop-color="${theme.traceGradient[1]}"/>
        <stop offset="1" stop-color="${theme.traceGradient[2]}"/>
      </linearGradient>`
    : "";

  const glowFilter = options.glow ? 'filter="url(#gp-glow)"' : "";
  const pillLabel = look.label;
  const pillW = pillLabel.length * 6.6 + 20;
  const pillX = lay.w - lay.waveX0 - pillW;

  const bpmText = alive ? String(pulse.bpm) : "—";
  const statsLeft = [
    pulse.streak > 0 ? `⚡ ${pulse.streak}d streak` : null,
    pulse.bloodType,
    `${pulse.totalContributions} beats/yr`,
    pulse.stars > 0 ? `★ ${pulse.stars}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const anim = !options.anim
    ? ""
    : alive
      ? `.gp-sweep{animation:gp-sweep ${round(sweepDur)}s linear infinite}
       .gp-heart{animation:gp-thump ${round(period)}s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
       .gp-dot{animation:gp-blink 1.8s ease-in-out infinite}
       @keyframes gp-sweep{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
       @keyframes gp-thump{0%,100%{transform:scale(1)}15%{transform:scale(1.32)}30%{transform:scale(1)}}
       @keyframes gp-blink{50%{opacity:.25}}`
      : `.gp-flat{animation:gp-dim 3s ease-in-out infinite}
       @keyframes gp-dim{50%{opacity:.45}}`;

  const trace = !alive
    ? `<path class="gp-flat" d="${path}" fill="none" stroke="${theme.danger}"
             stroke-width="1.8" ${glowFilter}/>`
    : options.anim
      ? `<path d="${path}" fill="none" stroke="${strokeRef}" stroke-width="1.6" opacity="0.22"/>
       <path class="gp-sweep" d="${path}" pathLength="1000" fill="none"
             stroke="${strokeRef}" stroke-width="2.2" stroke-linecap="round"
             stroke-dasharray="140 860" ${glowFilter}/>`
      : `<path d="${path}" fill="none" stroke="${strokeRef}" stroke-width="2.2"
             stroke-linecap="round" ${glowFilter}/>`;

  const revivedStamp =
    pulse.state === "revived"
      ? `<text x="${lay.waveX1 - 4}" y="${lay.bandTop + 16}" text-anchor="end"
              font-family="${MONO}" font-size="11" font-weight="700"
              fill="${theme.trace}" ${glowFilter}>⚡ REVIVED</text>`
      : "";

  const gridRect = options.grid
    ? `<rect x="${lay.waveX0 - 10}" y="${lay.bandTop}" width="${
        lay.waveX1 - lay.waveX0 + 20
      }" height="${lay.bandH}" fill="url(#gp-grid)" opacity="0.9"/>`
    : "";

  const statsText =
    lay.statsX !== null && !options.hide.has("stats") && alive
      ? `<text x="${lay.statsX}" y="${lay.footerY - 2}" font-family="${MONO}"
           font-size="10.5" fill="${theme.muted}">${esc(statsLeft)}</text>`
      : "";

  const pill = options.hide.has("pill")
    ? ""
    : `<rect x="${round(pillX)}" y="${lay.pillY}" width="${round(pillW)}" height="19"
        rx="9.5" fill="none" stroke="${stateColor}" opacity="0.85"/>
  <text x="${round(pillX + pillW / 2)}" y="${lay.pillY + 13}" text-anchor="middle"
        font-family="${MONO}" font-size="10" font-weight="600"
        fill="${stateColor}" letter-spacing="1">${pillLabel}</text>`;

  const bpmCluster = options.hide.has("bpm")
    ? ""
    : `<text class="gp-heart" x="${lay.waveX0}" y="${lay.footerY}" font-family="${MONO}"
        font-size="16" fill="${alive ? theme.trace : theme.danger}">♥</text>
  <text x="${lay.waveX0 + 20}" y="${lay.footerY}" font-family="${MONO}"
        font-size="22" font-weight="700" fill="${theme.text}">${bpmText}<tspan
        font-size="10" font-weight="400" fill="${theme.muted}" dx="4">bpm</tspan></text>`;

  const statusText = options.hide.has("status")
    ? ""
    : `<text x="${lay.w - lay.waveX0}" y="${lay.footerY - 2}" text-anchor="end"
        font-family="${MONO}" font-size="10.5" fill="${right.color}"
        ${pulse.state === "radiant" && pulse.daysSinceBeat === 0 ? 'class="gp-dot"' : ""}>${esc(
          right.text,
        )}</text>`;

  const title = `${pulse.login}'s pulse — ${
    alive ? `${pulse.bpm} bpm` : "flatlined"
  } (${look.label.toLowerCase()})`;
  const desc = `GitHub activity heartbeat for @${pulse.login}: ${pulse.weekly} contributions this week, ${pulse.totalContributions} in the last year.${
    pulse.partial ? " Based on recent public events only." : ""
  }`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lay.w}" height="${lay.h}"
     viewBox="0 0 ${lay.w} ${lay.h}" role="img" aria-labelledby="gp-title gp-desc">
  <title id="gp-title">${esc(title)}</title>
  <desc id="gp-desc">${esc(desc)}</desc>
  <style>${anim}</style>
  <defs>
    ${gradientDef}
    <filter id="gp-glow" x="-20%" y="-40%" width="140%" height="180%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="gp-grid" width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M26 0H0V26" fill="none" stroke="${theme.grid}" stroke-width="1"/>
    </pattern>
  </defs>

  <rect x="0.5" y="0.5" width="${lay.w - 1}" height="${lay.h - 1}"
        rx="${options.radius}" fill="${theme.bg}" stroke="${theme.grid}"/>
  ${gridRect}

  <text x="${lay.waveX0}" y="${lay.headerY}" font-family="${MONO}" font-size="13"
        font-weight="600" fill="${theme.text}">${esc(header)}</text>

  ${pill}
  ${trace}
  ${revivedStamp}
  ${bpmCluster}
  ${statsText}
  ${statusText}
</svg>`;
}

export function renderErrorCard(
  login: string,
  theme: Theme,
  options: CardOptions = DEFAULT_OPTIONS,
): string {
  const lay = LAYOUTS[options.size];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lay.w}" height="${lay.h}"
     viewBox="0 0 ${lay.w} ${lay.h}" role="img" aria-label="GitHub user ${esc(login)} not found">
  <rect x="0.5" y="0.5" width="${lay.w - 1}" height="${lay.h - 1}"
        rx="${options.radius}" fill="${theme.bg}" stroke="${theme.grid}"/>
  <path d="M${lay.waveX0} ${lay.baseline} H${lay.waveX1}" fill="none"
        stroke="${theme.danger}" stroke-width="1.8" opacity="0.8"/>
  <text x="${lay.w / 2}" y="${lay.footerY - 22}" text-anchor="middle"
        font-family="${MONO}" font-size="12" fill="${theme.muted}">patient not found: @${esc(
          login,
        )}</text>
</svg>`;
}
