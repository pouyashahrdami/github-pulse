import type { Pulse, PulseState } from "./pulse";
import type { Theme } from "./themes";

export type CardSize = "card" | "wide" | "compact" | "badge" | "monitor";

export type HideKey = "pill" | "bpm" | "stats" | "status" | "header";
export const HIDE_KEYS: HideKey[] = ["pill", "bpm", "stats", "status", "header"];

export type WaveStyle = "ecg" | "smooth" | "bars";
export const WAVE_STYLES: WaveStyle[] = ["ecg", "smooth", "bars"];

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
  wave: WaveStyle;
  /** rendered width: px (200..1600) or "full" to stretch to the container */
  width?: number | "full";
  /** per-state pill text overrides, e.g. { radiant: "ON FIRE" } */
  stateLabels?: Partial<Record<PulseState, string>>;
  /** CRT scanline overlay */
  scanlines: boolean;
}

export const DEFAULT_OPTIONS: CardOptions = {
  size: "card",
  radius: 12,
  grid: true,
  glow: true,
  anim: true,
  speed: 1,
  hide: new Set<HideKey>(),
  wave: "ecg",
  scanlines: false,
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
  badge: {
    w: 260, h: 70, waveX0: 104, waveX1: 246, baseline: 40, ampMax: 13,
    bandTop: 18, bandH: 40, headerY: 20, pillY: 8, footerY: 48, statsX: null,
  },
  monitor: {
    w: 830, h: 260, waveX0: 26, waveX1: 636, baseline: 118, ampMax: 42,
    bandTop: 56, bandH: 118, headerY: 32, pillY: 18, footerY: 242, statsX: null,
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

function wavePath(pulse: Pulse, lay: Layout, style: WaveStyle = "ecg"): string {
  const { beats, fingerprint: fp, state } = pulse;
  if (state === "flatline" || beats.length === 0 || beats.every((b) => b === 0)) {
    return `M${lay.waveX0} ${lay.baseline} H${lay.waveX1}`;
  }
  const seg = (lay.waveX1 - lay.waveX0) / beats.length;
  if (style === "smooth") {
    // Soft rolling aura-wave: one rounded swell per active day.
    let d = `M${lay.waveX0} ${lay.baseline}`;
    beats.forEach((amp) => {
      if (amp === 0) {
        d += ` h${round(seg)}`;
        return;
      }
      const h = round(6 + amp * lay.ampMax * 1.15);
      d += ` q${round(seg / 2)} ${-h} ${round(seg)} 0`;
    });
    return d;
  }
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

/** Equalizer-style bars: one per day, pulsing from the baseline. */
function barsMarkup(
  pulse: Pulse,
  lay: Layout,
  theme: Theme,
  options: CardOptions,
): string {
  const beats = pulse.beats;
  const seg = (lay.waveX1 - lay.waveX0) / beats.length;
  const bw = Math.min(10, Math.max(3, seg * 0.45));
  const rects = beats
    .map((amp, i) => {
      const h = amp === 0 ? 3 : round(4 + amp * lay.ampMax * 1.25);
      const x = round(lay.waveX0 + i * seg + (seg - bw) / 2);
      const y = round(lay.baseline - h);
      const cls =
        options.anim && amp > 0
          ? ` class="gp-eq" style="animation-delay:${(-i * 0.13).toFixed(2)}s"`
          : "";
      return `<rect${cls} x="${x}" y="${y}" width="${round(bw)}" height="${h}" rx="1.5" fill="${theme.trace}" opacity="${amp === 0 ? 0.25 : 0.85}"/>`;
    })
    .join("");
  return `<line x1="${lay.waveX0}" y1="${lay.baseline + 1}" x2="${lay.waveX1}" y2="${lay.baseline + 1}" stroke="${theme.trace}" stroke-width="1" opacity="0.3"/>${rects}`;
}

const EQ_CSS = (speed: number) =>
  `.gp-eq{animation:gp-eq ${round(1.6 / speed)}s ease-in-out infinite;transform-box:fill-box;transform-origin:center bottom}
   @keyframes gp-eq{0%,100%{transform:scaleY(.7)}50%{transform:scaleY(1.06)}}`;

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

function renderBadge(
  pulse: Pulse,
  theme: Theme,
  options: CardOptions,
): string {
  const lay = LAYOUTS.badge;
  const look = STATE_LOOK[pulse.state];
  const stateColor = look.color(theme);
  const alive = pulse.state !== "flatline";

  const period = alive ? 60 / pulse.bpm / options.speed : 0;
  const sweepDur = alive ? Math.min(10, Math.max(2.5, period * 4)) : 0;
  const path = wavePath(
    { ...pulse, beats: pulse.beats.slice(-7) },
    lay,
    options.wave,
  );
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
  const bpmText = alive ? String(pulse.bpm) : "—";

  const anim = !options.anim
    ? ""
    : alive
      ? `.gp-sweep{animation:gp-sweep ${round(sweepDur)}s linear infinite}
       .gp-heart{animation:gp-thump ${round(period)}s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
       .gp-dot{animation:gp-blink 1.8s ease-in-out infinite}
       @keyframes gp-sweep{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
       @keyframes gp-thump{0%,100%{transform:scale(1)}15%{transform:scale(1.32)}30%{transform:scale(1)}}
       @keyframes gp-blink{50%{opacity:.25}}${options.wave === "bars" ? EQ_CSS(options.speed) : ""}`
      : `.gp-flat{animation:gp-dim 3s ease-in-out infinite}
       @keyframes gp-dim{50%{opacity:.45}}`;

  const trace = !alive
    ? `<path class="gp-flat" d="${path}" fill="none" stroke="${theme.danger}"
             stroke-width="1.6" ${glowFilter}/>`
    : options.wave === "bars"
      ? barsMarkup({ ...pulse, beats: pulse.beats.slice(-7) }, lay, theme, options)
      : options.anim
      ? `<path d="${path}" fill="none" stroke="${strokeRef}" stroke-width="1.4" opacity="0.22"/>
       <path class="gp-sweep" d="${path}" pathLength="1000" fill="none"
             stroke="${strokeRef}" stroke-width="1.8" stroke-linecap="round"
             stroke-dasharray="140 860" ${glowFilter}/>`
      : `<path d="${path}" fill="none" stroke="${strokeRef}" stroke-width="1.8"
             stroke-linecap="round" ${glowFilter}/>`;

  const liveNow = pulse.state === "radiant" && pulse.daysSinceBeat === 0;
  const title = `${pulse.login}'s pulse — ${
    alive ? `${pulse.bpm} bpm` : "flatlined"
  }`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lay.w}" height="${lay.h}"
     viewBox="0 0 ${lay.w} ${lay.h}" role="img" aria-label="${esc(title)}">
  <style>${anim}</style>
  <defs>
    ${gradientDef}
    <filter id="gp-glow" x="-20%" y="-40%" width="140%" height="180%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0.5" y="0.5" width="${lay.w - 1}" height="${lay.h - 1}"
        rx="${Math.min(options.radius, lay.h / 2)}" fill="${theme.bg}" stroke="${theme.border ?? theme.grid}"/>
  ${
    options.hide.has("header")
      ? ""
      : `<text x="14" y="${lay.headerY}" font-family="${MONO}" font-size="10.5"
        fill="${theme.muted}">${esc(header)}</text>`
  }
  <circle cx="${lay.w - 16}" cy="16" r="4" fill="${stateColor}"
          ${liveNow ? 'class="gp-dot"' : ""}/>
  <text class="gp-heart" x="14" y="${lay.footerY}" font-family="${MONO}"
        font-size="13" fill="${alive ? theme.trace : theme.danger}">♥</text>
  <text x="30" y="${lay.footerY}" font-family="${MONO}" font-size="18"
        font-weight="700" fill="${theme.text}">${bpmText}<tspan font-size="9"
        font-weight="400" fill="${theme.muted}" dx="3">bpm</tspan></text>
  ${trace}
  ${scanlineOverlay(lay, options)}
</svg>`;
}

function bumpsPath(
  x0: number,
  x1: number,
  y: number,
  n: number,
  h: number,
): string {
  if (n <= 0) return `M${x0} ${y} H${x1}`;
  const seg = (x1 - x0) / n;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < n; i++) d += ` q${round(seg / 2)} ${-h} ${round(seg)} 0`;
  return d;
}

function teethPath(
  x0: number,
  x1: number,
  y: number,
  n: number,
  h: number,
): string {
  if (n <= 0) return `M${x0} ${y} H${x1}`;
  const seg = (x1 - x0) / n;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < n; i++)
    d += ` h${round(seg - 12)} l6 ${-h} l6 ${h}`;
  return d;
}

function renderMonitor(
  pulse: Pulse,
  theme: Theme,
  options: CardOptions,
): string {
  const lay = LAYOUTS.monitor;
  const look = STATE_LOOK[pulse.state];
  const stateColor = look.color(theme);
  const alive = pulse.state !== "flatline";

  const period = alive ? 60 / pulse.bpm / options.speed : 0;
  const sweepDur = alive ? Math.min(12, Math.max(3, period * 6)) : 0;
  const path = wavePath(pulse, lay, options.wave);
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

  const mrgN = Math.min(10, Math.ceil(pulse.prs / 2));
  const revN = Math.min(12, Math.ceil(pulse.reviews / 2));
  const mrgPath = bumpsPath(lay.waveX0, lay.waveX1, 202, mrgN, 12);
  const revPath = teethPath(lay.waveX0, lay.waveX1, 234, revN, 10);

  const anim = !options.anim
    ? ""
    : alive
      ? `.gp-sweep{animation:gp-sweep ${round(sweepDur)}s linear infinite}
       .gp-sweep2{animation:gp-sweep ${round(sweepDur * 1.6)}s linear infinite}
       .gp-sweep3{animation:gp-sweep ${round(sweepDur * 2.2)}s linear infinite}
       .gp-heart{animation:gp-thump ${round(period)}s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
       .gp-dot{animation:gp-blink 1.8s ease-in-out infinite}
       @keyframes gp-sweep{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
       @keyframes gp-thump{0%,100%{transform:scale(1)}15%{transform:scale(1.32)}30%{transform:scale(1)}}
       @keyframes gp-blink{50%{opacity:.25}}${options.wave === "bars" ? EQ_CSS(options.speed) : ""}`
      : `.gp-flat{animation:gp-dim 3s ease-in-out infinite}
       @keyframes gp-dim{50%{opacity:.45}}`;

  const mainTrace = !alive
    ? `<path class="gp-flat" d="${path}" fill="none" stroke="${theme.danger}"
             stroke-width="1.8" ${glowFilter}/>`
    : options.wave === "bars"
      ? barsMarkup(pulse, lay, theme, options)
      : options.anim
      ? `<path d="${path}" fill="none" stroke="${strokeRef}" stroke-width="1.6" opacity="0.22"/>
       <path class="gp-sweep" d="${path}" pathLength="1000" fill="none"
             stroke="${strokeRef}" stroke-width="2.2" stroke-linecap="round"
             stroke-dasharray="140 860" ${glowFilter}/>`
      : `<path d="${path}" fill="none" stroke="${strokeRef}" stroke-width="2.2"
             stroke-linecap="round" ${glowFilter}/>`;

  const subTrace = (
    d: string,
    color: string,
    cls: string,
  ) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.16"/>
    ${
      options.anim && alive
        ? `<path class="${cls}" d="${d}" pathLength="1000" fill="none"
             stroke="${color}" stroke-width="1.5" stroke-linecap="round"
             stroke-dasharray="90 910" opacity="0.85"/>`
        : `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5"
             stroke-linecap="round" opacity="0.6"/>`
    }`;

  const vitalsX = 664;
  const vital = (
    y: number,
    label: string,
    value: string,
    color: string,
    extra = "",
  ) => `<text x="${vitalsX}" y="${y}" font-family="${MONO}" font-size="9.5"
        letter-spacing="1.5" fill="${theme.muted}">${label}</text>
  <text x="${vitalsX}" y="${y + 26}" font-family="${MONO}" font-size="24"
        font-weight="700" fill="${color}">${esc(value)}${extra}</text>`;

  const bpmText = alive ? String(pulse.bpm) : "—";
  const pillLabel = options.stateLabels?.[pulse.state] ?? look.label;
  const pillW = pillLabel.length * 6.6 + 20;
  const pillX = lay.w - 26 - pillW;

  const title = `${pulse.login}'s pulse monitor — ${
    alive ? `${pulse.bpm} bpm` : "flatlined"
  } (${pillLabel.toLowerCase()})`;
  const desc = `GitHub vitals for @${pulse.login}: ${pulse.bpm} bpm, ${pulse.prs} pull requests, ${pulse.reviews} reviews, ${pulse.streak}-day streak.${
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
        rx="${options.radius}" fill="${theme.bg}" stroke="${theme.border ?? theme.grid}"/>
  ${
    options.grid
      ? `<rect x="16" y="${lay.bandTop}" width="${lay.waveX1 - 6}" height="190"
        fill="url(#gp-grid)" opacity="0.9"/>`
      : ""
  }

  ${
    options.hide.has("header")
      ? ""
      : `<text x="${lay.waveX0}" y="${lay.headerY}" font-family="${MONO}" font-size="10.5"
        letter-spacing="2" fill="${theme.muted}">PULSE/ONE · PATIENT ${esc(
          header.toUpperCase(),
        )} · LEAD: MAIN</text>`
  }

  <rect x="${round(pillX)}" y="${lay.pillY}" width="${round(pillW)}" height="19"
        rx="9.5" fill="none" stroke="${stateColor}" opacity="0.85"/>
  <text x="${round(pillX + pillW / 2)}" y="${lay.pillY + 13}" text-anchor="middle"
        font-family="${MONO}" font-size="10" font-weight="600"
        fill="${stateColor}" letter-spacing="1">${esc(pillLabel)}</text>

  ${mainTrace}
  ${subTrace(mrgPath, theme.accent, "gp-sweep2")}
  ${subTrace(revPath, theme.warn, "gp-sweep3")}

  <line x1="650" y1="52" x2="650" y2="${lay.footerY}" stroke="${theme.grid}"/>

  ${vital(
    76,
    "HEART RATE",
    bpmText,
    alive ? theme.trace : theme.danger,
    `<tspan font-size="11" font-weight="400" fill="${theme.muted}" dx="4">bpm</tspan>`,
  )}
  <text class="gp-heart" x="${lay.w - 44}" y="102" font-family="${MONO}"
        font-size="18" fill="${alive ? theme.trace : theme.danger}">♥</text>
  ${vital(126, "MERGES / YR", String(pulse.prs), theme.accent)}
  ${vital(176, "REVIEWS / YR", String(pulse.reviews), theme.warn)}
  ${vital(
    226,
    "STREAK · TYPE",
    `${pulse.streak}d`,
    theme.text,
    `<tspan fill="${theme.muted}" font-size="16" dx="8">${esc(pulse.bloodType)}</tspan>`,
  )}

  <text x="${lay.waveX0}" y="${lay.footerY}" font-family="${MONO}"
        font-size="10.5" fill="${right.color}"
        ${pulse.state === "radiant" && pulse.daysSinceBeat === 0 ? 'class="gp-dot"' : ""}>${esc(
          right.text,
        )}</text>
  ${scanlineOverlay(lay, options)}
</svg>`;
}

/** ?scanlines=1: CRT horizontal-line overlay drawn above everything else. */
function scanlineOverlay(lay: Layout, options: CardOptions): string {
  if (!options.scanlines) return "";
  return `<pattern id="gp-scan" width="4" height="4" patternUnits="userSpaceOnUse">
    <rect width="4" height="2" fill="#000" opacity="0.16"/>
  </pattern>
  <rect x="0.5" y="0.5" width="${lay.w - 1}" height="${lay.h - 1}"
        rx="${options.radius}" fill="url(#gp-scan)"/>`;
}

/**
 * Rewrites the root <svg> width/height so the card renders at a custom width.
 * The viewBox is untouched, so the browser scales everything proportionally;
 * "full" drops the fixed height and stretches to the container (e.g. a README).
 */
function applyWidth(svg: string, width: CardOptions["width"]): string {
  if (width === undefined) return svg;
  return svg.replace(/width="(\d+)" height="(\d+)"/, (_, w, h) =>
    width === "full"
      ? `width="100%"`
      : `width="${width}" height="${Math.round((Number(h) / Number(w)) * width)}"`,
  );
}

export function renderCard(
  pulse: Pulse,
  theme: Theme,
  options: CardOptions = DEFAULT_OPTIONS,
): string {
  return applyWidth(renderCardAtSize(pulse, theme, options), options.width);
}

function renderCardAtSize(
  pulse: Pulse,
  theme: Theme,
  options: CardOptions,
): string {
  if (options.size === "badge") return renderBadge(pulse, theme, options);
  if (options.size === "monitor") return renderMonitor(pulse, theme, options);
  const lay = LAYOUTS[options.size];
  const look = STATE_LOOK[pulse.state];
  const stateColor = look.color(theme);
  const alive = pulse.state !== "flatline";

  const period = alive ? 60 / pulse.bpm / options.speed : 0;
  const sweepDur = alive ? Math.min(12, Math.max(3, period * 6)) : 0;
  const path = wavePath(pulse, lay, options.wave);
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
  const pillLabel = options.stateLabels?.[pulse.state] ?? look.label;
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
       @keyframes gp-blink{50%{opacity:.25}}${options.wave === "bars" ? EQ_CSS(options.speed) : ""}`
      : `.gp-flat{animation:gp-dim 3s ease-in-out infinite}
       @keyframes gp-dim{50%{opacity:.45}}`;

  const trace = !alive
    ? `<path class="gp-flat" d="${path}" fill="none" stroke="${theme.danger}"
             stroke-width="1.8" ${glowFilter}/>`
    : options.wave === "bars"
      ? barsMarkup(pulse, lay, theme, options)
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
        fill="${stateColor}" letter-spacing="1">${esc(pillLabel)}</text>`;

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
  } (${pillLabel.toLowerCase()})`;
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
        rx="${options.radius}" fill="${theme.bg}" stroke="${theme.border ?? theme.grid}"/>
  ${gridRect}

  ${
    options.hide.has("header")
      ? ""
      : `<text x="${lay.waveX0}" y="${lay.headerY}" font-family="${MONO}" font-size="13"
        font-weight="600" fill="${theme.text}">${esc(header)}</text>`
  }

  ${pill}
  ${trace}
  ${revivedStamp}
  ${bpmCluster}
  ${statsText}
  ${statusText}
  ${scanlineOverlay(lay, options)}
</svg>`;
}

export function renderErrorCard(
  login: string,
  theme: Theme,
  options: CardOptions = DEFAULT_OPTIONS,
): string {
  const lay = LAYOUTS[options.size];
  return applyWidth(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lay.w}" height="${lay.h}"
     viewBox="0 0 ${lay.w} ${lay.h}" role="img" aria-label="GitHub user ${esc(login)} not found">
  <rect x="0.5" y="0.5" width="${lay.w - 1}" height="${lay.h - 1}"
        rx="${options.radius}" fill="${theme.bg}" stroke="${theme.border ?? theme.grid}"/>
  <path d="M${lay.waveX0} ${lay.baseline} H${lay.waveX1}" fill="none"
        stroke="${theme.danger}" stroke-width="1.8" opacity="0.8"/>
  <text x="${lay.w / 2}" y="${lay.footerY - 22}" text-anchor="middle"
        font-family="${MONO}" font-size="12" fill="${theme.muted}">patient not found: @${esc(
          login,
        )}</text>
</svg>`,
    options.width,
  );
}
