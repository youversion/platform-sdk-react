---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Update the Bible Version picker to match the latest Reader SDK Figma design, adding publisher names and refreshing the abbreviation tile.

- `@youversion/platform-core`: New `OrganizationsClient` with `getOrganization(organizationId)` for fetching an organization by its UUID (`GET /v1/organizations/{id}`), validated against the existing `OrganizationSchema`. Design tokens use Inter (`--yv-font-sans`) and Source Serif 4 (`--yv-font-serif`); the YouVersion brand fonts (Aktiv Grotesk App / Untitled Serif) are reverted pending licensing — see `docs/adr/0001-revert-brand-fonts-pending-licensing.md`.
- `@youversion/platform-react-hooks`: New `useOrganization(organizationId)` hook (plus `useOrganizationsClient`) following the standard `useApiData` pattern. Fetching is skipped when the id is empty. Also adds `useOrganizations(organizationIds)`, which resolves many organizations at once, deduplicated by id, so a list of versions sharing publishers only fetches each organization once.
- `@youversion/platform-react-ui`: `BibleVersionPicker` now renders the publisher name above the version title for versions that have an `organization_id` (rows without an associated organization render the title only), and recently used versions persist `organization_id` so they display the publisher too. Publisher names are resolved once at the list level via `useOrganizations` instead of per row, avoiding N+1 requests when many versions share a publisher. The `VersionAbbreviationIcon` tile now renders as a 64px square with a 6px radius, warm-neutral (`secondary`) fill, themed border, and serif typography (Source Serif 4) using the foreground text color; recent-version and all-version rows share the same tile styling, and long or trailing-digit abbreviations (e.g. `NASB1995` → `NASB` / `1995`) stay readable without overflowing. Brand fonts (Aktiv Grotesk App / Untitled Serif) are reverted to Inter / Source Serif 4 pending licensing; the brand-font implementation is parked on branch `feat/youversion-brand-fonts`.
