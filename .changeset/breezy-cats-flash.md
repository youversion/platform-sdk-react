---
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
'@youversion/platform-core': minor
---

Added version picker functionality to BibleWidgetView component with enhanced UI theming and user experience improvements.

New Features

- BibleWidgetView Version Picker: Added showVersionPicker prop enabling dynamic Bible version switching within the widget
- Enhanced Version Display: Improved version abbreviation presentation (e.g., "KJV1984" displays as "KJV" over "1984" in stacked format)
- Auto-Scroll Navigation: Bible chapter picker now automatically scrolls to and expands the current book when opened
- Added the ability to customize the text on the YouVersionAuthButton

UI/UX Improvements

- Consistent Button Styling: Updated all picker buttons to use secondary variant with bold typography
- Better Theme Support: Added comprehensive dark/light mode theming with data-yv-theme attributes
- Improved Accessibility: Enhanced search functionality with proper ARIA labels
- Cleaner DOM Structure: Simplified component hierarchy by removing unnecessary wrapper elements
