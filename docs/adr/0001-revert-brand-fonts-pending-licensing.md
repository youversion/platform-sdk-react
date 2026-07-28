# 1. Revert brand fonts to Inter / Source Serif 4 pending licensing

Date: 2026-06-24

## Status

Accepted. **Superseded in part** by
[ADR-0003](0003-adopt-untitled-serif-via-fonts-api.md) (2026-07-28), for **Untitled
Serif only**: the foundry granted permission directly and the font now loads from the
gated `/v1/fonts/1/stylesheet` endpoint, so both re-introduction conditions below are
met for that face. The **Aktiv Grotesk revert stands** — no licence path has been
resolved and the sans stack remains `'Inter', sans-serif`. The finding that the woff2
sits at a public, unauthenticated CDN URL is also unchanged; ADR-0003 records why that
is accepted rather than claiming it was fixed.

## Context

The SDK had begun shipping YouVersion brand fonts to consumer apps:

- **Aktiv Grotesk App** (Dalton Maag) as the sans default (`--yv-font-sans`),
  loaded via a hardcoded `@font-face` pointing at a public CDN woff2.
- **Untitled Serif** (Klim Type Foundry) as the serif default (`--yv-font-serif`)
  and the Bible Version picker abbreviation tile, same hardcoded `@font-face` pattern.

Both create the same exposure: the SDK's purpose is to render fonts inside
**third-party developer apps**, so the font files are delivered to, and
downloadable by, third parties.

- **Aktiv Grotesk (Dalton Maag):** the licence is breached the moment a
  third-party developer uses their app key and gains access to the actual font
  file (`.woff`/`.woff2`/`.otf`/`.ttf`). No licence tier we hold covers serving
  this font to arbitrary third parties. CORS / file-level protection is
  enforced server-side (YouVersion API gateway + CDN), not in the SDK — the SDK
  cannot make the file un-downloadable.
- **Untitled Serif (Klim):** an Enterprise licence may permit third-party use
  if developers qualify as a "partner" (the licence enumerates affiliates,
  agencies, partners, vendors, contractors, freelancers). Whether a Platform
  developer is a "partner" is an **open legal question**.

A "browser-consumable stylesheet" endpoint exists
(`GET /v1/fonts/{font_id}/stylesheet`, accepts `app_key`, gateway injects the
app-id header). It is the correct future consumption pattern, but it does **not**
by itself resolve licensing: the woff2 it references still sits at a public CDN
URL, so switching to it does not make the font file un-downloadable.

## Decision

Revert **both** brand fonts to the prior fallbacks for the shipping PR:

- `--yv-font-sans` → `'Inter', sans-serif`
- `--yv-font-serif` → `'Source Serif 4', serif`

Remove both brand `@font-face` blocks, the `--font-aktiv` / `--font-untitled-serif`
aliases, the `yv:font-aktiv` / `yv:font-untitled-serif` usages, and the brand
options in the Bible Reader font picker. The abbreviation-tile redesign and all
other Figma layout/typography work, the `useOrganizations` hooks, and publisher
names are retained — only the font **family** is reverted.

The brand-font implementation is parked on branch `feat/youversion-brand-fonts`
(snapshot at the pre-revert HEAD) for re-application once licensing clears.

## Consequences

- The SDK ships no licence-restricted font files to third parties. Defensible
  legal state.
- The abbreviation tile and serif body text render in **Source Serif 4** (the
  serif fallback) rather than Untitled Serif — closest legal match to the Figma
  serif intent; exact brand match is deferred.
- Re-introducing brand fonts requires: (1) legal sign-off on Untitled Serif's
  "partner" classification and/or a resolved Aktiv licence path, and (2) loading
  via the gated `/v1/fonts/{font_id}/stylesheet` endpoint rather than hardcoded
  `@font-face`. Untitled Serif is `font_id` 1 / slug `untitled-serif`.
- Re-application path: cherry-pick the font hunks from `feat/youversion-brand-fonts`
  onto then-current `main`.
