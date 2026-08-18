import { NextRequest, NextResponse } from "next/server";
import { fetchGithubData } from "@/lib/github";
import { computePulse } from "@/lib/pulse";
import { redisConfigured } from "@/lib/redis";
import {
  dispatch,
  lastSweptState,
  setSweptState,
  transitionEvent,
  watchedLogins,
} from "@/lib/watch";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export const maxDuration = 60;

/**
 * Daily cron (vercel.json): walk every watched login, compare its state to
 * the last swept one, fire webhooks on flatline/revive transitions. Vercel
 * sends `Authorization: Bearer $CRON_SECRET` when that env var is set.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: HEADERS });
  }
  if (!redisConfigured()) {
    return NextResponse.json(
      { swept: 0, fired: 0, durable: false },
      { headers: HEADERS },
    );
  }

  const logins = await watchedLogins();
  let fired = 0;
  for (const login of logins) {
    try {
      const pulse = computePulse(await fetchGithubData(login));
      const prev = await lastSweptState(login);
      const event = transitionEvent(prev, pulse.state);
      // state advances even when delivery fails — at-most-once, no replay storms
      await setSweptState(login, pulse.state);
      if (event) fired += await dispatch(login, event, pulse);
    } catch (err) {
      console.error(`sweep failed for ${login}:`, err);
    }
  }
  return NextResponse.json(
    { swept: logins.length, fired, durable: true },
    { headers: HEADERS },
  );
}
