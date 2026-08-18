import { after, NextRequest, NextResponse } from "next/server";
import { recordBeat } from "@/lib/beats";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { renderWardCard, renderErrorCard } from "@/lib/card";
import { resolveTheme } from "@/lib/themes";
import { cachedSvg } from "@/lib/http";
import {
  parseOptions,
  parseDays,
  parseNow,
  CACHE_SECONDS,
} from "@/lib/options";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const MAX_PATIENTS = 6;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ list: string }> },
) {
  const { list } = await params;
  const search = req.nextUrl.searchParams;
  const theme = resolveTheme(search, list);
  const options = parseOptions(search);

  const logins = [
    ...new Set(decodeURIComponent(list).split(",").map((s) => s.trim())),
  ];
  if (
    logins.length < 2 ||
    logins.length > MAX_PATIENTS ||
    logins.some((l) => !USERNAME_RE.test(l))
  ) {
    return new NextResponse(
      renderErrorCard(list.slice(0, 39), theme, options),
      { status: 400, headers: SVG_HEADERS },
    );
  }

  try {
    const now = parseNow(search);
    const days = parseDays(search);
    const data = await Promise.all(logins.map((l) => fetchGithubData(l)));
    after(() =>
      recordBeat("ward", [...logins].sort().join(","), {
        wall: search.get("wall") === "1",
      }),
    );
    const card = renderWardCard(
      data.map((d) => computePulse(d, now, days)),
      theme,
      options,
    );
    return cachedSvg(req, card, SVG_HEADERS);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return new NextResponse(renderErrorCard(list.slice(0, 39), theme, options), {
        status: 404,
        headers: SVG_HEADERS,
      });
    }
    console.error(`ward render failed for ${list}:`, err);
    return new NextResponse(renderErrorCard(list.slice(0, 39), theme, options), {
      status: 502,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
