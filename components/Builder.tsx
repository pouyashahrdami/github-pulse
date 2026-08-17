"use client";

import { useMemo, useState } from "react";
import { THEMES, DEFAULT_THEME } from "@/lib/themes";
import type { CardSize } from "@/lib/card";

interface CustomColors {
  color?: string;
  bg?: string;
  text?: string;
  accent?: string;
}

const SIZES: { name: CardSize; w: number; h: number }[] = [
  { name: "card", w: 520, h: 190 },
  { name: "wide", w: 830, h: 150 },
  { name: "compact", w: 340, h: 130 },
  { name: "badge", w: 260, h: 70 },
];

export default function Builder() {
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [size, setSize] = useState<CardSize>("card");
  const [custom, setCustom] = useState<CustomColors>({});
  const [adaptive, setAdaptive] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (theme !== DEFAULT_THEME) params.set("theme", theme);
    if (size !== "card") params.set("size", size);
    for (const [k, v] of Object.entries(custom)) {
      if (v) params.set(k, v.replace(/^#/, ""));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [theme, size, custom]);

  const path = username ? `/u/${username}${query}` : "";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const lightQuery = useMemo(() => {
    const params = new URLSearchParams(query.replace(/^\?/, ""));
    params.set("theme", "paper");
    return `?${params.toString()}`;
  }, [query]);

  const markdown = !username
    ? ""
    : adaptive
      ? [
          "<picture>",
          `  <source media="(prefers-color-scheme: dark)" srcset="${origin}/u/${username}${query}">`,
          `  <img alt="GitHub Pulse" src="${origin}/u/${username}${lightQuery}">`,
          "</picture>",
        ].join("\n")
      : `[![GitHub Pulse](${origin}${path})](${origin})`;

  const [copied, setCopied] = useState(false);

  function load(e: React.FormEvent) {
    e.preventDefault();
    setUsername(input.trim().replace(/^@/, ""));
  }

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function setColor(key: keyof CustomColors, value: string) {
    setCustom((c) => ({ ...c, [key]: value }));
  }

  return (
    <div className="builder">
      <form className="row-input" onSubmit={load}>
        <label className="username-box">
          <span className="prefix">github.com/</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="username"
            aria-label="GitHub username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <button className="go" type="submit">
          take my pulse
        </button>
      </form>

      <div className="preview">
        {username ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={path}
            src={path}
            alt={`GitHub Pulse card for @${username}`}
            width={SIZES.find((s) => s.name === size)?.w}
            height={SIZES.find((s) => s.name === size)?.h}
          />
        ) : (
          <span className="hint">your card appears here — try your username</span>
        )}
      </div>

      <div className="controls">
        <span className="control-label">Theme</span>
        <div className="chips">
          {Object.entries(THEMES).map(([name, t]) => (
            <button
              key={name}
              type="button"
              className={`chip${theme === name ? " active" : ""}`}
              onClick={() => setTheme(name)}
            >
              <span className="dot" style={{ background: t.trace }} />
              {name}
            </button>
          ))}
        </div>

        <span className="control-label">Shape</span>
        <div className="chips">
          {SIZES.map((s) => (
            <button
              key={s.name}
              type="button"
              className={`chip${size === s.name ? " active" : ""}`}
              onClick={() => setSize(s.name)}
            >
              {s.name} · {s.w}×{s.h}
            </button>
          ))}
        </div>

        <span className="control-label">Custom colors</span>
        <div className="customizer">
          {(
            [
              ["color", "trace"],
              ["bg", "background"],
              ["text", "text"],
              ["accent", "accent"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="swatch">
              <input
                type="color"
                value={custom[key] ?? "#8b5cf6"}
                onChange={(e) => setColor(key, e.target.value)}
                aria-label={`${label} color`}
              />
              {label}
            </label>
          ))}
          {Object.keys(custom).length > 0 && (
            <button type="button" className="reset" onClick={() => setCustom({})}>
              reset
            </button>
          )}
        </div>
      </div>

      {username && (
        <div className="embed">
          <span className="control-label">Add it to your README</span>
          <label className="adaptive-toggle">
            <input
              type="checkbox"
              checked={adaptive}
              onChange={(e) => setAdaptive(e.target.checked)}
            />
            adaptive: this theme in dark mode, paper in light mode
          </label>
          <div className="snippet">
            <code>{markdown}</code>
            <button type="button" className="copy" onClick={copy}>
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
