import { NextRequest, NextResponse } from "next/server";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { renderCard, renderErrorCard } from "@/lib/card";
import { resolveTheme } from "@/lib/themes";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  // Short-ish edge cache: decay has to feel alive. Camo adds its own layer on top.
  "Cache-Control":
    "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const search = req.nextUrl.searchParams;
  const theme = resolveTheme(search);

  if (!USERNAME_RE.test(username)) {
    return new NextResponse(renderErrorCard(username.slice(0, 39), theme), {
      status: 400,
      headers: SVG_HEADERS,
    });
  }

  try {
    const data = await fetchGithubData(username);
    const pulse = computePulse(data);
    return new NextResponse(renderCard(pulse, theme), {
      status: 200,
      headers: SVG_HEADERS,
    });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return new NextResponse(renderErrorCard(username, theme), {
        status: 404,
        headers: SVG_HEADERS,
      });
    }
    console.error(`pulse render failed for ${username}:`, err);
    return new NextResponse(renderErrorCard(username, theme), {
      status: 502,
      headers: { ...SVG_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
