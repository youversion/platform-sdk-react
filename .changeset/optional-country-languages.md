---
"@youversion/platform-core": patch
"@youversion/platform-react-hooks": patch
"@youversion/platform-react-ui": patch
---

fix: make country parameter optional for getLanguages

The country parameter is now optional when fetching languages, allowing developers to retrieve all available languages without filtering by country. This improves developer experience by providing a more flexible API while maintaining backward compatibility for existing code that provides a country filter.