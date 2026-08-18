import type { Metadata } from "next";
import Defibrillator from "@/components/Defibrillator";
import { fetchGithubData } from "@/lib/github";
import { computePulse, forceState, type Pulse } from "@/lib/pulse";
import { parseState } from "@/lib/options";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  try {
    const pulse = computePulse(await fetchGithubData(username));
    const vitals =
      pulse.state === "flatline"
        ? "flatlined"
        : `${pulse.bpm} bpm (${pulse.state})`;
    return {
      title: `@${username}'s pulse — ${vitals}`,
      description: `${pulse.totalContributions} beats this year · blood type ${pulse.bloodType}. A living EKG grown from GitHub activity.`,
      twitter: { card: "summary_large_image" },
    };
  } catch {
    return { title: `@${username}'s pulse` };
  }
}

export default async function SharePage({ params, searchParams }: Props) {
  const { username } = await params;
  const embed = `[![GitHub Pulse](https://github-pulse-topaz.vercel.app/u/${username})](https://github-pulse-topaz.vercel.app)`;
  const sp = await searchParams;
  const stateRaw = typeof sp.state === "string" ? sp.state : "";
  const previewState = parseState(new URLSearchParams({ state: stateRaw }));
  let pulse: Pulse | null = null;
  try {
    pulse = computePulse(await fetchGithubData(username));
    if (previewState) pulse = forceState(pulse, previewState);
  } catch {
    // unknown user or upstream hiccup — page still renders, card shows the error
  }
  const needsJolt =
    pulse && (pulse.state === "flatline" || pulse.state === "critical");
  return (
    <main className="share">
      <p className="eyebrow">GITHUB PULSE</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/u/${username}${previewState ? `?state=${previewState}` : ""}`}
        alt={`GitHub Pulse card for @${username}`}
        width={520}
        height={190}
      />
      <p>
        This is <strong>@{username}</strong>&apos;s heartbeat — grown from real
        GitHub activity. It decays when they rest and flatlines when they
        vanish.
      </p>
      {needsJolt && pulse && (
        <Defibrillator
          login={username}
          state={pulse.state as "critical" | "flatline"}
          daysSinceBeat={pulse.daysSinceBeat}
          shareUrl={`https://github-pulse-topaz.vercel.app/s/${username}`}
        />
      )}
      <pre className="snippet">
        <code>{embed}</code>
      </pre>
      <p>
        <a href="/">Take your own pulse →</a> ·{" "}
        <a href="/wall">See the wall of hearts →</a>
      </p>
    </main>
  );
}
