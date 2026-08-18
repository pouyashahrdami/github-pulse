# Launch kit

Ready-to-post copy for shipping GitHub Pulse to the world. Swap links if the
domain changes.

---

## Show HN

**Title:** Show HN: GitHub Pulse – a README stats card that decays if you stop committing

**Body:**

Every GitHub stats card I've seen is a static trophy. I wanted one that's
alive — so I built a card that renders your activity as an EKG and computes its
state *at view time*:

- Ship daily and it reads RADIANT at 180 bpm. Go quiet and it literally dims:
  STEADY → FADING → CRITICAL → FLATLINE. Come back and it stamps ⚡ REVIVED
  for 48 hours.
- The waveform is a per-user fingerprint (P/T-waves seeded from your username),
  blood type is your primary language (mine's TS+), and there's a pacemaker
  detector that flags metronome-regular cron-bot commit patterns as "⚙ paced".
- With `?record=1` the card keeps a medical chart: flatlines survived,
  revivals, longest streak ever.
- Beyond user cards: repo cards (an abandoned repo's card flatlines — a badge
  maintainers feel), org cards, and duet cards that score how often two
  people's active days overlap (I'm 71% synced with Torvalds, apparently).

It's a Next.js service rendering pure SVG with SMIL/CSS animation (GitHub
strips JS from READMEs), free, no login, MIT. There's also a zero-server mode
that runs as a GitHub Action, a JSON API, and a shields.io endpoint.

Demo: https://github-pulse-topaz.vercel.app
Code: https://github.com/pouyashahrdami/github-pulse

---

## Product Hunt

**Tagline:** A living EKG for your GitHub README

**Description:**

GitHub Pulse turns your commit activity into a beating heart. It speeds up
when you ship, dims when you rest, flatlines when you vanish — and revives
when you come back. 15 themes (including random-daily and seasonal), 5 shapes,
custom gradients, CRT scanlines, 5 languages with RTL support, goal lines,
milestone stamps, and a deadpan medical record that remembers every flatline
you've survived. Cards for users, repos, orgs, and duets (two devs, one
monitor, a rhythm-sync score). Free, no login, open source.

**First comment:** Maker here — the whole thing renders as pure SVG because
GitHub strips JavaScript from READMEs, so every animation is SMIL/CSS smuggled
through their image proxy. Happy to answer anything about the rendering tricks,
the pacemaker bot-detector heuristic, or the cardiology puns.

---

## Tweet thread

1/ Your GitHub README has a heartbeat now.

I built GitHub Pulse — a stats card that's actually *alive*. It beats faster
when you ship, dims when you rest, and flatlines if you disappear. 🫀

github-pulse-topaz.vercel.app

2/ Come back after a flatline and it stamps ⚡ REVIVED on your card for 48h.
Turn on ?record=1 and it keeps your medical chart forever: flatlines survived,
revivals, longest streak ever.

3/ It knows things. Blood type = your primary language (TS+). Your waveform's
P-waves are seeded from your username — no two hearts look alike. And if you
commit with a cron bot, the pacemaker detector will out you: ⚙ paced.

4/ Not just you: repos get pulses (abandoned repo = flatline, in public),
orgs get pulses, and /vs/you/friend puts two hearts on one monitor with a
rhythm-sync score. I'm 71% synced with Linus.

5/ Free, no login, MIT. Embed one line of markdown, or run it as a GitHub
Action with zero servers. 15 themes, RTL + فارسی support, and it respects
prefers-reduced-motion. Take your pulse: github-pulse-topaz.vercel.app

---

## Reddit r/github / r/webdev

**Title:** I made a README stats card that decays in real time — flatlines if
you stop committing, revives when you return

**Body:** Sick of static stats cards, I built one that computes its state at
the moment someone views it. [Continue with Show HN body, minus the HN-isms.]
