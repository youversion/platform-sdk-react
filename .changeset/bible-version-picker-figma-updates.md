---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Update the Bible Version picker to match the latest Reader SDK Figma design, adding publisher names and refreshing the abbreviation tile.

- `@youversion/platform-core`: New `OrganizationsClient` with `getOrganization(organizationId)` for fetching an organization by its UUID (`GET /v1/organizations/{id}`), validated against the existing `OrganizationSchema`.
- `@youversion/platform-react-hooks`: New `useOrganization(organizationId)` hook (plus `useOrganizationsClient`) following the standard `useApiData` pattern. Fetching is skipped when the id is empty.
- `@youversion/platform-react-ui`: `BibleVersionPicker` now renders the publisher name above the version title for versions that have an `organization_id` (rows without an associated organization render the title only), and recently used versions persist `organization_id` so they display the publisher too. The `VersionAbbreviationIcon` tile now renders as a 64px square with a 6px radius, warm-neutral (`secondary`) fill, themed border, and serif typography using the foreground text color; recent-version and all-version rows share the same tile styling, and long or trailing-digit abbreviations (e.g. `NASB1995` → `NASB` / `1995`) stay readable without overflowing.
