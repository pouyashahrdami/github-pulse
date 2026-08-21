"use client";

import { useState } from "react";

const CMD = "npx github-pulse-cli your-username";

export default function CliStrip() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="cli-strip">
      <div>
        <h2>It also beats in your terminal.</h2>
        <p className="mon-tagline">
          Same vitals, zero install — the CLI reads the public JSON API, so it
          works on any user or repo. Pipe it, script it, put it in your MOTD.
        </p>
        <div className="snippet">
          <code>{CMD}</code>
          <button type="button" className="copy" onClick={copy}>
            {copied ? "copied ✓" : "copy"}
          </button>
        </div>
      </div>
      <figure className="term" aria-label="Example CLI output">
        <figcaption className="term-bar">
          <span className="led" aria-hidden />
          zsh — github-pulse
        </figcaption>
        <pre className="term-body">
          <span className="t-dim">$</span> npx github-pulse-cli pouyashahrdami
          {"\n"}
          <span className="t-green">●</span> @pouyashahrdami ·{" "}
          <span className="t-green">STEADY</span> · 180 bpm · TS+
          {"\n"}
          <span className="t-cyan">▃▃▃▁█▃▁▁▄▄▅▄▁▁</span>{" "}
          <span className="t-dim">14d</span>
          {"\n"}
          1.7k beats/yr · <span className="t-amber">★</span> 50
        </pre>
      </figure>
    </section>
  );
}
