import type { Pulse, PulseState } from "./pulse";
import type { Theme } from "./themes";

const W = 520;
const H = 190;
const WAVE_X0 = 26;
const WAVE_X1 = 494;
const BASELINE = 92;
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

function wavePath(pulse: Pulse): string {
  const { beats, fingerprint: fp, state } = pulse;
  if (state === "flatline" || beats.every((b) => b === 0)) {
    return `M${WAVE_X0} ${BASELINE} H${WAVE_X1}`;
  }
  const seg = (WAVE_X1 - WAVE_X0) / beats.length;
  let d = `M${WAVE_X0} ${BASELINE}`;
  beats.forEach((amp, i) => {
    if (amp === 0) {
      d += ` h${round(seg)}`;
      return;
    }
    // Per-user fingerprint: P/T-wave size and a deterministic beat jitter.
    const jitter = fp.jitter * (i % 2 === 0 ? 1 : -1) * 2;
    const complex = 24;
    const lead = Math.max(0, (seg - complex) / 2 + jitter);
    const tail = Math.max(0, seg - complex - lead);
    const a = round(8 + amp * 36);
    d += ` h${round(lead)}`;
    d += ` q3 ${round(-4 * fp.pWave)} 6 0`; // P wave
    d += ` l2 3 l4 ${-a} l4 ${round(a + 10)} l2 -10`; // QRS complex
    d += ` q3 ${round(-7 * fp.tWave)} 6 0`; // T wave
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

export function renderCard(pulse: Pulse, theme: Theme): string {
  const look = STATE_LOOK[pulse.state];
  const stateColor = look.color(theme);
  const alive = pulse.state !== "flatline";

  const period = alive ? 60 / pulse.bpm : 0;
  const sweepDur = alive ? Math.min(12, Math.max(3, period * 6)) : 0;
  const path = wavePath(pulse);
  const right = footerRight(pulse, theme);

  const strokeRef = theme.traceGradient ? "url(#gp-tg)" : theme.trace;
  const gradientDef = theme.traceGradient
    ? `<linearGradient id="gp-tg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${theme.traceGradient[0]}"/>
        <stop offset="0.5" stop-color="${theme.traceGradient[1]}"/>
        <stop offset="1" stop-color="${theme.traceGradient[2]}"/>
      </linearGradient>`
    : "";

  const pillLabel = look.label;
  const pillW = pillLabel.length * 6.6 + 20;
  const pillX = W - 26 - pillW;

  const bpmText = alive ? String(pulse.bpm) : "—";
  const statsLeft = [
    pulse.streak > 0 ? `⚡ ${pulse.streak}d streak` : null,
    pulse.bloodType,
    `${pulse.totalContributions} beats/yr`,
    pulse.stars > 0 ? `★ ${pulse.stars}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const anim = alive
    ? `.gp-sweep{animation:gp-sweep ${round(sweepDur)}s linear infinite}
       .gp-heart{animation:gp-thump ${round(period)}s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
       .gp-dot{animation:gp-blink 1.8s ease-in-out infinite}
       @keyframes gp-sweep{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
       @keyframes gp-thump{0%,100%{transform:scale(1)}15%{transform:scale(1.32)}30%{transform:scale(1)}}
       @keyframes gp-blink{50%{opacity:.25}}`
    : `.gp-flat{animation:gp-dim 3s ease-in-out infinite}
       @keyframes gp-dim{50%{opacity:.45}}`;

  const trace = alive
    ? `<path d="${path}" fill="none" stroke="${strokeRef}" stroke-width="1.6" opacity="0.22"/>
       <path class="gp-sweep" d="${path}" pathLength="1000" fill="none"
             stroke="${strokeRef}" stroke-width="2.2" stroke-linecap="round"
             stroke-dasharray="140 860" filter="url(#gp-glow)"/>`
    : `<path class="gp-flat" d="${path}" fill="none" stroke="${theme.danger}"
             stroke-width="1.8" filter="url(#gp-glow)"/>`;

  const revivedStamp =
    pulse.state === "revived"
      ? `<text x="${WAVE_X1 - 4}" y="62" text-anchor="end" font-family="${MONO}"
              font-size="11" font-weight="700" fill="${theme.trace}"
              filter="url(#gp-glow)">⚡ REVIVED</text>`
      : "";

  const title = `${pulse.login}'s pulse — ${
    alive ? `${pulse.bpm} bpm` : "flatlined"
  } (${look.label.toLowerCase()})`;
  const desc = `GitHub activity heartbeat for @${pulse.login}: ${pulse.weekly} contributions this week, ${pulse.totalContributions} in the last year.${
    pulse.partial ? " Based on recent public events only." : ""
  }`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
     viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="gp-title gp-desc">
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

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12"
        fill="${theme.bg}" stroke="${theme.grid}"/>
  <rect x="16" y="44" width="${W - 32}" height="84" fill="url(#gp-grid)" opacity="0.9"/>

  <text x="26" y="30" font-family="${MONO}" font-size="13" font-weight="600"
        fill="${theme.text}">@${esc(pulse.login)}</text>

  <rect x="${round(pillX)}" y="16" width="${round(pillW)}" height="19" rx="9.5"
        fill="none" stroke="${stateColor}" opacity="0.85"/>
  <text x="${round(pillX + pillW / 2)}" y="29" text-anchor="middle"
        font-family="${MONO}" font-size="10" font-weight="600"
        fill="${stateColor}" letter-spacing="1">${pillLabel}</text>

  ${trace}
  ${revivedStamp}

  <text class="gp-heart" x="26" y="168" font-family="${MONO}" font-size="16"
        fill="${alive ? theme.trace : theme.danger}">♥</text>
  <text x="46" y="168" font-family="${MONO}" font-size="22" font-weight="700"
        fill="${theme.text}">${bpmText}<tspan font-size="10" font-weight="400"
        fill="${theme.muted}" dx="4">bpm</tspan></text>

  <text x="130" y="166" font-family="${MONO}" font-size="10.5"
        fill="${theme.muted}">${esc(statsLeft)}</text>

  <text x="${W - 26}" y="166" text-anchor="end" font-family="${MONO}"
        font-size="10.5" fill="${right.color}"
        ${pulse.state === "radiant" && pulse.daysSinceBeat === 0 ? 'class="gp-dot"' : ""}>${esc(
          right.text,
        )}</text>
</svg>`;
}

export function renderErrorCard(login: string, theme: Theme): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
     viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub user ${esc(login)} not found">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12"
        fill="${theme.bg}" stroke="${theme.grid}"/>
  <path d="M${WAVE_X0} ${BASELINE} H${WAVE_X1}" fill="none"
        stroke="${theme.danger}" stroke-width="1.8" opacity="0.8"/>
  <text x="${W / 2}" y="140" text-anchor="middle" font-family="${MONO}"
        font-size="12" fill="${theme.muted}">patient not found: @${esc(login)}</text>
</svg>`;
}
