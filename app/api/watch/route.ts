import { NextRequest, NextResponse } from "next/server";
import { addWatch, removeWatch, watcherCount } from "@/lib/watch";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

interface WatchBody {
  login?: string;
  url?: string;
}

async function parseBody(req: NextRequest): Promise<WatchBody | null> {
  const body = (await req.json().catch(() => null)) as WatchBody | null;
  return body && typeof body.login === "string" && USERNAME_RE.test(body.login)
    ? body
    : null;
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  if (!body || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "expected { login, url }" },
      { status: 400, headers: HEADERS },
    );
  }
  const result = await addWatch(body.login as string, body.url);
  if (result === "ok") {
    return NextResponse.json({ ok: true }, { status: 201, headers: HEADERS });
  }
  const responses = {
    invalid: {
      status: 400,
      error: "url must be https on discord.com/discordapp.com/hooks.slack.com",
    },
    full: { status: 409, error: "watch capacity reached" },
    blocked: { status: 403, error: "this user has opted out of being watched" },
    unavailable: { status: 503, error: "watches need Redis on this deploy" },
  } as const;
  const r = responses[result];
  return NextResponse.json({ error: r.error }, { status: r.status, headers: HEADERS });
}

export async function DELETE(req: NextRequest) {
  const body = await parseBody(req);
  if (!body || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "expected { login, url }" },
      { status: 400, headers: HEADERS },
    );
  }
  await removeWatch(body.login as string, body.url);
  return NextResponse.json({ ok: true }, { headers: HEADERS });
}

export async function GET(req: NextRequest) {
  const login = req.nextUrl.searchParams.get("login");
  if (!login || !USERNAME_RE.test(login)) {
    return NextResponse.json(
      { error: "expected ?login=" },
      { status: 400, headers: HEADERS },
    );
  }
  // count only — watcher URLs are never exposed
  return NextResponse.json(
    { login, watchers: await watcherCount(login) },
    { headers: HEADERS },
  );
}
