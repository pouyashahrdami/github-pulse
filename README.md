# github-pulse 🫀

[![ci](https://github.com/pouyashahrdami/github-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/pouyashahrdami/github-pulse/actions/workflows/ci.yml)

**A living EKG card for your GitHub README.** One username in, a beating heart out —
it beats faster when you ship, dims when you rest, flatlines when you vanish, and
revives when you come back.

<p align="center">
  <a href="https://github-pulse-topaz.vercel.app">
    <img src="https://github-pulse-topaz.vercel.app/u/pouyashahrdami" width="520" height="190" alt="GitHub Pulse card, aura theme — live">
  </a>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpouyashahrdami%2Fgithub-pulse&env=GITHUB_TOKEN&envDescription=Classic%20GitHub%20token%2C%20no%20scopes%20needed&project-name=github-pulse&repository-name=github-pulse">
    <img src="https://vercel.com/button" alt="Deploy with Vercel">
  </a>
</p>

Unlike every static stats card, your pulse card is generated *at the moment someone
views it*. Time actually passes on it.

```md
[![GitHub Pulse](https://github-pulse-topaz.vercel.app/u/YOUR_USERNAME)](https://github-pulse-topaz.vercel.app)
```

## What the card shows

- **A real EKG waveform** — one beat per day for your last 14 days; beat height =
  contributions that day. Zero-commit days stay flat. The waveform's P/T-waves and
  jitter are seeded from your username, so no two hearts look alike.
- **BPM** — derived from your weekly contribution count.
- **Life state** — `RADIANT → STEADY → FADING → CRITICAL → FLATLINE`, computed from
  time since your last contribution. Come back after a 14-day flatline and the card
  stamps `⚡ REVIVED` for 48 hours.
- **Blood type** — your top language, typed (`TS+`, `PY-`, `RS+`…). The sign is
  live: `+` if you shipped this week.
- **Streak, yearly beats, stars** — and a `● beating now` indicator when your last
  beat was today.

## The life cycle

The card decays in real time and earns its way back:

```
RADIANT → STEADY → FADING → CRITICAL → FLATLINE → ⚡ REVIVED
 <24h      ≤3d      ≤7d       <14d       ≥14d      first beat after
```

Go quiet for two weeks and your card literally dies in public — time of death
printed on it. Your first commit after a flatline stamps `⚡ REVIVED` on the card.

<img src="./assets/sample-revived.svg" width="520" height="190" alt="revived state">
<br>
<img src="./assets/sample-flatline.svg" width="520" height="190" alt="flatline state">

Preview any state without waiting to die: `?state=radiant|steady|fading|critical|flatline|revived`.

## Shapes

Add `?size=<name>` to fit your README layout:

| size | dimensions | good for |
|---|---|---|
| `card` *(default)* | 520×190 | next to other stat cards |
| `monitor` | 830×260 | the full vitals monitor — three traces + numbers column |
| `wide` | 830×150 | full-width banner across the README |
| `compact` | 340×130 | sidebars, small profiles |
| `badge` | 260×70 | one-liners, project READMEs, bios |

<img src="./assets/sample-monitor.svg" width="830" height="260" alt="full vitals monitor">

<img src="./assets/sample-phosphor-wide.svg" width="830" height="150" alt="wide banner, phosphor theme">
<br>
<img src="./assets/sample-github-compact.svg" width="340" height="130" alt="compact card, github theme">
<img src="./assets/sample-badge.svg" width="260" height="70" alt="badge, aura theme">

## Themes

Add `?theme=<name>`:

| theme | vibe |
|---|---|
| `aura` *(default)* | violet→cyan→magenta gradient glow |
| `phosphor` | classic green hospital monitor |
| `cyber` | ice-cyan |
| `ember` | burning amber |
| `rose` | hot magenta |
| `github` | matches the contribution graph |
| `mono` | white on black |
| `paper` | printed ECG strip (light) |
| `dracula` | matches the Dracula editor theme |
| `tokyonight` | matches Tokyo Night |
| `catppuccin` | matches Catppuccin Mocha |
| `nord` | matches Nord |
| `gruvbox` | matches Gruvbox |

<img src="./assets/sample-ember.svg" width="520" height="190" alt="ember theme">
<br>
<img src="./assets/sample-dracula.svg" width="520" height="190" alt="dracula theme">
<br>
<img src="./assets/sample-paper.svg" width="520" height="190" alt="paper theme">

**[→ See all 13 themes in the gallery](./docs/THEMES.md)**

Can't pick? `?theme=random` deals you a theme that stays stable all day and
reshuffles every UTC midnight — a different look every morning. Or let the
calendar decide with `?theme=season`: frosty `nord` winters, warm `ember`
summers, `gruvbox` autumns — and `dracula` takes over for halloween week.

*(Samples above are snapshots committed to this repo — your embed is generated live.)*

## Custom colors

Every color is overridable with hex query params (no `#`):

```
/u/username?color=ff2d95&bg=141021&text=ffffff&accent=ff2d95&muted=8888aa
```

| param | controls |
|---|---|
| `color` | the EKG trace |
| `bg` | card background (`bg=transparent` works too) |
| `text` | primary text |
| `accent` | state pill highlights |
| `muted` | secondary text |
| `border` | card border (`border=0` hides it) |

And shape/behavior params:

| param | values | default |
|---|---|---|
| `size` | `card` `monitor` `wide` `compact` `badge` | `card` |
| `w` | rendered width: `200`–`1600` px, or `full` to stretch to your README's width | native |
| `radius` | corner rounding `0`–`24` | `12` |
| `grid` | `0` hides the ECG grid | `1` |
| `glow` | `0` disables the glow filter | `1` |
| `days` | beat window `7`–`30` | `14` |
| `label` | custom header text (max 32 chars) | `@username` |
| `labels` | rename state pills: `radiant:ON FIRE,flatline:RIP` (16 chars each) | medical |
| `goal` | daily contribution target `1`–`999`: dashed line on the wave + hit-rate | — |
| `record` | `1` shows chart history: `⚕ flatlines† revivals⚡ best-streak` (persists in Redis when `UPSTASH_REDIS_REST_URL`/`TOKEN` are set) | `0` |
| `flip` | `1` mirrors the wave — newest beat on the left, for RTL READMEs | `0` |
| `lang` | status strings in `en` `fa` `de` `es` `ja` (pair `fa` with `flip=1`) | `en` |
| `blink` | `1` blinks the LED dot at your actual heart rate on every alive card | `0` |
| `hide` | comma list: `pill` `bpm` `stats` `status` `header` `pacemaker` `milestone` | — |
| `anim` | `0` renders a fully static card | `1` |
| `scanlines` | `1` adds a CRT scanline overlay (pairs well with `theme=phosphor`) | `0` |
| `font` | `serif`, `sans`, or any installed family (`font=Courier New`) | mono |
| `gradient` | custom trace gradient, 2–3 hex stops: `gradient=8B5CF6,2FD4EE,F26DB8` | theme |
| `speed` | animation speed `0.25`–`3` | `1` |
| `state` | preview a life state (see above) | live |
| `wave` | `ecg` heartbeat, `smooth` aura wave, `bars` equalizer | `ecg` |
| `tz` | UTC offset in hours (e.g. `3.5`) so late-night commits count to your local day | `0` |

Params compose with a theme: start from `?theme=phosphor` and override just `bg`.

**Want it edge-to-edge?** Profile READMEs are wider than the default card. Use the
wide banner and let it stretch:

```md
![GitHub Pulse](https://github-pulse-topaz.vercel.app/u/YOUR_USERNAME?size=wide&w=full)
```

## Repo cards

Any repository has a heartbeat too — commit activity on the default branch:

```md
![repo pulse](https://github-pulse-topaz.vercel.app/r/OWNER/REPO?theme=github)
```

Same params as user cards. Stats map to the repo: ★ stars, open PRs/issues,
blood type = primary language, beats/yr = commits in the last year.

## Org cards

A whole organization on one monitor — the wave is org-wide push activity from
recent public events, ★ totals its repos' stars, blood type is the org's
dominant language:

```md
![org pulse](https://github-pulse-topaz.vercel.app/o/YOUR_ORG?size=wide)
```

## Duet cards

Two hearts, one monitor — you and a friend (or rival) on the same trace, with a
**rhythm sync** score: how often your active days overlap.

```md
![duet](https://github-pulse-topaz.vercel.app/vs/YOU/FRIEND?theme=aura)
```

Trace A gets the theme color, trace B the accent. `size=card` and `size=wide`.

## Shields badge

Want just a tiny badge instead of a full card? The pulse speaks the
[shields.io endpoint schema](https://shields.io/badges/endpoint-badge):

```md
![pulse](https://img.shields.io/endpoint?url=https%3A%2F%2Fgithub-pulse-topaz.vercel.app%2Fapi%2Fbadge%2FYOUR_USERNAME)
```

Renders as `pulse | 180 bpm · radiant`, colored by life state.

## Share pages

Cards are SVG, which chat apps and social sites won't unfurl — so every user
also gets a share link with a PNG preview baked in:

```
https://github-pulse-topaz.vercel.app/s/YOUR_USERNAME
```

Drop it in Slack, Discord, or a tweet and it unfurls into a vitals snapshot.

Every card served also lights up the deploy's **[Wall of Hearts](https://github-pulse-topaz.vercel.app/wall)** —
a live gallery of the most recently beating cards.

## JSON API

Everything the card knows, as data — build your own visualizations, bots, or
status widgets on top of the pulse engine:

```bash
curl https://github-pulse-topaz.vercel.app/api/u/YOUR_USERNAME
curl https://github-pulse-topaz.vercel.app/api/r/OWNER/REPO
```

Returns the full vitals object: `state`, `bpm`, `streak`, `bloodType`, `beats`
(normalized wave), `dayCounts` (raw), `pacemaker`, and more. CORS is open
(`Access-Control-Allow-Origin: *`), responses cache like the cards. `days=` and
`tz=` params apply.

## Light & dark mode

GitHub READMEs support the `<picture>` element, so your pulse can match the
viewer's theme — one card for dark mode, another for light:

```html
<picture>
  <source media="(prefers-color-scheme: dark)"
          srcset="https://github-pulse-topaz.vercel.app/u/YOU?theme=aura">
  <img alt="GitHub Pulse"
       src="https://github-pulse-topaz.vercel.app/u/YOU?theme=paper">
</picture>
```

The site's builder has an **adaptive** toggle that generates this snippet for you.

## Zero-server mode (GitHub Action)

Don't want to depend on anyone's server — including ours? Let your own repo's
Actions regenerate the card on a schedule. No token setup at all: the workflow's
built-in `GITHUB_TOKEN` is used automatically.

Add `.github/workflows/pulse.yml` to your profile repo (the one named after you):

```yaml
name: pulse
on:
  schedule:
    - cron: "23 */6 * * *" # every 6 hours
  workflow_dispatch:
permissions:
  contents: write
jobs:
  pulse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pouyashahrdami/github-pulse@v1
        with:
          username: YOUR_USERNAME  # or repo: owner/repo · org: my-org · duet: you,friend
          theme: aura            # optional
          size: card             # optional
          params: "tz=3.5"       # optional: any URL param
      - name: Commit the card
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add pulse.svg
          git diff --cached --quiet || git commit -m "pulse: update"
          git push
```

Then embed it with a relative path:

```md
![GitHub Pulse](./pulse.svg)
```

**Honest trade-off:** this mode is a snapshot refreshed on your cron, so decay and
`● beating now` are only as fresh as the last run. The bot commits are authored by
`github-actions[bot]`, so they don't touch your own contribution graph. For
real-time decay, use the URL endpoint instead.

## Deploy your own (free)

1. Fork this repo.
2. [Import it into Vercel](https://vercel.com/new) — zero config, the defaults work.
3. *(Recommended)* Add a `GITHUB_TOKEN` env var — a classic token with **no scopes**
   ([create one](https://github.com/settings/tokens)). With it you get the full
   365-day contribution calendar via GraphQL at 5,000 req/h. Without it, the card
   falls back to recent public events at 60 req/h.
4. Your card lives at `https://<your-app>.vercel.app/u/<username>`.

## Local dev

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, or hit `http://localhost:3000/u/<username>` directly.

## How it stays alive

GitHub proxies README images through camo and strips scripts, so all animation is
pure CSS inside the SVG — the sweep, the thumping heart, the blinking dot.

Cards refresh once per `PULSE_CACHE_SECONDS` (default **24 hours**), which keeps a
single no-scope token comfortably serving a very large user base: one API call per
unique user per day. Deployments that want livelier decay can set the env var
lower (e.g. `21600` for 6h) — the trade is API calls for freshness.

Private contributions count only if you've enabled *Include private contributions*
on your GitHub profile — same rule as every other stats card.

## License

MIT
