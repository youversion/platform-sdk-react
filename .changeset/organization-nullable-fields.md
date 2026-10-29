---
'@youversion/platform-core': patch
---

Fix `OrganizationsClient.getOrganization` rejecting live API responses. The API sends `address: null` for organizations without an address and `description: null` for some, but `OrganizationSchema` only allowed those fields to be omitted, so every lookup threw a validation error. Both fields now accept `null`, and `BibleVersionPicker` shows publisher names again.
