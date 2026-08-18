import type { Metadata } from "next";
import { recentBeats, type RecentBeat } from "@/lib/beats";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Wall of Hearts — GitHub Pulse",
  description:
    "The most recently beating pulse cards, live. Embed yours and join the wall.",
};

function cardSrc(b: RecentBeat): string {
  return b.kind === "vs"
    ? `/vs/${b.subject}?size=card`
    : `/${b.kind}/${b.subject}?size=compact`;
}

function pageHref(b: RecentBeat): string {
  return b.kind === "u" ? `/s/${b.subject}` : cardSrc(b);
}

export default async function Wall() {
  const beats = await recentBeats(24);
  return (
    <main className="wrap">
      <div className="hero">
        <p className="eyebrow">wall of hearts</p>
        <h1>
          Every card here is <span className="beat">alive</span>.
        </h1>
        <p className="tagline">
          The most recently beating hearts on this deploy — live SVGs, not
          screenshots. Embed your card anywhere and yours joins the wall.
        </p>
      </div>

      {beats.length === 0 ? (
        <p className="wall-empty">
          The wall is dark — no beats recorded on this deploy yet. Embed a card
          and come back.
        </p>
      ) : (
        <div className="wall-grid">
          {beats.map((b) => (
            <a key={`${b.kind}:${b.subject}`} href={pageHref(b)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- live SVGs, no optimizer */}
              <img
                src={cardSrc(b)}
                alt={`${b.subject} — live pulse card`}
                loading="lazy"
                width={b.kind === "vs" ? 520 : 340}
                height={b.kind === "vs" ? 190 : 130}
              />
            </a>
          ))}
        </div>
      )}

      <footer>
        <a href="/">← build your own</a>
      </footer>
    </main>
  );
}
