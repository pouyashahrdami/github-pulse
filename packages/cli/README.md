# github-pulse-cli 🫀

ASCII EKG in your terminal — [GitHub Pulse](https://github.com/pouyashahrdami/github-pulse)
vitals for any user or repo. Zero dependencies.

```bash
npx github-pulse-cli <user>
npx github-pulse-cli <owner>/<repo>
```

BPM, life state (`RADIANT → STEADY → FADING → CRITICAL → FLATLINE`), blood
type (top language), streak, and a beat-per-day waveform of the last 14 days.

## Options

| flag | effect |
|---|---|
| `--days <7-30>` | beat window (default 14) |
| `--json` | print the raw vitals JSON |
| `--no-color` | plain output (`NO_COLOR` env works too) |
| `--host <url>` | self-hosted pulse server (or `GITHUB_PULSE_HOST`) |

Wants Node ≥ 18.17. The living SVG card for your README lives at the
[main repo](https://github.com/pouyashahrdami/github-pulse).
