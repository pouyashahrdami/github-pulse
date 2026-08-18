import { NextRequest, NextResponse } from "next/server";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { computeReport } from "@/lib/report";
import { renderReportCard, renderErrorCard } from "@/lib/card";
import { resolveTheme } from "@/lib/themes";
import { cachedSvg } from "@/lib/http";
import { parseOptions, parseNow, CACHE_SECONDS } from "@/lib/options";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
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
    const pulse = computePulse(data, parseNow(search));
    const card = renderReportCard(
      pulse,
      computeReport(data.days),
      theme,
      options,
      parseNow(search).toISOString().slice(0, 10),
    );
    return cachedSvg(req, card, SVG_HEADERS);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return new NextResponse(renderErrorCard(username, theme, options), {
        status: 404,
        headers: SVG_HEADERS,
      });
    }
    console.error(`report render failed for ${username}:`, err);
    return new NextResponse(renderErrorCard(username, theme, options), {
      status: 502,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
