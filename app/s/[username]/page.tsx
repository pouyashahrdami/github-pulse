import type { Metadata } from "next";
import { fetchGithubData } from "@/lib/github";
import { computePulse } from "@/lib/pulse";

interface Props {
  params: Promise<{ username: string }>;
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

export default async function SharePage({ params }: Props) {
  const { username } = await params;
  const embed = `[![GitHub Pulse](https://github-pulse-topaz.vercel.app/u/${username})](https://github-pulse-topaz.vercel.app)`;
  return (
    <main className="share">
      <p className="eyebrow">GITHUB PULSE</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/u/${username}`}
        alt={`GitHub Pulse card for @${username}`}
        width={520}
        height={190}
      />
      <p>
        This is <strong>@{username}</strong>&apos;s heartbeat — grown from real
        GitHub activity. It decays when they rest and flatlines when they
        vanish.
      </p>
      <pre className="snippet">
        <code>{embed}</code>
      </pre>
      <p>
        <a href="/">Take your own pulse →</a>
      </p>
    </main>
  );
}
