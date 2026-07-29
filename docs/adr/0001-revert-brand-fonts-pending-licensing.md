# 1. Revert brand fonts to Inter / Source Serif 4 pending licensing

Date: 2026-06-24

## Status

Accepted. **Superseded in part** by
[ADR-0003](0003-adopt-untitled-serif-via-fonts-api.md) (2026-07-28), for **Untitled
Serif only**: licensing cleared for that face and it now loads from the
`/v1/fonts/1/stylesheet` endpoint, so both re-introduction conditions below are met for
it. The **Aktiv Grotesk revert stands** — no licence path has been resolved and the sans
stack remains `'Inter', sans-serif`.

## Context

The SDK had begun shipping YouVersion brand fonts to consumer apps:

- **Aktiv Grotesk App** as the sans default (`--yv-font-sans`), loaded via a hardcoded
  `@font-face` pointing at a CDN woff2.
- **Untitled Serif** as the serif default (`--yv-font-serif`) and the Bible Version
  picker abbreviation tile, same hardcoded `@font-face` pattern.

Neither font had licensing cleared for that delivery pattern at the time. The SDK's
purpose is to render inside **third-party developer apps**, so a hardcoded `@font-face`
puts the font file in front of third parties with nothing in the SDK able to gate it —
access control is enforced server-side (API gateway + CDN), not in the SDK.

A browser-consumable stylesheet endpoint exists
(`GET /v1/fonts/{font_id}/stylesheet`, accepts an app key; the gateway injects the
app-id header). It is the correct consumption pattern for a font the SDK is cleared to
serve.

Licensing specifics for each font are tracked internally, not in this repo.

## Decision

Revert **both** brand fonts to the prior fallbacks for the shipping PR:

- `--yv-font-sans` → `'Inter', sans-serif`
- `--yv-font-serif` → `'Source Serif 4', serif`

Remove both brand `@font-face` blocks, the `--font-aktiv` / `--font-untitled-serif`
aliases, the `yv:font-aktiv` / `yv:font-untitled-serif` usages, and the brand options in
the Bible Reader font picker. The abbreviation-tile redesign and all other Figma
layout/typography work, the `useOrganizations` hooks, and publisher names are retained —
only the font **family** is reverted.

The brand-font implementation is parked on branch `feat/youversion-brand-fonts`
(snapshot at the pre-revert HEAD) for re-application once licensing clears.

## Consequences

- The SDK ships no brand font files to third parties.
- The abbreviation tile and serif body text render in **Source Serif 4** (the serif
  fallback) rather than Untitled Serif — the closest available substitute for the Figma
  serif intent; exact brand match is deferred.
- Re-introducing a brand font requires: (1) licensing cleared for that face, and
  (2) loading via the `/v1/fonts/{font_id}/stylesheet` endpoint rather than hardcoded
  `@font-face`. Untitled Serif is `font_id` 1 / slug `untitled-serif`.
- Re-application path: cherry-pick the font hunks from `feat/youversion-brand-fonts`
  onto then-current `main`.
