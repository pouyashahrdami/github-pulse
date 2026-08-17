# github-pulse 🫀

**A living EKG card for your GitHub README.** One username in, a beating heart out —
it beats faster when you ship, dims when you rest, flatlines when you vanish, and
revives when you come back.

<p align="center">
  <img src="./assets/sample-aura.svg" width="520" height="190" alt="GitHub Pulse card, aura theme">
</p>

Unlike every static stats card, your pulse card is generated *at the moment someone
views it*. Time actually passes on it.

```md
[![GitHub Pulse](https://YOUR-DEPLOYMENT.vercel.app/u/YOUR_USERNAME)](https://YOUR-DEPLOYMENT.vercel.app)
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

## Shapes

Add `?size=<name>` to fit your README layout:

| size | dimensions | good for |
|---|---|---|
| `card` *(default)* | 520×190 | next to other stat cards |
| `wide` | 830×150 | full-width banner across the README |
| `compact` | 340×130 | sidebars, small profiles |

<img src="./assets/sample-phosphor-wide.svg" width="830" height="150" alt="wide banner, phosphor theme">
<br>
<img src="./assets/sample-github-compact.svg" width="340" height="130" alt="compact card, github theme">

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

<img src="./assets/sample-ember.svg" width="520" height="190" alt="ember theme">
<br>
<img src="./assets/sample-paper.svg" width="520" height="190" alt="paper theme">

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

And shape/behavior params:

| param | values | default |
|---|---|---|
| `size` | `card` `wide` `compact` | `card` |
| `radius` | corner rounding `0`–`24` | `12` |
| `grid` | `0` hides the ECG grid | `1` |
| `glow` | `0` disables the glow filter | `1` |
| `days` | beat window `7`–`30` | `14` |

Params compose with a theme: start from `?theme=phosphor` and override just `bg`.

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
pure CSS inside the SVG — the sweep, the thumping heart, the blinking dot. The
endpoint sends short cache headers (`s-maxage=900`) because decay is the product:
camo re-fetches every ~30–60 minutes, and the card it gets reflects how long you've
been quiet.

Private contributions count only if you've enabled *Include private contributions*
on your GitHub profile — same rule as every other stats card.

## License

MIT
