/**
 * Zero-server generator for GitHub Actions (and local CLI use).
 *
 * Reads INPUT_* env vars (the convention GitHub Actions uses for `with:` inputs),
 * renders the pulse card, and writes it to a file. Example:
 *
 *   INPUT_USERNAME=octocat INPUT_OUT=pulse.svg npx -y tsx scripts/generate.ts
 */
import { writeFileSync } from "node:fs";
import {
  fetchGithubData,
  fetchOrgData,
  fetchRepoData,
} from "../lib/github";
import { computePulse, forceState } from "../lib/pulse";
import { renderCard, renderDuetCard } from "../lib/card";
import { resolveTheme } from "../lib/themes";
import { parseOptions, parseState, parseDays, parseNow } from "../lib/options";

function input(name: string): string | undefined {
  const v = process.env[`INPUT_${name.toUpperCase()}`]?.trim();
  return v || undefined;
}

async function main() {
  const username = input("username");
  const repo = input("repo"); // owner/repo
  const org = input("org");
  const duet = input("duet"); // you,friend
  const subject = username ?? repo ?? org ?? duet;
  if (!subject) {
    console.error(
      "error: one of INPUT_USERNAME, INPUT_REPO, INPUT_ORG, INPUT_DUET is required",
    );
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
  const theme = resolveTheme(search, subject);
  const options = parseOptions(search);
  const now = parseNow(search);
  const days = parseDays(search);

  let svg: string;
  let logLine: string;

  if (duet) {
    const [a, b] = duet.split(/[,/]/).map((s) => s.trim().replace(/^@/, ""));
    if (!a || !b) {
      console.error("error: INPUT_DUET must be 'you,friend'");
      process.exit(1);
    }
    const [da, db] = await Promise.all([fetchGithubData(a), fetchGithubData(b)]);
    const pa = computePulse(da, now, days);
    const pb = computePulse(db, now, days);
    svg = renderDuetCard(pa, pb, theme, options);
    logLine = `@${pa.login} vs @${pb.login}`;
  } else {
    let data;
    if (repo) {
      const [owner, name] = repo.split("/");
      if (!owner || !name) {
        console.error("error: INPUT_REPO must be 'owner/repo'");
        process.exit(1);
      }
      data = await fetchRepoData(owner, name);
      if (!options.label) options.label = repo.slice(0, 32);
    } else if (org) {
      data = await fetchOrgData(org);
    } else {
      data = await fetchGithubData(username as string);
    }
    let pulse = computePulse(data, now, days);
    const previewState = parseState(search);
    if (previewState) pulse = forceState(pulse, previewState);
    svg = renderCard(pulse, theme, options);
    logLine = `@${pulse.login}: ${pulse.state}, ${pulse.bpm} bpm${
      pulse.partial ? " (public events fallback — set GITHUB_TOKEN)" : ""
    }`;
  }

  writeFileSync(out, svg);
  console.log(`wrote ${out} — ${logLine}`);
}

main().catch((err) => {
  console.error("pulse generation failed:", err);
  process.exit(1);
});
