# 4. Adopt Untitled Serif via the Fonts API stylesheet endpoint

Date: 2026-07-28

## Status

Accepted. Supersedes [ADR-0001](0001-revert-brand-fonts-pending-licensing.md) **in
part** — for Untitled Serif only.

## Context

ADR-0001 reverted the SDK's brand fonts and set one condition for bringing one back:
load it through the `/v1/fonts/{font_id}/stylesheet` endpoint rather than a hardcoded
`@font-face`, so the SDK never ships or hosts the file itself.

Untitled Serif meets that condition. `GET /v1/fonts/1/stylesheet` accepts the app key as
either an `X-YVP-App-Key` header or an `?app_key=` query parameter, and returns `401`
without one.

The sans stack is unchanged and stays `'Inter', sans-serif` — this is a serif-only
change.

YPE-1350 (BibleReader renders Untitled Serif) and YPE-1910 (`--yv-font-serif` becomes
`Untitled Serif → Source Serif 4 → serif`, covering `BibleText` and the Bible card, not
just the reader) both depend on this.

## Decision

Adopt Untitled Serif as the SDK's serif face, loaded by the SDK itself from the
stylesheet endpoint.

**1. Font stack (YPE-1910).** Both serif declarations become
`'Untitled Serif', 'Source Serif 4', serif`:

- `packages/core/src/styles/theme.css` — `--yv-font-serif`
- `packages/ui/src/styles/global.css` — `--font-serif`, inside `@theme inline`

These are literal duplicates in two packages, not aliases: core cannot import Tailwind,
and `@theme inline` values are inlined into utilities rather than emitted as runtime
custom properties. `packages/ui/src/styles/font-tokens.test.ts` reads both files off
disk and fails if they drift apart. Source Serif 4 stays loaded from Google Fonts as the
fallback, so nothing regresses when Untitled Serif is unavailable — and because the
stack names Untitled Serif *first*, a host that loads its own copy wins regardless of
who fetched it. That is YPE-1910's explicit requirement.

The change is SDK-wide, not reader-only: the version-picker abbreviation tile,
footnotes, `Verse.Text` at `lg`, chapter headings, the Bible card, and the `lg` Verse of
the Day card all follow the token.

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

`font_id` is hardcoded to `1` (slug `untitled-serif`) rather than discovered via
`GET /v1/fonts`. Discovery would add a request waterfall in front of first paint to
guard against an id change that would itself be a breaking change on YouVersion's own
service. The constant is named and comment-linked to this ADR so it is greppable if the
API ever renumbers. `packages/core/src/schemas/font.ts` stays unwired; no `FontsClient`
and no `useFonts` hook are built.

`apiHost` threads through the same way `ApiClient` does (`config.apiHost ??
'api.youversion.com'`) so staging environments keep working.

**3. Reader picker (YPE-1350).** `UNTITLED_SERIF_FONT` becomes the reader's default font
family and the right-hand picker button, labelled **"Untitled Serif"** per the ticket's
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
  ADR-0001's closest available substitute.
- **A new outbound request per consumer app**, to
  `https://api.youversion.com/v1/fonts/1/stylesheet`, and the woff2 fetches that follow
  it from `cdn.youversion.com`. Both are `cache-control: public` (86400s and 3600s
  respectively) and CORS-open. Consumers with a strict CSP must allowlist
  `api.youversion.com` in `style-src` and `cdn.youversion.com` in `font-src`; without
  them the SDK falls back to Source Serif 4 with no layout break.
- **The app key appears in a URL query string.** It is already public browser-side (it
  ships in request headers on every API call), and the gateway accepts it on this route,
  but it will now also land in CDN/proxy access logs and `Referer` headers. Accepted
  knowingly.
- **`<link rel="stylesheet" precedence>` can suspend the commit of the component that
  renders it while the sheet loads.** Verified that a plain synchronous mount commits its
  children immediately (`yv-fonts.test.tsx`). A mount that happens inside a transition —
  a Next.js App Router client navigation, for example — is not covered by that test and
  may hold the commit until the request settles. Failures settle too, so this is a
  latency risk rather than a hang. Revisit if a consumer reports a slow first navigation.
- The default reader font changes from Source Serif 4 to Untitled Serif for new users,
  and returning serif readers are migrated on hydrate. No public API is removed or
  retyped; the change ships as a `minor` across all three packages.
- The serif stack is declared twice and must stay in sync by hand.
  `font-tokens.test.ts` is the guard — it is the first test in the repo to assert a font
  token's literal value.
- The revert, if it is ever needed, is small and local: drop `<YvFonts />` from
  `YouVersionProvider` and remove `'Untitled Serif'` from the two stacks. Everything
  else — the picker label, the migration, the CSP docs — degrades to Source Serif 4 on
  its own.
