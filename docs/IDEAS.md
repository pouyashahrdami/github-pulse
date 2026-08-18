# Roadmap / brainstorm

Living list of customization + "do more" ideas. Ticked = shipped.

## Customization
- [x] `theme=random` — stable per-user pick that reshuffles every UTC day
- [x] Custom state labels — `labels=radiant:ON FIRE,flatline:RIP` renames the pill text
- [x] `font=` — serif/sans presets or any installed family (`font=Courier New`);
      viewer-side fallback to the mono stack, since camo blocks webfonts
- [x] `scanlines=1` — CRT scanline overlay for phosphor/retro themes
- [x] `blink=1` — LED heartbeat dot on every alive card, synced to real bpm
- [x] `lang=` — localized footer/status/streak strings: en, fa, de, es, ja

## Do more
- [x] Repo cards — `/r/<owner>/<repo>` pulse from default-branch commit history
      (GraphQL with token, REST fallback without; window 35d, page-capped at 100)
- [x] Duet card — `/vs/<a>/<b>`: two traces, rhythm-sync % (Jaccard of active days)
- [x] `goal=<n>` — daily contribution target line on the wave + hit-rate stat
- [x] Medical record memory — `?record=1`: flatlines survived, revivals, longest
      streak ever. Durable via Upstash/Vercel-KV REST env vars, memory fallback
- [x] Pacemaker detector — "⚙ paced" stat when the rhythm is machine-regular
      (≥90% of the window active, one dominant count ≤4). Opt out: `hide=pacemaker`
- [x] Share page — `/s/<user>` with a PNG og:image (next/og) so links unfurl
      on Twitter/Slack/Discord, which never render the SVG cards

## Do more (round 2)
- [x] JSON vitals API — `/api/u/<user>` + `/api/r/<owner>/<repo>`, CORS open
- [x] Milestone stamps — honors board on the wave: CENTURION (100d streak),
      5K/1K CLUB (beats/yr), IRON RHYTHM (30d), STARGAZER (1k★). `hide=milestone`
- [x] `flip=1` — mirror the wave right-to-left (RTL READMEs)
- [x] Seasonal auto-themes — `theme=season` picks by date (halloween → dracula,
      winter → nord, spring → catppuccin, summer → ember, fall → gruvbox)
- [ ] ~~SVG `<a>` deep links~~ — dropped: GitHub embeds cards via `<img>`/camo,
      where SVG anchors are inert; dead weight in the place cards live
- [x] `gradient=hex,hex[,hex]` — custom trace gradient on any theme
- [x] Org cards — `/o/<org>` aggregate pulse from org-wide public push events
- [ ] Webhook pings — POST somewhere when a watched user flatlines/revives

## Plumbing
- [x] Per-card ETag + If-None-Match 304s on all four SVG routes
- [ ] `?v=` cache-buster documented for instant refreshes
