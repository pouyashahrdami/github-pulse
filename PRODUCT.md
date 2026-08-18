# PRODUCT — github-pulse

**What it is:** a living EKG card for GitHub READMEs. One URL in, an animated
SVG heart out — it beats faster when you ship, dims when you rest, flatlines
when you vanish, revives when you return. Free, no login.

**Unique mechanism:** time actually passes on the card. Every other stats card
is a static snapshot; this one decays and dies in public.

**Audience:** developers decorating profile/repo/org READMEs; teams (ward
cards); tinkerers using the JSON API/CLI. They live in dark terminals and
GitHub's dark theme.

**Surfaces:** landing page + builder (`/`), share pages (`/s/<u>`), Wall of
Hearts (`/wall`, strictly opt-in via `wall=1`), SVG card routes, JSON API,
`github-pulse-cli`, GitHub Action.

**Brand commitments:**
- Medical/EKG conceit carried honestly (vitals, flatline, revive, ward,
  cardiology report) — morbid-playful, never mean.
- The cards render in a mono stack; product surfaces stay mono for continuity.
- Default theme `aura` (violet trace on near-black); 13 themes total.
- Consent-first: showcasing a person requires their opt-in.
- No login, no tracking of viewers; counters are anonymous aggregates.

**Constraints:** cards are camo-proxied SVGs (no webfonts, no JS); pages are
Next 15 App Router on Vercel; Upstash optional (features degrade honestly).
