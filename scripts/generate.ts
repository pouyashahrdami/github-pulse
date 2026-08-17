/**
 * Zero-server generator for GitHub Actions (and local CLI use).
 *
 * Reads INPUT_* env vars (the convention GitHub Actions uses for `with:` inputs),
 * renders the pulse card, and writes it to a file. Example:
 *
 *   INPUT_USERNAME=octocat INPUT_OUT=pulse.svg npx -y tsx scripts/generate.ts
 */
import { writeFileSync } from "node:fs";
import { fetchGithubData } from "../lib/github";
import { computePulse, forceState } from "../lib/pulse";
import { renderCard } from "../lib/card";
import { resolveTheme } from "../lib/themes";
import { parseOptions, parseState, parseDays, parseNow } from "../lib/options";

function input(name: string): string | undefined {
  const v = process.env[`INPUT_${name.toUpperCase()}`]?.trim();
  return v || undefined;
}

async function main() {
  const username = input("username");
  if (!username) {
    console.error("error: INPUT_USERNAME is required");
    process.exit(1);
  }
  const out = input("out") ?? "pulse.svg";

  // Named inputs for the common knobs, plus a raw `params` query string that
  // accepts everything the URL endpoint accepts (hide=, label=, tz=, colors…).
  const search = new URLSearchParams(input("params") ?? "");
  for (const key of ["theme", "size", "wave", "days", "state"]) {
    const v = input(key);
    if (v && !search.has(key)) search.set(key, v);
  }

  const data = await fetchGithubData(username);
  let pulse = computePulse(data, parseNow(search), parseDays(search));
  const previewState = parseState(search);
  if (previewState) pulse = forceState(pulse, previewState);

  const svg = renderCard(pulse, resolveTheme(search, username), parseOptions(search));
  writeFileSync(out, svg);
  console.log(
    `wrote ${out} — @${pulse.login}: ${pulse.state}, ${pulse.bpm} bpm${
      pulse.partial ? " (public events fallback — set GITHUB_TOKEN)" : ""
    }`,
  );
}

main().catch((err) => {
  console.error("pulse generation failed:", err);
  process.exit(1);
});
