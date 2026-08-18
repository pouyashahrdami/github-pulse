import { NextRequest, NextResponse } from "next/server";
import { fetchRepoData, UserNotFoundError } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { parseDays, parseNow, CACHE_SECONDS } from "@/lib/options";

const OWNER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const REPO_RE = /^[a-zA-Z0-9._-]{1,100}$/;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) {
    return NextResponse.json(
      { error: "invalid repo" },
      { status: 400, headers: JSON_HEADERS },
    );
  }
  try {
    const search = req.nextUrl.searchParams;
    const data = await fetchRepoData(owner, repo);
    const pulse = computePulse(data, parseNow(search), parseDays(search));
    return NextResponse.json(pulse, { headers: JSON_HEADERS });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json(
        { error: `repo not found: ${owner}/${repo}` },
        { status: 404, headers: JSON_HEADERS },
      );
    }
    console.error(`repo pulse json failed for ${owner}/${repo}:`, err);
    return NextResponse.json(
      { error: "upstream failure" },
      { status: 502, headers: { ...JSON_HEADERS, "Cache-Control": "no-store" } },
    );
  }
}
