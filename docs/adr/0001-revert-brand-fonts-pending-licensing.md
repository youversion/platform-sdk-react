# 1. Revert brand fonts to Inter / Source Serif 4

Date: 2026-06-24

## Status

Accepted. **Superseded in part** by
[ADR-0003](0003-adopt-untitled-serif-via-fonts-api.md) (2026-07-28), for **Untitled
Serif only**: it now loads from the `/v1/fonts/1/stylesheet` endpoint, which is the
condition below. The sans stack is unchanged and stays `'Inter', sans-serif`.

## Context

The SDK had begun shipping brand fonts to consumer apps via hardcoded `@font-face`
blocks pointing at CDN woff2 files — for the sans default (`--yv-font-sans`), the serif
default (`--yv-font-serif`), and the Bible Version picker abbreviation tile. None of it
reached a published release.

A hardcoded `@font-face` is the wrong delivery pattern for this SDK. Its purpose is to
render inside **third-party developer apps**, so it puts the font file in front of third
parties with nothing in the SDK able to gate it — access control is enforced server-side
(API gateway + CDN), not in the SDK.

A browser-consumable stylesheet endpoint exists
(`GET /v1/fonts/{font_id}/stylesheet`, accepts an app key; the gateway injects the
app-id header). It is the correct consumption pattern for a font the SDK serves.

## Decision

Revert both font tokens to the prior fallbacks for the shipping PR:

- `--yv-font-sans` → `'Inter', sans-serif`
- `--yv-font-serif` → `'Source Serif 4', serif`

Remove the brand `@font-face` blocks, their `--font-*` aliases and `yv:font-*` usages,
and the brand options in the Bible Reader font picker. The abbreviation-tile redesign
and all other Figma layout/typography work, the `useOrganizations` hooks, and publisher
names are retained — only the font **family** is reverted.

## Consequences

- The SDK ships no font files to third parties.
- The abbreviation tile and serif body text render in **Source Serif 4** (the serif
  fallback) rather than the brand serif — the closest available substitute for the Figma
  serif intent; exact brand match is deferred.
- Introducing a brand font requires loading it via the
  `/v1/fonts/{font_id}/stylesheet` endpoint rather than a hardcoded `@font-face`.
  Untitled Serif is `font_id` 1 / slug `untitled-serif`.
