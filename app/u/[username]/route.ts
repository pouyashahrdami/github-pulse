import { after, NextRequest, NextResponse } from "next/server";
import { recordBeat } from "@/lib/beats";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import { computePulse, forceState } from "@/lib/pulse";
import { renderCard, renderErrorCard } from "@/lib/card";
import { resolveTheme } from "@/lib/themes";
import { touchRecord } from "@/lib/record";
import { cachedSvg } from "@/lib/http";
import {
  parseOptions,
  parseState,
  parseDays,
  parseNow,
  CACHE_SECONDS,
} from "@/lib/options";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  // Cadence is PULSE_CACHE_SECONDS (default 24h). Camo adds its own layer on top.
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const search = req.nextUrl.searchParams;
  const theme = resolveTheme(search, username);
  const options = parseOptions(search);

  if (!USERNAME_RE.test(username)) {
    return new NextResponse(
      renderErrorCard(username.slice(0, 39), theme, options),
      { status: 400, headers: SVG_HEADERS },
    );
  }

  try {
    const data = await fetchGithubData(username);
    after(() => recordBeat("u", username, { wall: search.get("wall") === "1" }));
    let pulse = computePulse(data, parseNow(search), parseDays(search));
    const previewState = parseState(search);
    if (previewState) pulse = forceState(pulse, previewState);
    if (options.record) {
      try {
        pulse.record = await touchRecord(pulse);
      } catch (err) {
        console.error(`record store failed for ${username}:`, err);
      }
    }
    return cachedSvg(req, renderCard(pulse, theme, options), SVG_HEADERS);
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
