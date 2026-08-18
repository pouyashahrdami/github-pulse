import Builder from "@/components/Builder";
import HeartsCounter from "@/components/HeartsCounter";

export default function Home() {
  return (
    <main className="wrap">
      <div className="hero">
        <p className="eyebrow">github pulse · free · no login</p>
        <h1>
          Your README has a <span className="beat">heartbeat</span> now.
        </h1>
        <p className="tagline">
          A living EKG card grown from your GitHub activity. It beats faster when
          you ship, dims when you rest, flatlines when you vanish — and revives
          when you come back.
        </p>
        <HeartsCounter />
      </div>

      <Builder />

      <footer>
        <a href="/wall">wall of hearts</a> · open source · MIT ·{" "}
        <a
          href="https://github.com/pouyashahrdami/github-pulse"
          target="_blank"
          rel="noreferrer"
        >
          github.com/pouyashahrdami/github-pulse
        </a>
      </footer>
    </main>
  );
}
