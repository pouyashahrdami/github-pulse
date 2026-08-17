import { NextRequest, NextResponse } from "next/server";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import {
  computePulse,
  forceState,
  DEFAULT_BEAT_WINDOW,
  MIN_BEAT_WINDOW,
  MAX_BEAT_WINDOW,
  PULSE_STATES,
  type PulseState,
} from "@/lib/pulse";
import {
  renderCard,
  renderErrorCard,
  DEFAULT_OPTIONS,
  HIDE_KEYS,
  WAVE_STYLES,
  type CardOptions,
  type CardSize,
  type HideKey,
  type WaveStyle,
} from "@/lib/card";
import { resolveTheme } from "@/lib/themes";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const SIZES: CardSize[] = ["card", "wide", "compact", "badge"];

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  // Short-ish edge cache: decay has to feel alive. Camo adds its own layer on top.
  "Cache-Control":
    "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
};

function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = raw === null ? NaN : Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseOptions(search: URLSearchParams): CardOptions {
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

function parseState(search: URLSearchParams): PulseState | null {
  const raw = search.get("state");
  return raw && (PULSE_STATES as string[]).includes(raw)
    ? (raw as PulseState)
    : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const search = req.nextUrl.searchParams;
  const theme = resolveTheme(search);
  const options = parseOptions(search);
  const days = clampInt(
    search.get("days"),
    MIN_BEAT_WINDOW,
    MAX_BEAT_WINDOW,
    DEFAULT_BEAT_WINDOW,
  );

  // ?tz= shifts the "today" boundary in hours (e.g. tz=3.5 for Tehran) so
  // late-night commits land on the right local day.
  const tzRaw = Number.parseFloat(search.get("tz") ?? "");
  const tzHours = Number.isFinite(tzRaw)
    ? Math.min(14, Math.max(-12, tzRaw))
    : 0;
  const now = new Date(Date.now() + tzHours * 3_600_000);

  if (!USERNAME_RE.test(username)) {
    return new NextResponse(
      renderErrorCard(username.slice(0, 39), theme, options),
      { status: 400, headers: SVG_HEADERS },
    );
  }

  try {
    const data = await fetchGithubData(username);
    let pulse = computePulse(data, now, days);
    const previewState = parseState(search);
    if (previewState) pulse = forceState(pulse, previewState);
    return new NextResponse(renderCard(pulse, theme, options), {
      status: 200,
      headers: SVG_HEADERS,
    });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return new NextResponse(renderErrorCard(username, theme, options), {
        status: 404,
        headers: SVG_HEADERS,
      });
    }
    console.error(`pulse render failed for ${username}:`, err);
    return new NextResponse(renderErrorCard(username, theme, options), {
      status: 502,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
