# Contributing to github-pulse

Thanks for wanting to make the heart beat better. Contributions of all kinds
are welcome — bug reports, themes, docs, and code.

## Quick start

```bash
git clone https://github.com/pouyashahrdami/github-pulse
cd github-pulse
pnpm install
cp .env.example .env.local   # add a classic GitHub token, no scopes needed
pnpm dev
```

Open `http://localhost:3000/u/YOUR_USERNAME` to see a live card. Append
`?state=flatline` (or `radiant|steady|fading|critical|revived`) to preview any
life state, and `?size=` / `?theme=` to test layouts and palettes.

## Before you open a PR

- **Type-check:** `pnpm typecheck` must pass.
- **Build:** `pnpm build` must succeed.
- **Regenerate samples** if your change affects rendering:
  `pnpm exec tsx scripts/generate.ts` (updates `assets/`).
- Keep the change small and focused — one fix or feature per PR.
- Use conventional commit subjects: `feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`.

## Project layout

| Path | What lives there |
|---|---|
| `app/` | Next.js routes — `u/[username]` serves the SVG |
| `lib/` | Waveform math, life-state logic, GitHub data fetching |
| `components/` | SVG card layouts (card, monitor, wide, compact, badge) |
| `docs/THEMES.md` | Theme reference |
| `scripts/generate.ts` | Regenerates the sample SVGs in `assets/` |

## Adding a theme

Themes are the easiest contribution. Read [docs/THEMES.md](docs/THEMES.md),
add your palette alongside the existing ones in `lib/`, and include a sample
render in your PR description. Keep contrast readable on both GitHub light and
dark backgrounds.

## Reporting bugs & suggesting features

Open an issue with the appropriate template. For rendering bugs, include the
full card URL (username + query params) — it's the whole repro.

## Security

Please do not report security vulnerabilities in public issues — see
[SECURITY.md](SECURITY.md).

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
