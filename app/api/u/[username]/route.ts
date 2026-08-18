import { NextRequest, NextResponse } from "next/server";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { parseDays, parseNow, CACHE_SECONDS } from "@/lib/options";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "invalid username" },
      { status: 400, headers: JSON_HEADERS },
    );
  }
  try {
    const search = req.nextUrl.searchParams;
    const data = await fetchGithubData(username);
    const pulse = computePulse(data, parseNow(search), parseDays(search));
    return NextResponse.json(pulse, { headers: JSON_HEADERS });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json(
        { error: `user not found: ${username}` },
        { status: 404, headers: JSON_HEADERS },
      );
    }
    console.error(`pulse json failed for ${username}:`, err);
    return NextResponse.json(
      { error: "upstream failure" },
      { status: 502, headers: { ...JSON_HEADERS, "Cache-Control": "no-store" } },
    );
  }
}
