import { NextRequest, NextResponse } from "next/server";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { renderDuetCard, renderErrorCard } from "@/lib/card";
import { resolveTheme } from "@/lib/themes";
import { cachedSvg } from "@/lib/http";
import {
  parseOptions,
  parseDays,
  parseNow,
  CACHE_SECONDS,
} from "@/lib/options";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ a: string; b: string }> },
) {
  const { a, b } = await params;
  const search = req.nextUrl.searchParams;
  const slug = `${a} vs ${b}`;
  const theme = resolveTheme(search, `${a}/${b}`);
  const options = parseOptions(search);

  if (!USERNAME_RE.test(a) || !USERNAME_RE.test(b)) {
    return new NextResponse(renderErrorCard(slug.slice(0, 39), theme, options), {
      status: 400,
      headers: SVG_HEADERS,
    });
  }

  try {
    const now = parseNow(search);
    const days = parseDays(search);
    const [da, db] = await Promise.all([fetchGithubData(a), fetchGithubData(b)]);
    const card = renderDuetCard(
      computePulse(da, now, days),
      computePulse(db, now, days),
      theme,
      options,
    );
    return cachedSvg(req, card, SVG_HEADERS);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return new NextResponse(renderErrorCard(slug, theme, options), {
        status: 404,
        headers: SVG_HEADERS,
      });
    }
    console.error(`duet render failed for ${slug}:`, err);
    return new NextResponse(renderErrorCard(slug, theme, options), {
      status: 502,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
