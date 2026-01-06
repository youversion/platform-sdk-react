---
'@youversion/platform-core': minor
'@youversion/platform-react-ui': minor
'@youversion/platform-react-hooks': minor
---

feat(core): add pagination to the getVersions endpoint

- update tests to ensure that proper amount of responses are returned
  based on the page_size query param.
- add the ability to specify a page_size to fetch a specific number of
  items at a time.
