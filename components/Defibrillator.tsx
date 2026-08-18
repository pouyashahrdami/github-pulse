"use client";

import { useState } from "react";

interface Props {
  login: string;
  state: "critical" | "flatline";
  daysSinceBeat: number;
  shareUrl: string;
}

type Phase = "idle" | "charging" | "clear";

/** Charge the paddles, then hand the visitor a code blue to broadcast. */
export default function Defibrillator({
  login,
  state,
  daysSinceBeat,
  shareUrl,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [copied, setCopied] = useState(false);

  const message =
    state === "flatline"
      ? `⚡ CLEAR! @${login}'s GitHub heart has been flat for ${daysSinceBeat} days. Someone start compressions → ${shareUrl}`
      : `🫀 @${login}'s GitHub pulse is CRITICAL — ${daysSinceBeat} days without a beat. Send a jolt before it's too late → ${shareUrl}`;

  const postUrl = `https://x.com/intent/post?text=${encodeURIComponent(message)}`;

  const charge = () => {
    setPhase("charging");
    setTimeout(() => setPhase("clear"), 1300);
  };

  if (phase !== "clear") {
    return (
      <button
        className={`copy defib${phase === "charging" ? " charging" : ""}`}
        onClick={charge}
        disabled={phase === "charging"}
      >
        {phase === "charging"
          ? "⚡ charging…"
          : state === "flatline"
            ? "⚡ grab the paddles"
            : "⚡ send a jolt"}
      </button>
    );
  }

  return (
    <div className="defib-actions">
      <span className="defib-clear" role="status">
        CLEAR!
      </span>
      <a className="copy" href={postUrl} target="_blank" rel="noreferrer">
        post the code blue
      </a>
      <button
        className="copy"
        onClick={() => {
          navigator.clipboard
            .writeText(message)
            .then(() => setCopied(true))
            .catch(() => {
              // clipboard blocked — the post link still works
            });
        }}
      >
        {copied ? "copied ✓" : "copy the page"}
      </button>
    </div>
  );
}
