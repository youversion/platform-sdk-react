# PRD: Verse Action Popover

## Overview
A popover component that appears when users select Bible verses, providing highlight color options and actions (Copy, Share).

## Acceptance Criteria

### AC 1 - Basic popover display
Given I select a verse, the popover shows 5 color circles (yellow, green, blue, orange, pink).

### AC 2 - Apply highlight
Given popover is open, clicking a color circle applies that highlight to all selected verses. Popover dismisses.

### AC 3 - Copy
Clicking Copy puts verse text in clipboard as `"Verse text" - Book Chapter:Verse Version` (e.g., `"Romans 8:1 BSB"`). Popover dismisses.

### AC 4 - Share
Clicking Share opens native Web Share API. On successful share only, popover dismisses. On failure/cancel, popover remains open.

### AC 5 - Single highlighted verse selected
Popover shows that verse's color with X (remove action), plus only the 4 inactive apply colors (no duplicate). Total: 5 circles.

### AC 5a - Ordering
X circles (remove) appear leftmost. Apply circles follow in standard order (yellow, green, blue, orange, pink).

### AC 6 - Mixed selection (highlighted + unhighlighted)
Yellow highlighted verse + unhighlighted verse selected -> popover shows: Yellow X, then all 5 apply colors (Yellow, Green, Blue, Orange, Pink) (6 total). This allows applying any color to the unhighlighted verse.

### AC 7 - Multiple different highlights selected
Yellow verse + Green verse selected -> popover shows: Yellow X, Green X, then Yellow, Green, Blue, Orange, Pink (7 total). Clicking Yellow X removes only yellow from the yellow verse. Green verse unchanged. Both verses remain selected. Popover remains open.

### AC 8 - Dismiss on remove (single highlight)
When only one highlight color is active in selection, clicking its X removes it and dismisses popover.

### AC 8a - Popover stays open (multiple highlights)
When multiple highlight colors are active in selection, clicking an X removes only that color. Popover remains open (so user can remove other highlights if desired).

### AC 9 - All 5 colors highlighted
When all 5 verses with all 5 different colors are selected (or all 5 colors are already active), popover shows all 5 remove buttons (X) with no apply buttons (no new colors available). Total: 5 circles.

### AC 10 - Per-color highlight removal
Given multiple highlight colors are active in selection, clicking a specific color's X button removes ONLY that color from the verses that have it, leaving other highlighted verses unchanged. The `onClearHighlight` callback receives the specific color to remove as an argument.
