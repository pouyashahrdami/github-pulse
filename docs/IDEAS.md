# Roadmap / brainstorm

Living list of customization + "do more" ideas. Ticked = shipped.

## Customization
- [x] `theme=random` — stable per-user pick that reshuffles every UTC day
- [x] Custom state labels — `labels=radiant:ON FIRE,flatline:RIP` renames the pill text
- [x] `font=` — serif/sans presets or any installed family (`font=Courier New`);
      viewer-side fallback to the mono stack, since camo blocks webfonts
- [x] `scanlines=1` — CRT scanline overlay for phosphor/retro themes
- [ ] `blink=1` — tiny LED heartbeat dot in the header, synced to bpm
- [ ] `lang=` — localized footer/status strings (fa, de, ja, …)

## Do more
- [x] Repo cards — `/r/<owner>/<repo>` pulse from default-branch commit history
      (GraphQL with token, REST fallback without; window 35d, page-capped at 100)
- [ ] Duet card — two usernames, two traces on one monitor, "sync %" stat
- [x] `goal=<n>` — daily contribution target line on the wave + hit-rate stat
- [ ] Medical record memory — per-user KV history: flatlines survived, revivals,
      longest streak ever; rendered as a deadpan cardiology report (needs storage)
- [x] Pacemaker detector — "⚙ paced" stat when the rhythm is machine-regular
      (≥90% of the window active, one dominant count ≤4). Opt out: `hide=pacemaker`
- [ ] Share page — `/share/<user>` HTML page with og:image for link unfurls

## Plumbing
- [ ] Per-card ETag so camo revalidates cheaply
- [ ] `?v=` cache-buster documented for instant refreshes
