---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Add support for array query parameters in API client and improve language range handling

- **API Client**: Enhanced query string serialization to support array parameters, properly formatting them as repeated keys (e.g., `?param=one&param=two`)
- **Bible Client**: Updated `getVersions()` method to accept either a single language range string or an array of language ranges, providing more flexibility for filtering Bible versions
- **Schema**: Renamed language range schema to use plural naming convention for consistency
- **Testing**: Added comprehensive test coverage for query string building with both scalar and array parameters

This change maintains backward compatibility while providing more flexible API parameter handling.