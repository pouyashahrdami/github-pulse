import { NextRequest, NextResponse } from "next/server";
import { fetchGithubData, UserNotFoundError } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { parseDays, parseNow, CACHE_SECONDS } from "@/lib/options";
import type { PulseState } from "@/lib/pulse";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": `public, max-age=${Math.min(3600, CACHE_SECONDS)}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
};

const STATE_COLORS: Record<PulseState, string> = {
  radiant: "8B5CF6",
  steady: "8B5CF6",
  fading: "F5B84B",
  critical: "F5B84B",
  flatline: "FF5A66",
  revived: "2FD4EE",
};

/**
 * shields.io endpoint schema — make a badge with:
 * https://img.shields.io/endpoint?url=<this route's URL>
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { schemaVersion: 1, label: "pulse", message: "invalid user", color: "FF5A66", isError: true },
      { status: 400, headers: JSON_HEADERS },
    );
  }
  try {
    const search = req.nextUrl.searchParams;
    const pulse = computePulse(
      await fetchGithubData(username),
      parseNow(search),
      parseDays(search),
    );
    const message =
      pulse.state === "flatline"
        ? "flatlined"
        : `${pulse.bpm} bpm · ${pulse.state}`;
    return NextResponse.json(
      {
        schemaVersion: 1,
        label: "pulse",
        message,
        color: STATE_COLORS[pulse.state],
      },
      { headers: JSON_HEADERS },
    );
  } catch (err) {
    const notFound = err instanceof UserNotFoundError;
    if (!notFound) console.error(`badge failed for ${username}:`, err);
    return NextResponse.json(
      {
        schemaVersion: 1,
        label: "pulse",
        message: notFound ? "not found" : "unavailable",
        color: "FF5A66",
        isError: true,
      },
      {
        status: notFound ? 404 : 502,
        headers: notFound
          ? JSON_HEADERS
          : { ...JSON_HEADERS, "Cache-Control": "no-store" },
      },
    );
  }
}
