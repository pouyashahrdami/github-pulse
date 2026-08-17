# Security Policy

## Supported versions

github-pulse is deployed continuously from `main`. Only the latest deployment
and the latest version of the GitHub Action are supported.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report vulnerabilities privately via
[GitHub Security Advisories](https://github.com/pouyashahrdami/github-pulse/security/advisories/new),
or by email to **pooyashahrdami@gmail.com**.

Include what you found, how to reproduce it, and the impact you believe it
has. You can expect an acknowledgement within a few days, and a fix or a
status update within two weeks.

## Scope notes

Things especially worth reporting:

- SVG output injection — anything that lets crafted GitHub profile data
  (usernames, language names) break out of the rendered SVG markup
- Server-side request forgery or token leakage through the card endpoints
- Cache poisoning of rendered cards

The `GITHUB_TOKEN` used by deployments needs **no scopes**; deployments should
never be configured with a privileged token.
