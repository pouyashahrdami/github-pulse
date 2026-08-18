import { NextRequest, NextResponse } from "next/server";
import { fetchOrgData, UserNotFoundError } from "@/lib/github";
import { computePulse, forceState } from "@/lib/pulse";
import { renderCard, renderErrorCard } from "@/lib/card";
import { resolveTheme } from "@/lib/themes";
import {
  parseOptions,
  parseState,
  parseDays,
  parseNow,
  CACHE_SECONDS,
} from "@/lib/options";

const ORG_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ org: string }> },
) {
  const { org } = await params;
  const search = req.nextUrl.searchParams;
  const theme = resolveTheme(search, org);
  const options = parseOptions(search);

  if (!ORG_RE.test(org)) {
    return new NextResponse(renderErrorCard(org.slice(0, 39), theme, options), {
      status: 400,
      headers: SVG_HEADERS,
    });
  }

  try {
    const data = await fetchOrgData(org);
    let pulse = computePulse(data, parseNow(search), parseDays(search));
    const previewState = parseState(search);
    if (previewState) pulse = forceState(pulse, previewState);
    return new NextResponse(renderCard(pulse, theme, options), {
      status: 200,
      headers: SVG_HEADERS,
    });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return new NextResponse(renderErrorCard(org, theme, options), {
        status: 404,
        headers: SVG_HEADERS,
      });
    }
    console.error(`org pulse render failed for ${org}:`, err);
    return new NextResponse(renderErrorCard(org, theme, options), {
      status: 502,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
