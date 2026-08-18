import Builder from "@/components/Builder";
import HeartsCounter from "@/components/HeartsCounter";

export default function Home() {
  return (
    <>
      <header className="mon-bar">
        <span className="mon-id">
          <span className="led" aria-hidden />
          github pulse
        </span>
        <HeartsCounter />
        <nav className="mon-nav">
          <a href="/wall">wall of hearts</a>
          <a
            href="https://github.com/pouyashahrdami/github-pulse"
            target="_blank"
            rel="noreferrer"
          >
            github
          </a>
        </nav>
      </header>

      <main className="wrap">
        <section className="mon-hero">
          <div>
            <h1>
              Your README has a{" "}
              <span className="beat-word">
                heartbeat
                <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
                  <path
                    d="M0 6 H30 L36 4 L42 6 H48 L53 1 L58 11 L62 6 H100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </span>{" "}
              now.
            </h1>
            <p className="mon-tagline">
              A living EKG grown from your GitHub activity. It beats faster when
              you ship, dims when you rest, flatlines when you vanish — and
              revives when you come back.
            </p>
            <p className="mon-proof">free · no login · one line of markdown</p>
          </div>
          <figure className="mon-bezel">
            <figcaption>
              <span className="led" aria-hidden />
              live · @pouyashahrdami
            </figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- live SVG, no optimizer */}
            <img
              src="/u/pouyashahrdami"
              alt="Live GitHub Pulse card for @pouyashahrdami"
              width={520}
              height={190}
            />
          </figure>
        </section>

        <div className="ecg-rule" aria-hidden>
          <svg viewBox="0 0 800 44" preserveAspectRatio="none">
            <path d="M0 22 H310 L322 16 L334 22 H352 L362 4 L374 40 L384 22 H470 L480 27 L492 22 H800" />
          </svg>
        </div>

        <Builder />

        <footer>
          open source · MIT ·{" "}
          <a
            href="https://github.com/pouyashahrdami/github-pulse"
            target="_blank"
            rel="noreferrer"
          >
            github.com/pouyashahrdami/github-pulse
          </a>
        </footer>
      </main>
    </>
  );
}
