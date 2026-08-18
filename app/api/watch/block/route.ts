import { NextRequest, NextResponse } from "next/server";
import { redisConfigured } from "@/lib/redis";
import { blockWatches, unblockWatches } from "@/lib/watch";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

async function parseLogin(req: NextRequest): Promise<string | null> {
  const body = (await req.json().catch(() => null)) as { login?: string } | null;
  return body && typeof body.login === "string" && USERNAME_RE.test(body.login)
    ? body.login
    : null;
}

export async function POST(req: NextRequest) {
  const login = await parseLogin(req);
  if (!login) {
    return NextResponse.json(
      { error: "expected { login }" },
      { status: 400, headers: HEADERS },
    );
  }
  if (!redisConfigured()) {
    return NextResponse.json(
      { error: "watches need Redis on this deploy" },
      { status: 503, headers: HEADERS },
    );
  }
  await blockWatches(login);
  return NextResponse.json({ ok: true, blocked: login }, { headers: HEADERS });
}

export async function DELETE(req: NextRequest) {
  const login = await parseLogin(req);
  if (!login) {
    return NextResponse.json(
      { error: "expected { login }" },
      { status: 400, headers: HEADERS },
    );
  }
  await unblockWatches(login);
  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
