import { NextRequest, NextResponse } from "next/server";
import { fetchRepoData, UserNotFoundError } from "@/lib/github";
import { computePulse, forceState } from "@/lib/pulse";
import { renderCard, renderErrorCard } from "@/lib/card";
import { resolveTheme } from "@/lib/themes";
import { cachedSvg } from "@/lib/http";
import {
  parseOptions,
  parseState,
  parseDays,
  parseNow,
  CACHE_SECONDS,
} from "@/lib/options";

const OWNER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const REPO_RE = /^[a-zA-Z0-9._-]{1,100}$/;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  const search = req.nextUrl.searchParams;
  const slug = `${owner}/${repo}`;
  const theme = resolveTheme(search, slug);
  const options = parseOptions(search);
  // repo cards default the header to owner/repo instead of @login
  if (!options.label) options.label = slug.slice(0, 32);

  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) {
    return new NextResponse(renderErrorCard(slug.slice(0, 39), theme, options), {
      status: 400,
      headers: SVG_HEADERS,
    });
  }

  try {
    const data = await fetchRepoData(owner, repo);
    let pulse = computePulse(data, parseNow(search), parseDays(search));
    const previewState = parseState(search);
    if (previewState) pulse = forceState(pulse, previewState);
    return cachedSvg(req, renderCard(pulse, theme, options), SVG_HEADERS);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return new NextResponse(renderErrorCard(slug, theme, options), {
        status: 404,
        headers: SVG_HEADERS,
      });
    }
    console.error(`repo pulse render failed for ${slug}:`, err);
    return new NextResponse(renderErrorCard(slug, theme, options), {
      status: 502,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
