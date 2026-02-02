# AC 10: Per-Color Highlight Removal

## Relevant Files

- `src/components/verse-action-popover.tsx` - Main popover component; needs callback signature change
- `src/components/verse-action-popover.test.tsx` - Unit tests for the popover
- `src/components/verse.stories.tsx` - Contains VerseActionPopoverDemo that wires up the callbacks

### Notes

- Unit tests are placed alongside source files
- Run tests with `pnpm test` from packages/ui or `pnpm --filter @youversion/platform-react-ui test`

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`.

## Tasks

- [x] 1.0 Update popover callback signature to support per-color removal
  - [x] 1.1 Change `onClearHighlights: () => void` to `onClearHighlight: (color: string) => void` in props type
  - [x] 1.2 Update prop destructuring in component function signature
  - [x] 1.3 Update exports if the type is exported

- [x] 2.0 Update ColorCircle click handler to pass color to clear callback
  - [x] 2.1 Modify the onClick handler to call `onClearHighlight(color)` instead of `onClearHighlights()`
  - [x] 2.2 Verify the color variable is accessible in the click handler scope

- [x] 3.0 Update demo/story to handle per-color removal
  - [x] 3.1 Update `handleClearHighlights` in VerseActionPopoverDemo to accept `color: string` parameter
  - [x] 3.2 Filter removal logic to only delete verses matching the specific color
  - [x] 3.3 Keep popover open if other highlighted verses remain selected (AC 8a)
  - [x] 3.4 Dismiss popover only when no highlights remain in selection (AC 8)

- [x] 4.0 Add/update unit tests for per-color removal behavior
  - [x] 4.1 Update existing tests to use new `onClearHighlight` signature
  - [x] 4.2 Add test: clicking yellow X calls `onClearHighlight('e6d163')`
  - [x] 4.3 Add test: clicking different color X buttons calls callback with correct color
  - [x] 4.4 Verify all 26+ existing tests still pass

- [x] 5.0 Verify build and all tests pass
  - [x] 5.1 Run `pnpm test` and confirm all tests pass
  - [x] 5.2 Run `pnpm build` and confirm no type/build errors
  - [x] 5.3 Manually verify in Storybook that per-color removal works
