# Roadmap / brainstorm

Living list of customization + "do more" ideas. Ticked = shipped.

## Customization
- [x] `theme=random` — stable per-user pick that reshuffles every UTC day
- [ ] Custom state labels — `labels=radiant:ON FIRE,flatline:RIP` renames the pill text
- [ ] `font=` — pick the mono stack (jetbrains / ibm-plex / sf-mono / serif for paper)
- [ ] `scanlines=1` — CRT scanline + vignette overlay for phosphor/retro themes
- [ ] `blink=1` — tiny LED heartbeat dot in the header, synced to bpm
- [ ] `lang=` — localized footer/status strings (fa, de, ja, …)

## Do more
- [ ] Repo cards — `/r/<owner>/<repo>` pulse from commit activity, not user calendar
- [ ] Duet card — two usernames, two traces on one monitor, "sync %" stat
- [ ] `goal=<n>` — daily contribution target line on the wave + hit-rate stat
- [ ] Medical record memory — per-user KV history: flatlines survived, revivals,
      longest streak ever; rendered as a deadpan cardiology report (needs storage)
- [ ] Pacemaker detector — flag suspiciously regular cron-bot commit rhythms
- [ ] Share page — `/share/<user>` HTML page with og:image for link unfurls

## Plumbing
- [ ] Per-card ETag so camo revalidates cheaply
- [ ] `?v=` cache-buster documented for instant refreshes
