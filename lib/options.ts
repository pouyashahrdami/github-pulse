import {
  DEFAULT_BEAT_WINDOW,
  MIN_BEAT_WINDOW,
  MAX_BEAT_WINDOW,
  PULSE_STATES,
  type PulseState,
} from "./pulse";
import {
  DEFAULT_OPTIONS,
  HIDE_KEYS,
  WAVE_STYLES,
  type CardOptions,
  type CardSize,
  type HideKey,
  type WaveStyle,
} from "./card";

export const SIZES: CardSize[] = ["card", "wide", "compact", "badge", "monitor"];

export function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = raw === null ? NaN : Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function parseOptions(search: URLSearchParams): CardOptions {
  const sizeRaw = search.get("size");
  const size = SIZES.includes(sizeRaw as CardSize)
    ? (sizeRaw as CardSize)
    : DEFAULT_OPTIONS.size;

  const speedRaw = Number.parseFloat(search.get("speed") ?? "");
  const speed = Number.isFinite(speedRaw)
    ? Math.min(3, Math.max(0.25, speedRaw))
    : DEFAULT_OPTIONS.speed;

  const hide = new Set<HideKey>(
    (search.get("hide") ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter((k): k is HideKey => (HIDE_KEYS as string[]).includes(k)),
  );

  const label = search.get("label")?.slice(0, 32) || undefined;

  const waveRaw = search.get("wave");
  const wave = (WAVE_STYLES as string[]).includes(waveRaw ?? "")
    ? (waveRaw as WaveStyle)
    : DEFAULT_OPTIONS.wave;

  return {
    size,
    radius: clampInt(search.get("radius"), 0, 24, DEFAULT_OPTIONS.radius),
    grid: search.get("grid") !== "0",
    glow: search.get("glow") !== "0",
    anim: search.get("anim") !== "0",
    speed,
    label,
    hide,
    wave,
  };
}

export function parseState(search: URLSearchParams): PulseState | null {
  const raw = search.get("state");
  return raw && (PULSE_STATES as string[]).includes(raw)
    ? (raw as PulseState)
    : null;
}

export function parseDays(search: URLSearchParams): number {
  return clampInt(
    search.get("days"),
    MIN_BEAT_WINDOW,
    MAX_BEAT_WINDOW,
    DEFAULT_BEAT_WINDOW,
  );
}

/** ?tz= shifts the "today" boundary in hours (e.g. 3.5 for Tehran). */
export function parseNow(search: URLSearchParams): Date {
  const tzRaw = Number.parseFloat(search.get("tz") ?? "");
  const tzHours = Number.isFinite(tzRaw)
    ? Math.min(14, Math.max(-12, tzRaw))
    : 0;
  return new Date(Date.now() + tzHours * 3_600_000);
}
