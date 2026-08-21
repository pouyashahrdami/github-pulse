import type { Metadata } from "next";
import { CHRONOTYPE_LABEL } from "@/lib/card";
import { fetchHolterSample } from "@/lib/github";
import { computeHolter, type HolterStats } from "@/lib/holter";

interface Props {
  params: Promise<{ username: string }>;
}

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Share surfaces stay on UTC so the unfurl image and text always agree. */
async function holterFor(username: string): Promise<HolterStats | null> {
  try {
    return computeHolter(await fetchHolterSample(username));
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const stats = await holterFor(username);
  if (!stats || stats.chronotype === "inconclusive") {
    return { title: `@${username}'s 24-hour tape` };
  }
  const sleep = stats.sleep
    ? `suspected sleep ${hh(stats.sleep.from)}–${hh(stats.sleep.to)}`
    : "sleep not observed";
  return {
    title: `@${username} is ${CHRONOTYPE_LABEL[stats.chronotype]} — the holter monitor knows`,
    description: `${stats.nightPct}% night load · peak hour ${
      stats.peakHour === null ? "—" : hh(stats.peakHour)
    } · ${sleep}. A 24-hour tape of when they really code.`,
    twitter: { card: "summary_large_image" },
  };
}

export default async function HolterSharePage({ params }: Props) {
  const { username } = await params;
  const stats = await holterFor(username);
  const embed = `[![GitHub Pulse — holter](https://github-pulse-topaz.vercel.app/holter/${username})](https://github-pulse-topaz.vercel.app)`;
  return (
    <main className="share">
      <p className="eyebrow">GITHUB PULSE · HOLTER MONITOR</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/holter/${username}`}
        alt={`Holter monitor card for @${username}`}
        width={830}
        height={310}
        style={{ maxWidth: "100%", height: "auto" }}
      />
      <p>
        This is <strong>@{username}</strong>&apos;s 24-hour tape — not how much
        they code, but <em>when</em>.
        {stats && stats.chronotype !== "inconclusive" && (
          <>
            {" "}
            The monitor&apos;s verdict:{" "}
            <strong>{CHRONOTYPE_LABEL[stats.chronotype]}</strong>
            {stats.sleep
              ? `, with suspected sleep ${hh(stats.sleep.from)}–${hh(stats.sleep.to)}.`
              : ", and no sleep observed. Concerning."}
          </>
        )}
      </p>
      <pre className="snippet">
        <code>{embed}</code>
      </pre>
      <p>
        <a href="/#holter">Get your own diagnosis →</a> ·{" "}
        <a href={`/s/${username}`}>Full vitals →</a>
      </p>
    </main>
  );
}
