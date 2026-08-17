export interface Theme {
  /** card background; "none" renders transparent */
  bg: string;
  /** card border; defaults to grid color, "none" hides it */
  border?: string;
  /** main trace color (ignored when traceGradient is set) */
  trace: string;
  /** optional 3-stop gradient for the trace */
  traceGradient?: [string, string, string];
  grid: string;
  text: string;
  muted: string;
  accent: string;
  warn: string;
  danger: string;
}

export const THEMES: Record<string, Theme> = {
  aura: {
    bg: "#0B0819",
    trace: "#8B5CF6",
    traceGradient: ["#8B5CF6", "#2FD4EE", "#F26DB8"],
    grid: "rgba(139,92,246,0.10)",
    text: "#EDEBF6",
    muted: "#928DAD",
    accent: "#8B5CF6",
    warn: "#F5B84B",
    danger: "#FF5A66",
  },
  phosphor: {
    bg: "#050D08",
    trace: "#3BF07A",
    grid: "rgba(59,240,122,0.09)",
    text: "#D8E6DC",
    muted: "#7E948A",
    accent: "#3BF07A",
    warn: "#F5B84B",
    danger: "#FF5A66",
  },
  cyber: {
    bg: "#030B10",
    trace: "#2FD4EE",
    grid: "rgba(47,212,238,0.09)",
    text: "#D9EEF4",
    muted: "#7E98A3",
    accent: "#2FD4EE",
    warn: "#F5B84B",
    danger: "#FF5A66",
  },
  ember: {
    bg: "#120704",
    trace: "#FF8A4B",
    grid: "rgba(255,138,75,0.09)",
    text: "#F6E8E0",
    muted: "#A38B7E",
    accent: "#F5B84B",
    warn: "#F5B84B",
    danger: "#FF5A66",
  },
  rose: {
    bg: "#130711",
    trace: "#F26DB8",
    grid: "rgba(242,109,184,0.09)",
    text: "#F4E7F0",
    muted: "#A37E97",
    accent: "#F26DB8",
    warn: "#F5B84B",
    danger: "#FF5A66",
  },
  github: {
    bg: "#0D1117",
    trace: "#39D353",
    grid: "rgba(57,211,83,0.08)",
    text: "#E6EDF3",
    muted: "#7D8590",
    accent: "#39D353",
    warn: "#D29922",
    danger: "#F85149",
  },
  mono: {
    bg: "#101010",
    trace: "#FFFFFF",
    grid: "rgba(255,255,255,0.07)",
    text: "#F2F2F2",
    muted: "#8C8C8C",
    accent: "#FFFFFF",
    warn: "#F5B84B",
    danger: "#FF5A66",
  },
  paper: {
    bg: "#F6EFE3",
    trace: "#C4452F",
    grid: "rgba(196,69,47,0.14)",
    text: "#2A2118",
    muted: "#8A7B67",
    accent: "#C4452F",
    warn: "#A96A00",
    danger: "#C4452F",
  },
  dracula: {
    bg: "#282A36",
    trace: "#BD93F9",
    grid: "rgba(189,147,249,0.10)",
    text: "#F8F8F2",
    muted: "#8B90AD",
    accent: "#FF79C6",
    warn: "#F1FA8C",
    danger: "#FF5555",
  },
  tokyonight: {
    bg: "#1A1B26",
    trace: "#7AA2F7",
    grid: "rgba(122,162,247,0.10)",
    text: "#C0CAF5",
    muted: "#767FA6",
    accent: "#BB9AF7",
    warn: "#E0AF68",
    danger: "#F7768E",
  },
  catppuccin: {
    bg: "#1E1E2E",
    trace: "#CBA6F7",
    grid: "rgba(203,166,247,0.10)",
    text: "#CDD6F4",
    muted: "#8489AC",
    accent: "#F5C2E7",
    warn: "#F9E2AF",
    danger: "#F38BA8",
  },
  nord: {
    bg: "#2E3440",
    trace: "#88C0D0",
    grid: "rgba(136,192,208,0.10)",
    text: "#ECEFF4",
    muted: "#8791A3",
    accent: "#81A1C1",
    warn: "#EBCB8B",
    danger: "#BF616A",
  },
  gruvbox: {
    bg: "#282828",
    trace: "#FABD2F",
    grid: "rgba(250,189,47,0.10)",
    text: "#EBDBB2",
    muted: "#98917A",
    accent: "#FE8019",
    warn: "#FABD2F",
    danger: "#FB4934",
  },
};

export const DEFAULT_THEME = "aura";

const HEX_RE = /^[0-9a-fA-F]{3}([0-9a-fA-F]{1})?([0-9a-fA-F]{2})?([0-9a-fA-F]{2})?$/;

function sanitizeColor(value: string | null): string | null {
  if (!value) return null;
  if (value === "transparent") return "none";
  const v = value.replace(/^#/, "");
  if (HEX_RE.test(v) && [3, 4, 6, 8].includes(v.length)) return `#${v}`;
  return null;
}

/** ?theme=random resolves here: stable per seed per UTC day, reshuffles daily. */
function pickRandomTheme(seed: string): string {
  const day = Math.floor(Date.now() / 86_400_000);
  let h = 0;
  for (const c of `${seed}:${day}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const names = Object.keys(THEMES);
  return names[h % names.length];
}

/** Resolve a theme from query params: ?theme=<preset> plus per-color overrides. */
export function resolveTheme(params: URLSearchParams, seed = ""): Theme {
  const requested = params.get("theme") ?? DEFAULT_THEME;
  const name = requested === "random" ? pickRandomTheme(seed) : requested;
  const preset = THEMES[name] ?? THEMES[DEFAULT_THEME];
  const theme: Theme = { ...preset };

  const bg = sanitizeColor(params.get("bg"));
  const trace = sanitizeColor(params.get("color"));
  const text = sanitizeColor(params.get("text"));
  const accent = sanitizeColor(params.get("accent"));
  const muted = sanitizeColor(params.get("muted"));
  const borderRaw = params.get("border");
  const border =
    borderRaw === "0" ? "none" : sanitizeColor(borderRaw);

  if (bg) theme.bg = bg;
  if (border) theme.border = border;
  if (trace) {
    theme.trace = trace;
    delete theme.traceGradient; // a custom color always wins over the gradient
  }
  if (text) theme.text = text;
  if (accent) theme.accent = accent;
  if (muted) theme.muted = muted;
  return theme;
}
