#!/usr/bin/env node
import { parseArgs } from "node:util";
import { renderVitals, type Vitals } from "./render.js";

const VERSION = "0.1.0";
const DEFAULT_HOST = "https://github-pulse-topaz.vercel.app";

const HELP = `github-pulse — ASCII EKG for any GitHub user or repo

usage:
  github-pulse <user>            user pulse
  github-pulse <owner>/<repo>    repo pulse

options:
  --days <7-30>   beat window (default 14)
  --host <url>    pulse server (or GITHUB_PULSE_HOST; default ${DEFAULT_HOST})
  --json          print the raw vitals JSON
  --no-color      plain output (NO_COLOR env works too)
  -h, --help
  -v, --version`;

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      days: { type: "string" },
      host: { type: "string" },
      json: { type: "boolean", default: false },
      "no-color": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }
  if (values.version) {
    console.log(VERSION);
    return;
  }
  const target = positionals[0];
  if (!target) fail(HELP);

  const host = values.host ?? process.env.GITHUB_PULSE_HOST ?? DEFAULT_HOST;
  const url = new URL(
    target.includes("/") ? `/api/r/${target}` : `/api/u/${target}`,
    host,
  );
  if (values.days) url.searchParams.set("days", values.days);

  const res = await fetch(url, {
    headers: { "User-Agent": `github-pulse-cli/${VERSION}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    fail(body?.error ?? `pulse server responded ${res.status}`);
  }
  const vitals = (await res.json()) as Vitals;

  if (values.json) {
    console.log(JSON.stringify(vitals, null, 2));
    return;
  }
  const color =
    !values["no-color"] && !process.env.NO_COLOR && process.stdout.isTTY;
  console.log(renderVitals(vitals, Boolean(color)));
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
