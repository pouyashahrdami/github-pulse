# Contributing

Thanks for wanting to make the heartbeat better.

## Dev setup

```bash
pnpm install
pnpm dev        # localhost:3000 — cards at /u/<you>, builder on /
```

A no-scope `GITHUB_TOKEN` in `.env.local` enables the GraphQL path; without it
everything still works via the public REST fallback (marked `partial`).

## Before you open a PR

```bash
pnpm typecheck && pnpm test && pnpm build
```

All three must pass — CI runs exactly this. New mechanics (param parsing, pulse
math, render output guarantees) get a test in `tests/`; visual tweaks don't
need one.

## Ground rules

- Cards are **pure SVG with SMIL/CSS animation only** — GitHub strips
  JavaScript and proxies through camo. If your feature needs JS in the card,
  it can't ship.
- Every param must fail safe: junk input falls back to defaults, never to a
  broken card. Escape anything user-controlled that lands in the SVG.
- Match the existing style (see neighboring code); no new dependencies without
  a strong case — the runtime deps are currently just Next/React.
- One feature per PR, conventional commit subjects (`feat:`, `fix:`, `docs:`).

## Ideas

Check [docs/IDEAS.md](docs/IDEAS.md) — ticked items are shipped, unticked ones
are up for grabs, struck-through ones were declined with reasons.
