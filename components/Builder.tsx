"use client";

import { useEffect, useMemo, useState } from "react";
import { THEMES, DEFAULT_THEME } from "@/lib/themes";
import type { CardSize, WaveStyle } from "@/lib/card";

interface CustomColors {
  color?: string;
  bg?: string;
  text?: string;
  accent?: string;
}

const SIZES: { name: CardSize; w: number; h: number }[] = [
  { name: "card", w: 520, h: 190 },
  { name: "monitor", w: 830, h: 260 },
  { name: "wide", w: 830, h: 150 },
  { name: "compact", w: 340, h: 130 },
  { name: "badge", w: 260, h: 70 },
];

type Mode = "user" | "repo" | "org" | "duet" | "ward" | "report" | "holter";

interface ModeInfo {
  label: string;
  placeholder: string;
  prefix: string;
  /** plain-words pitch shown under the chips, no jargon */
  about: string;
  /** dimensions of /samples/<mode>.svg, shown while the preview is empty */
  sampleW: number;
  sampleH: number;
}

const MODES: Record<Mode, ModeInfo> = {
  user: {
    label: "user", placeholder: "username", prefix: "github.com/",
    about:
      "your GitHub heartbeat — it beats every day you commit, slows down when you rest, and flatlines if you vanish",
    sampleW: 520, sampleH: 190,
  },
  repo: {
    label: "repo", placeholder: "owner/repo", prefix: "github.com/",
    about: "the same heartbeat, for one repository — is the project still alive?",
    sampleW: 520, sampleH: 190,
  },
  org: {
    label: "org", placeholder: "organization", prefix: "github.com/",
    about: "one shared heartbeat for a whole organization",
    sampleW: 520, sampleH: 190,
  },
  duet: {
    label: "duet", placeholder: "you,friend", prefix: "vs · ",
    about:
      "you and a friend on one monitor, with a score for how in-sync your rhythms are",
    sampleW: 520, sampleH: 190,
  },
  ward: {
    label: "ward", placeholder: "alice,bob,carol", prefix: "icu · ",
    about:
      "your team as hospital patients on one screen — sorted by who's most alive",
    sampleW: 830, sampleH: 294,
  },
  report: {
    label: "report", placeholder: "username", prefix: "checkup · ",
    about: "the annual checkup — your whole year of coding on one printed chart",
    sampleW: 830, sampleH: 330,
  },
  holter: {
    label: "holter", placeholder: "username", prefix: "24h · ",
    about:
      "records when in the day you code — then delivers a diagnosis: night owl or early bird? it even guesses when you sleep",
    sampleW: 830, sampleH: 310,
  },
};

/** Card types with one fixed 830-wide layout — the size picker doesn't apply. */
const FIXED_LAYOUT: ReadonlySet<Mode> = new Set(["ward", "report", "holter"]);

/** Card types that don't draw the daily wave — the wave picker doesn't apply. */
const NO_WAVE: ReadonlySet<Mode> = new Set(["report", "holter"]);

/** Build the card path for a mode from its raw input, or "" when incomplete. */
function cardPath(mode: Mode, raw: string): string {
  const clean = raw.trim().replace(/^@/, "");
  if (!clean) return "";
  switch (mode) {
    case "user":
      return `/u/${clean}`;
    case "org":
      return `/o/${clean}`;
    case "repo": {
      const [owner, repo] = clean.split("/");
      return owner && repo ? `/r/${owner}/${repo}` : "";
    }
    case "duet": {
      const [a, b] = clean.split(/[,/]/).map((s) => s.trim().replace(/^@/, ""));
      return a && b ? `/vs/${a}/${b}` : "";
    }
    case "ward": {
      const members = clean
        .split(",")
        .map((s) => s.trim().replace(/^@/, ""))
        .filter(Boolean);
      return members.length >= 2 && members.length <= 6
        ? `/ward/${members.join(",")}`
        : "";
    }
    case "report":
      return `/report/${clean}`;
    case "holter":
      return `/holter/${clean}`;
  }
}

export default function Builder() {
  const [mode, setMode] = useState<Mode>("user");
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [size, setSize] = useState<CardSize>("card");
  const [wave, setWave] = useState<WaveStyle>("ecg");
  const [custom, setCustom] = useState<CustomColors>({});
  const [adaptive, setAdaptive] = useState(false);
  const [scanlines, setScanlines] = useState(false);
  const [flip, setFlip] = useState(false);
  const [record, setRecord] = useState(false);
  const [wall, setWall] = useState(false);
  const [full, setFull] = useState(false);
  const [goal, setGoal] = useState("");
  const [lang, setLang] = useState("en");
  const [tz, setTz] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (theme !== DEFAULT_THEME) params.set("theme", theme);
    if (size !== "card" && !FIXED_LAYOUT.has(mode)) params.set("size", size);
    if (wave !== "ecg" && !NO_WAVE.has(mode)) params.set("wave", wave);
    for (const [k, v] of Object.entries(custom)) {
      if (v) params.set(k, v.replace(/^#/, ""));
    }
    if (scanlines) params.set("scanlines", "1");
    if (flip) params.set("flip", "1");
    if (record) params.set("record", "1");
    if (wall) params.set("wall", "1");
    if (full) params.set("w", "full");
    if (goal && Number(goal) > 0) params.set("goal", goal);
    if (lang !== "en") params.set("lang", lang);
    if (mode === "holter" && tz && Number.isFinite(Number(tz))) {
      params.set("tz", tz);
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [mode, theme, size, wave, custom, scanlines, flip, record, wall, full, goal, lang, tz]);

  const base = cardPath(mode, username);
  const path = base ? `${base}${query}` : "";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const lightQuery = useMemo(() => {
    const params = new URLSearchParams(query.replace(/^\?/, ""));
    params.set("theme", "paper");
    return `?${params.toString()}`;
  }, [query]);

  const markdown = !base
    ? ""
    : adaptive
      ? [
          "<picture>",
          `  <source media="(prefers-color-scheme: dark)" srcset="${origin}${base}${query}">`,
          `  <img alt="GitHub Pulse" src="${origin}${base}${lightQuery}">`,
          "</picture>",
        ].join("\n")
      : `[![GitHub Pulse](${origin}${path})](${origin})`;

  const [copied, setCopied] = useState(false);

  // #holter etc. deep-links into a mode (the landing callout uses this);
  // typed input survives the switch so the preview re-renders in place.
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.slice(1);
      if (m in MODES) setMode(m as Mode);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function load(e: React.FormEvent) {
    e.preventDefault();
    setUsername(input.trim());
  }

  function switchMode(m: Mode) {
    setMode(m);
    setInput("");
    setUsername("");
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
    <div className="builder" id="holter">
      <div className="intake-head">
        <strong>patient intake</strong>
        <span>no login · renders live</span>
      </div>
      <div className="intake-body">
      <div className="chips mode-chips">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`chip${mode === m ? " active" : ""}`}
            onClick={() => switchMode(m)}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>
      <p className="mode-about">{MODES[mode].about}</p>
      <form className="row-input" onSubmit={load}>
        <label className="username-box">
          <span className="prefix">{MODES[mode].prefix}</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={MODES[mode].placeholder}
            aria-label={`GitHub ${mode}`}
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
        {base ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={path}
            src={path}
            alt={`GitHub Pulse card for ${username}`}
            width={FIXED_LAYOUT.has(mode) ? 830 : SIZES.find((s) => s.name === size)?.w}
            height={FIXED_LAYOUT.has(mode) ? undefined : SIZES.find((s) => s.name === size)?.h}
            style={
              full || FIXED_LAYOUT.has(mode)
                ? { width: full ? "100%" : undefined, height: "auto" }
                : undefined
            }
          />
        ) : (
          <figure className="sample-peek">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/samples/${mode}.svg`}
              alt={`sample ${mode} card`}
              width={MODES[mode].sampleW}
              height={MODES[mode].sampleH}
            />
            <figcaption>
              sample — type yours above and it comes alive
            </figcaption>
          </figure>
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
          {(
            [
              ["random", "random · new theme daily"],
              ["season", "season · follows the calendar"],
            ] as const
          ).map(([name, label]) => (
            <button
              key={name}
              type="button"
              className={`chip${theme === name ? " active" : ""}`}
              onClick={() => setTheme(name)}
            >
              {label}
            </button>
          ))}
        </div>

        {!FIXED_LAYOUT.has(mode) && (
          <>
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
          </>
        )}

        {!NO_WAVE.has(mode) && (
          <>
            <span className="control-label">Wave</span>
            <div className="chips">
              {(
                [
                  ["ecg", "ecg · heartbeat"],
                  ["smooth", "smooth · aura wave"],
                  ["bars", "bars · equalizer"],
                ] as const
              ).map(([w, label]) => (
                <button
                  key={w}
                  type="button"
                  className={`chip${wave === w ? " active" : ""}`}
                  onClick={() => setWave(w)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        <span className="control-label">Extras</span>
        <div className="chips">
          {(
            [
              ["scanlines", "scanlines", scanlines, setScanlines],
              ["flip", "flip · rtl", flip, setFlip],
              ["record", "medical record", record, setRecord],
              ["full", "full width", full, setFull],
            ] as const
          ).map(([key, label, value, setter]) => (
            <button
              key={key}
              type="button"
              className={`chip${value ? " active" : ""}`}
              onClick={() => setter(!value)}
            >
              {label}
            </button>
          ))}
          <label className="chip goal-chip">
            daily goal
            <input
              type="number"
              min={1}
              max={999}
              value={goal}
              placeholder="—"
              onChange={(e) => setGoal(e.target.value)}
              aria-label="daily contribution goal"
            />
          </label>
          {mode === "holter" && (
            <label className="chip goal-chip">
              utc offset
              <input
                type="number"
                min={-12}
                max={14}
                step={0.5}
                value={tz}
                placeholder="0"
                onChange={(e) => setTz(e.target.value)}
                aria-label="UTC offset in hours, for local-time diagnosis"
              />
            </label>
          )}
        </div>

        <span className="control-label">Language</span>
        <div className="chips">
          {(["en", "fa", "de", "es", "ja"] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`chip${lang === l ? " active" : ""}`}
              onClick={() => setLang(l)}
            >
              {l}
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

      {base && (
        <div className="paper">
          <div className="paper-head">discharge — add it to your README</div>
          <label className="paper-check">
            <input
              type="checkbox"
              checked={adaptive}
              onChange={(e) => setAdaptive(e.target.checked)}
            />
            adaptive theme <small>— this theme in dark mode, paper in light</small>
          </label>
          <label className="paper-check">
            <input
              type="checkbox"
              checked={wall}
              onChange={(e) => setWall(e.target.checked)}
            />
            opt in to the public Wall of Hearts{" "}
            <small>— adds wall=1; off by default</small>
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
    </div>
  );
}
