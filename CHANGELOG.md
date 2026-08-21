# Changelog

## v1.2.0 — the 24-hour tape (2026-08-20)

- **Holter monitor** — `/holter/<user>`: your circadian rhythm as a 24-hour
  histogram of recent public activity, with a diagnosis stamp (`NOCTURNAL`,
  `EARLY BIRD`, `DAYWALKER`, `AFTER HOURS`, `ARRHYTHMIC`), peak hour, night
  load, and a `SUSPECTED SLEEP` window inferred from your quietest hours
  (`not observed` when there isn't one). Pass `tz=<utc-offset>` so the
  diagnosis lands on your local hours. Builder mode + `holter:` Action input
  included. `/s/<user>/holter` is the shareable verdict — it unfurls on
  Twitter/Discord/Slack with the histogram and diagnosis stamped on it, and
  the landing hero deep-links into the builder via `/#holter`.
- **CLI on the landing page** — the terminal strip shows
  `npx github-pulse-cli`, which is now actually on npm.
- Redis client also accepts the `KV_REST_API_*` env names the Vercel
  marketplace Upstash integration injects.

## v1.1.0 — the ward opens (2026-08-18)

Built in the 24 hours after launch. Existing embeds are untouched — every
change to current cards is invisible or strictly better.

### New card types
- **Ward cards** — `/ward/a,b,c`: 2–6 users on one monitor, triage-sorted by
  bpm, traces colored by life state, `N/M ALIVE` pill.
- **Cardiology report** — `/report/<user>`: the annual checkup. Year-long EKG
  strip, active days, longest streak, longest flatline (dated), busiest day,
  weekend load. `theme=paper` makes it a printout.

### New surfaces
- **Wall of Hearts** — `/wall`: live gallery of recently beating cards.
  **Strictly opt-in**: add `wall=1` to your own embed to join; rendering
  someone else's card never publishes them. Proper og-image for sharing.
- **Dead man's switch** — `POST /api/watch {login, url}` pings your Discord or
  Slack webhook when a watched user flatlines or revives (daily sweep).
  Opt out of being watchable at all: `POST /api/watch/block`.
- **Defibrillator** — critical/flatlined share pages grow a paddle-charging
  button that broadcasts a prefilled code blue. Preview your own death page:
  `/s/YOU?state=flatline`.
- **Terminal CLI** — `npx github-pulse-cli <user|owner/repo>`: the vitals as
  an ASCII EKG, zero dependencies.
- **Hearts counter** — `/api/stats`: anonymous aggregate of cards served.

### Reliability
- **Shared vitals cache** — one GitHub API call per subject per cache window,
  across all param variants (GraphQL calls were previously uncached).
- **Stale-on-error** — rate-limit spikes serve slightly-old vitals instead of
  an error card.

### Everything else
- Landing page redesigned as a hospital monitor; builder gained ward/report
  modes and a wall opt-in checkbox at the embed snippet.
- GitHub Action: new `ward:` and `report:` inputs.
- `?v=` cache-buster documented; README samples for ward + report.

Self-hosters: set `UPSTASH_REDIS_REST_URL`/`TOKEN` to activate the record,
counter, wall, and watches; `CRON_SECRET` locks the sweep;
`PULSE_WEBHOOK_ALLOW_ANY=1` allows webhook targets beyond Discord/Slack.

## v1.0.0 — the first heartbeat (2026-08-17)

Initial release: living EKG cards for users, repos, orgs, and duets. 13
themes, 5 sizes, 3 wave styles, ~27 params, life states with flatline and
revival, medical records, milestones, share pages, JSON API, shields badge,
GitHub Action for zero-server generation.
