# 3. Adopt Untitled Serif via the gated Fonts API stylesheet endpoint

Date: 2026-07-28

## Status

Accepted. Supersedes [ADR-0001](0001-revert-brand-fonts-pending-licensing.md) **in
part** — for Untitled Serif only. ADR-0001's Aktiv Grotesk revert stands unchanged.

## Context

ADR-0001 reverted both YouVersion brand fonts and named two conditions for
re-introducing them:

> Re-introducing brand fonts requires: (1) legal sign-off on Untitled Serif's
> "partner" classification and/or a resolved Aktiv licence path, and (2) loading via
> the gated `/v1/fonts/{font_id}/stylesheet` endpoint rather than hardcoded
> `@font-face`.

YPE-1350 (BibleReader renders Untitled Serif, served by the Fonts API) and YPE-1910
(`--yv-font-serif` becomes `Untitled Serif → Source Serif 4 → serif`, covering
BibleText and the Bible card, not just the reader) both depend on those conditions
being met.

### Condition (1) — licensing

Met, by direct permission from the foundry. Cam's account, recorded verbatim because
it is the whole of the evidence:

> This permission was genuinely given by the creators of this font. YouVersion pays a
> pretty penny to be able to have this, and they're totally fine with us using the
> font — as long as it's not just hosting the font file in the GitHub repo so that
> anyone can download it. It's that there is security measures put in place so that
> only authorized users can get the font.

So the "partner" classification ADR-0001 flagged as an open legal question is moot:
Klim granted the permission directly, under a paid licence, with one operative
constraint — **the font file must be access-controlled, not freely downloadable.**

**The sign-off is verbal.** There is no email, contract clause, or legal thread to
cite here, and this ADR does not imply one exists. It was relayed and confirmed by
**Cameron Pak on 2026-07-28**, and that is the citation. If written confirmation
surfaces later, amend this section with the reference.

### Condition (2) — delivery mechanism

Met by construction. No `.ttf` or `.woff2` ships in any package in this repo; the SDK
loads Untitled Serif from `GET /v1/fonts/1/stylesheet`, the exact endpoint ADR-0001
named as the correct consumption pattern.

### How the access control actually works

The control is **gated discovery plus revocable CDN URLs — not file-level
authentication.** This ADR states that plainly, because ADR-0001 already recorded the
unauthenticated-CDN fact and a contradiction between the two documents would be worse
than either one being incomplete.

| Layer | Behavior | Evidence (probed 2026-07-28) |
| --- | --- | --- |
| Repo | No font file ships | No `.ttf`/`.woff2` in any package; delivery is a URL |
| API — stylesheet | Gated | `GET /v1/fonts/1/stylesheet` with no key → `401` (`Failed to resolve API Key variable request.header.x-yvp-app-key`) |
| API — metadata | Gated | `GET /v1/fonts` and `/v1/fonts/1` require `X-YVP-App-Key` or `?app_key=` |
| CDN — the woff2 | Unauthenticated, but **revocable** | `GET https://cdn.youversion.com/fonts/untitled-serif/Untitled%20Serif.woff2` with no key → `200`, 54,480 bytes, `access-control-allow-origin: *`; identical response with a foreign `Referer`/`Origin`, and no `Vary: Referer` |

ADR-0001's finding about that last row is unchanged and still true: switching to the
stylesheet endpoint does not make the woff2 un-downloadable. What changed is the
reading of the licence constraint, and it is YouVersion's licence relationship to
interpret. Cam's rationale, which is what this ADR records:

- A third party cannot reach the woff2 without first passing through the gated API to
  learn its URL.
- If a URL is scraped and redistributed, YouVersion can rotate the CDN path at any
  time, which invalidates the leaked copy.

Revocability is the enforcement mechanism, not per-request auth on the file. That is a
defensible reading of "security measures so only authorized users can get the font" —
but it is a reading, not a technical guarantee, and this ADR is the place that says so.

**Known gap in the discovery half of the argument, outside this repo's control:** the
public docs page at [developers.youversion.com/api/fonts](https://developers.youversion.com/api/fonts)
publishes the 400-normal CDN URL verbatim in its example response, readable with no
auth. That undercuts "you cannot learn the URL without a key," and rotating the CDN
path would also require updating that example. Routed to whoever owns the API docs; not
a blocker for this change and not fixable from this codebase.

### Aktiv Grotesk

Out of scope and unchanged. ADR-0001's Dalton Maag finding stands, no licence path has
been resolved, and the sans stack stays `'Inter', sans-serif`. This is a serif-only
change. The parked implementation on `feat/youversion-brand-fonts` remains parked.

## Decision

Adopt Untitled Serif as the SDK's serif face, loaded by the SDK itself from the gated
stylesheet endpoint.

**1. Font stack (YPE-1910).** Both serif declarations become
`'Untitled Serif', 'Source Serif 4', serif`:

- `packages/core/src/styles/theme.css` — `--yv-font-serif`
- `packages/ui/src/styles/global.css` — `--font-serif`, inside `@theme inline`

These are literal duplicates in two packages, not aliases: core cannot import Tailwind,
and `@theme inline` values are inlined into utilities rather than emitted as runtime
custom properties. `packages/ui/src/styles/font-tokens.test.ts` reads both files off
disk and fails if they drift apart. Source Serif 4 stays loaded from Google Fonts as
the fallback, so nothing regresses when Untitled Serif is unavailable — and because the
stack names Untitled Serif *first*, a host that loads its own copy wins regardless of
who fetched it. That is YPE-1910's explicit requirement.

The change is SDK-wide, not reader-only: the version-picker abbreviation tile,
footnotes, `Verse.Text` at `lg`, chapter headings, the Bible card, and the `lg` Verse of
the Day card all follow the token. Cam confirmed the permission is understood as
SDK-wide, not literally "Bible Reader only."

**2. Delivery (YPE-1350).** A new `<YvFonts />` (`packages/ui/src/lib/yv-fonts.tsx`),
sibling to `<YvStyles />`, rendered from `YouVersionProvider` in the normal branch only
(no app key, no font):

```tsx
<link
  rel="stylesheet"
  href={`https://${apiHost}/v1/fonts/1/stylesheet?app_key=${encodeURIComponent(appKey)}`}
  precedence="yv-sdk-fonts"
/>
```

React 19 hoists it to `<head>` and dedupes by `href`, so multiple providers still yield
one link and SSR streaming works. `@font-face` is not subject to `@layer`, so cascade
position is irrelevant; `precedence` is only there to opt into the hoist and dedupe.

This is the SDK's first runtime-value-dependent stylesheet, and it has to be. The build
pipeline freezes `global.css` into the `__YV_STYLES__` string literal at `pnpm
build:css`, with no access to a consumer's app key — a React-rendered `<link>` is the
only seam that has one.

`font_id` is hardcoded to `1` (slug `untitled-serif`, as ADR-0001 recorded) rather than
discovered via `GET /v1/fonts`. Discovery would add a request waterfall in front of
first paint to guard against an id change that would itself be a breaking change on
YouVersion's own service. The constant is named and comment-linked to this ADR so it is
greppable if the API ever renumbers. `packages/core/src/schemas/font.ts` stays unwired;
no `FontsClient` and no `useFonts` hook are built.

`apiHost` threads through the same way `ApiClient` does (`config.apiHost ??
'api.youversion.com'`) so staging environments keep working.

**3. Reader picker (YPE-1350).** `UNTITLED_SERIF_FONT` becomes the reader's default
font family and the right-hand picker button, labelled **"Untitled"** per the ticket's
explicit wording. `SOURCE_SERIF_FONT` stays exported as `@deprecated` solely so the
hydration path can recognize it: a reader who chose serif before this shipped has the
old stack in `localStorage`, and without mapping it forward they would hydrate to a
value matching neither picker button. The mapping is deliberately narrow rather than
full validation, because `FontFamily` is an open type on purpose and a host passing
`defaultFontFamily="Georgia"` must keep round-tripping.

**4. No opt-out.** There is no `disableBrandFonts` prop, consistent with `<YvStyles />`,
which has none. Strict-CSP consumers get documented CSP entries
(`packages/ui/README.md`) rather than an escape hatch. Adding a prop later is
non-breaking if the need turns out to be real.

## Consequences

- Every serif surface in the SDK renders the YouVersion brand serif for the first time.
  The abbreviation tile and reader body text are now an exact brand match rather than
  ADR-0001's "closest legal match."
- **A new outbound request per consumer app**, to `https://api.youversion.com/v1/fonts/1/stylesheet`,
  and the woff2 fetches that follow it from `cdn.youversion.com`. Both are
  `cache-control: public` (86400s and 3600s respectively) and CORS-open. Consumers with
  a strict CSP must allowlist `api.youversion.com` in `style-src` and
  `cdn.youversion.com` in `font-src`; without them the SDK falls back to Source Serif 4
  with no layout break, because `font-display: swap` paints the fallback immediately.
- **The app key appears in a URL query string.** It is already public browser-side (it
  ships in request headers on every API call), and the gateway is designed to accept it
  on this route, but it will now also land in CDN/proxy access logs and `Referer`
  headers. Accepted knowingly.
- The default reader font changes from Source Serif 4 to Untitled Serif for new users,
  and returning serif readers are migrated on hydrate. No public API is removed or
  retyped; the change ships as a `minor` across all three packages.
- The serif stack is declared twice and must stay in sync by hand.
  `font-tokens.test.ts` is the guard — it is the first test in the repo to assert a font
  token's literal value.
- **The woff2 remains publicly downloadable.** This change does not fix that and does
  not claim to. If the licence position ever changes, the revert is small and local:
  drop `<YvFonts />` from `YouVersionProvider` and remove `'Untitled Serif'` from the
  two stacks. Everything else — the picker label, the migration, the CSP docs — degrades
  to Source Serif 4 on its own.
